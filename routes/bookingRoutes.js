import express from 'express';
import { restrictTo, routeProtect } from '../controllers/authController.js';
import {
  createBooking,
  deleteBooking,
  getAllBookings,
  getCheckoutSession,
  getOneBooking,
  updateBooking,
} from '../controllers/bookingController.js';

const bookingRouter = express.Router();

bookingRouter.get(
  '/checkout-session/:tourId',
  routeProtect,
  getCheckoutSession,
);

bookingRouter.use(routeProtect, restrictTo('admin', 'guide-lead'));

bookingRouter.route('/').get(getAllBookings).post(createBooking);

bookingRouter
  .route('/:bookingId')
  .get(getOneBooking)
  .patch(updateBooking)
  .delete(deleteBooking);

export default bookingRouter;
