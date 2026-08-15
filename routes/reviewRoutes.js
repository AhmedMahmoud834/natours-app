import express from 'express';
import {
  checkUserHavePermission,
  createReview,
  deleteReview,
  getAllReviews,
  getReview,
  setReviewIds,
  updateReview,
} from '../controllers/reviewController.js';
import { restrictTo, routeProtect } from '../controllers/authController.js';

const reviewRouter = express.Router({ mergeParams: true });

reviewRouter
  .route('/')
  .get(getAllReviews)
  .post(routeProtect, restrictTo('user'), setReviewIds, createReview);

reviewRouter
  .route('/:reviewId')
  .get(getReview)
  .delete(
    routeProtect,
    restrictTo('admin', 'user'),
    checkUserHavePermission,
    deleteReview,
  )
  .patch(
    routeProtect,
    restrictTo('admin', 'user'),
    checkUserHavePermission,
    updateReview,
  );

export default reviewRouter;
