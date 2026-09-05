import Stripe from 'stripe';
import Tour from '../models/tourModel.js';
import config from '../config/index.js';
import AppError from '../util/appError.js';
import Booking from '../models/bookingModel.js';
import FactoryHandler from './factoryHandler.js';
import Email from '../util/email.js';
import logger from '../util/logger.js';
import User from '../models/userModel.js';

const stripe = new Stripe(config.stripe.secretKey);

export const getCheckoutSession = async (req, res, next) => {
  if (req.user.role !== 'user')
    return next(
      new AppError('You do not have permission to do this action.', 403),
    );
  const tour = await Tour.findById(req.params.tourId);
  if (!tour) return next(new AppError('Tour not found!', 404));

  const participants = Math.max(1, parseInt(req.query.participants, 10) || 1);
  if (tour.maxGroupSize && participants > tour.maxGroupSize) {
    return next(
      new AppError(
        `Participants cannot exceed maximum group size of ${tour.maxGroupSize}.`,
        400,
      ),
    );
  }
  console.log(req.query.participants);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}?alert=booking`,
    cancel_url: `${req.protocol}://${req.get('host')}/tours/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: tour.id,
    metadata: {
      tourId: tour.id,
      participants: participants.toString(),
    },
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: tour.priceDiscount
            ? (tour.price - tour.priceDiscount) * 100
            : tour.price * 100,
          product_data: {
            description: tour.summary,
            name: `${tour.name} Tour`,
            images: [
              `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`,
            ],
          },
        },
        quantity: participants,
      },
    ],
  });

  res.status(200).json({
    status: 'Success',
    session,
  });
};

const createBookingCheckout = async (session, req) => {
  const stripePaymentIntentId = session.payment_intent;
  const tourId = session.client_reference_id;
  const participants = parseInt(session.metadata?.participants, 10) || 1;
  const user = await User.findOne({ email: session.customer_email });

  if (!user) {
    logger.error(
      `createBookingCheckout: No user found for email ${session.customer_email}`,
    );
    return;
  }

  console.log(session.metadata.participants);
  logger.info(
    `createBookingCheckout: session.metadata=${JSON.stringify(session.metadata)}, parsed participants=${participants}`,
  );

  const booking = await Booking.create({
    tour: tourId,
    user: user.id,
    price: session.amount_total / 100,
    participants,
    paid: true,
    status: 'confirmed',
    paymentOption: 'stripe',
    stripePaymentIntentId,
  });

  console.log(booking);

  try {
    const tour = await Tour.findById(tourId);
    if (!tour) {
      logger.error(`createBookingCheckout: No tour found for id ${tourId}`);
      return booking;
    }
    const url = `${req.protocol}://${req.get('host')}/my-tours`;
    await new Email(user, url).sendBookingConfirmation(tour, booking);
    logger.info(`Booking confirmation email sent to ${user.email}`);
  } catch (err) {
    logger.error(`Error sending booking confirmation email: ${err.message}`, {
      stack: err.stack,
    });
  }

  return booking;
};

export const webhookCheckout = async (req, res, next) => {
  console.log('webhook hit');
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.stripe.webhookSecret,
    );
    console.log('signature verification done');
  } catch (err) {
    console.log(err);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('session metadata', session.metadata);
    console.log('session customer_email', session.customer_email);
    await createBookingCheckout(session, req);
    console.log("creating booking done")
  }

  res.status(200).json({ received: true });
};

export const refundBooking = async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId).select(
    '+stripePaymentIntentId',
  );

  if (!booking)
    return next(new AppError('No booking found with that ID.', 404));

  if (booking.status !== 'confirmed') {
    return next(
      new AppError(
        `Cannot refund a booking with status "${booking.status}". Only confirmed bookings are eligible.`,
        400,
      ),
    );
  }

  if (booking.paymentOption === 'stripe') {
    if (!booking.stripePaymentIntentId) {
      return next(
        new AppError(
          'Stripe payment intent ID is missing on this booking. Cannot process refund.',
          400,
        ),
      );
    }

    await stripe.refunds.create({
      payment_intent: booking.stripePaymentIntentId,
    });
  }

  booking.status = 'refunded';
  booking.paid = false;
  await booking.save({ validateBeforeSave: false });

  // Send email notification (isolated side effect)
  try {
    const url = `${req.protocol}://${req.get('host')}/my-tours`;
    await new Email(booking.user, url).sendBookingRefund(booking.tour, booking);
  } catch (err) {
    logger.error(`Failed to send booking refund email: ${err.message}`);
  }

  res.status(200).json({
    status: 'Success',
    message: 'Booking has been successfully refunded.',
    data: { booking },
  });
};

