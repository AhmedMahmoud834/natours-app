import Review from '../models/reviewModel.js';
import AppError from '../util/appError.js';
import FactoryHandler from './factoryHandler.js';

// middleware
export const setReviewIds = (req, res, next) => {
  if (req.params.tourId) req.body.tour = req.params.tourId;
  if (!req.user._id) return next(new AppError('You must be logged in!', 402));
  req.body.user = req.user._id;
  next();
};

export const getAllReviews = FactoryHandler.getAll(Review);

export const getReview = FactoryHandler.getOne(Review, 'reviewId');

export const createReview = FactoryHandler.createOne(Review);

export const checkUserHavePermission = async (req, res, next) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review)
    return next(
      new AppError(`No review found with this id: ${req.params.reviewId}`),
    );
  if (req.user.role !== 'admin' && review.user !== req.user.id)
    return next(
      new AppError('You do not have permission to perform this action'),
    );
  next();
};

export const deleteReview = FactoryHandler.deleteOne(Review, 'reviewId');

export const updateReview = FactoryHandler.updateOne(Review, 'reviewId');
