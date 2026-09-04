import express from 'express';
import {
  deleteReview,
  getAllReviews,
  getReview,
  updateReview,
} from '../controllers/reviewController.js';
import { restrictTo, routeProtect } from '../controllers/authController.js';

const reviewRouter = express.Router({ mergeParams: true });

reviewRouter.route('/').get(getAllReviews);

reviewRouter
  .route('/:reviewId')
  .get(getReview)
  .delete(routeProtect, restrictTo('admin', 'user'), deleteReview)
  .patch(routeProtect, restrictTo('user'), updateReview);

export default reviewRouter;