export const confirmBooking = async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking)
    return next(new AppError('No booking found with that ID.', 404));

  // Only pending bookings can be confirmed
  if (booking.status !== 'pending') {
    return next(
      new AppError(
        `Cannot confirm a booking with status "${booking.status}". Only pending bookings can be confirmed.`,
        400,
      ),
    );
  }

  booking.status = 'confirmed';
  booking.paid = true;
  await booking.save({ validateBeforeSave: false });

  // Send email notification (isolated side effect)
  try {
    const url = `${req.protocol}://${req.get('host')}/my-tours`;
    await new Email(booking.user, url).sendBookingConfirmation(
      booking.tour,
      booking,
    );
  } catch (err) {
    logger.error(`Failed to send booking confirmation email: ${err.message}`);
  }

  res.status(200).json({
    status: 'Success',
    message: 'Booking has been confirmed.',
    data: { booking },
  });
};

export const cancelBooking = async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking)
    return next(new AppError('No booking found with that ID.', 404));

  // Can only cancel pending or confirmed bookings
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return next(
      new AppError(
        `Cannot cancel a booking with status "${booking.status}". Only pending or confirmed bookings can be cancelled.`,
        400,
      ),
    );
  }

  // Warn admin if they cancel a Stripe-paid booking without refunding
  if (booking.paymentOption === 'stripe' && booking.paid === true) {
    return next(
      new AppError(
        "This booking was paid via Stripe. Use the /refund endpoint instead to cancel and return the customer's money.",
        400,
      ),
    );
  }

  booking.status = 'cancelled';
  await booking.save({ validateBeforeSave: false });

  // Send email notification (isolated side effect)
  try {
    const url = `${req.protocol}://${req.get('host')}/`;
    await new Email(booking.user, url).sendBookingCancellation(
      booking.tour,
      booking,
    );
  } catch (err) {
    logger.error(`Failed to send booking cancellation email: ${err.message}`);
  }

  res.status(200).json({
    status: 'Success',
    message: 'Booking has been cancelled.',
    data: { booking },
  });
};

export const getAllBookings = FactoryHandler.getAll(Booking);

export const getOneBooking = FactoryHandler.getOne(Booking, 'bookingId');

export const createBooking = async (req, res, next) => {
  const {
    tour: tourId,
    user,
    price,
    status,
    participants: rawParticipants,
  } = req.body;

  // 1. Validate status (only pending or confirmed allowed at creation)
  if (status && !['pending', 'confirmed'].includes(status)) {
    return next(
      new AppError(
        `Invalid status "${status}". A new booking can only be created with "pending" or "confirmed" status.`,
        400,
      ),
    );
  }

  // 2. Verify tour exists
  const tour = await Tour.findById(tourId);
  if (!tour) return next(new AppError('No tour found with that ID.', 404));

  // 3. Resolve participants count and validate against maxGroupSize
  const participants = Math.max(1, parseInt(rawParticipants, 10) || 1);
  if (tour.maxGroupSize && participants > tour.maxGroupSize) {
    return next(
      new AppError(
        `Participants cannot exceed maximum group size of ${tour.maxGroupSize}.`,
        400,
      ),
    );
  }

  // 4. Resolve price: use admin custom price if provided, otherwise default to tour calculated price * participants
  let finalPrice;
  if (price !== undefined && price !== null && price !== '') {
    finalPrice = Number(price);
  } else {
    const unitPrice = tour.priceDiscount
      ? tour.price - tour.priceDiscount
      : tour.price;
    finalPrice = unitPrice * participants;
  }

  // 5. Resolve status and paid flag
  const bookingStatus = status || 'pending';
  const isPaid =
    req.body.paid !== undefined ? req.body.paid : bookingStatus === 'confirmed';

  // 6. Create the booking (always cash for manual admin creation)
  const booking = await Booking.create({
    tour: tourId,
    user,
    price: finalPrice,
    participants,
    status: bookingStatus,
    paid: isPaid,
    paymentOption: 'cash',
  });

  res.status(201).json({
    status: 'Success',
    data: {
      booking,
    },
  });
};
