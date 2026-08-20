import Stripe from 'stripe';
import Tour from '../models/tourModel.js';
import config from '../config/index.js';
import AppError from '../util/appError.js';
import Booking from '../models/bookingModel.js';
import FactoryHandler from './factoryHandler.js';
import User from '../models/userModel.js';

const stripe = new Stripe(config.stripe.secretKey);

export const getCheckoutSession = async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId);
  if (!tour) return next(new AppError('Tour not found!', 404));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?user=${req.user.id}&tour=${tour.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tours/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: tour.price * 100,
          product_data: {
            description: tour.summary,
            name: `${tour.name} Tour`,
            images: [`https://natours.dev/img/tours/${tour.imageCover}`],
          },
        },
        quantity: 1,
      },
    ],
  });

  res.status(200).json({
    status: 'Success',
    session,
  });
};

// export const createBookingCheckout = async (req, res, next) => {
//   const { user, tour, price } = req.query;

//   if (!user || !tour || !price) return next();

//   await Booking.create({ user, tour, price });

//   res.redirect(req.originalUrl.split('?')[0]);
// };

const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.line_items[0].price_data.unit_amount / 100;
  await Booking.create({ user, tour, price });
};

export const webhookCheckout = async (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.stripe.webhookSecret,
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.complete') {
    createBookingCheckout(event.data.object);
  }
};

export const getAllBookings = FactoryHandler.getAll(Booking);

export const getOneBooking = FactoryHandler.getOne(Booking, 'bookingId');

export const updateBooking = FactoryHandler.updateOne(Booking, 'bookingId');

export const createBooking = FactoryHandler.createOne(Booking, [
  'user',
  'tour',
  'price',
  'paid',
]);

export const deleteBooking = FactoryHandler.deleteOne(Booking, 'bookingId');
