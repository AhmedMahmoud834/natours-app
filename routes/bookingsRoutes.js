import express from 'express';
import { restrictTo, routeProtect } from '../controllers/authController.js';
import {
  cancelBooking,
  confirmBooking,
  createBooking,
  getAllBookings,
  getCheckoutSession,
  getOneBooking,
  refundBooking,
} from '../controllers/bookingController.js';

const bookingRouter = express.Router();

bookingRouter.get(
  '/checkout-session/:tourId',
  routeProtect,
  restrictTo('user'),
  getCheckoutSession,
);

bookingRouter.use(routeProtect, restrictTo('admin'));

bookingRouter.route('/').get(getAllBookings).post(createBooking);

bookingRouter.route('/:bookingId').get(getOneBooking);

bookingRouter.patch('/:bookingId/refund', restrictTo('admin'), refundBooking);
bookingRouter.patch('/:bookingId/confirm', restrictTo('admin'), confirmBooking);
bookingRouter.patch('/:bookingId/cancel', restrictTo('admin'), cancelBooking);

export default bookingRouter;
