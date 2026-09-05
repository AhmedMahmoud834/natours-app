import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to a tour!'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a user!'],
  },
  price: {
    type: Number,
    required: [true, 'Booking must have a price!'],
  },
  participants: {
    type: Number,
    required: [true, 'A booking must specify number of participants!'],
    default: 1,
    min: [1, 'A booking must have at least 1 participant!'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  paid: {
    type: Boolean,
    default: false,
  },
  stripePaymentIntentId: {
    type: String,
    select: false,
  },
  paymentOption: {
    type: String,
    enum: ['stripe', 'cash'],
    default: 'cash',
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'refunded'],
    default: 'pending',
  },
});

bookingSchema.pre(/^find/, function () {
  this.populate('user').populate({
    path: 'tour',
    select: 'name imageCover slug summary',
  });
});

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
