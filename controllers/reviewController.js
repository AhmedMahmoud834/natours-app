import Review from '../models/reviewModel.js';
import Tour from '../models/tourModel.js';
import allowedFields from '../util/allowedFields.js';
import AppError from '../util/appError.js';
import filterObj from '../util/filterObj.js';
import FactoryHandler from './factoryHandler.js';

export const getAllReviews = FactoryHandler.getAll(Review);

export const getReview = FactoryHandler.getOne(Review, 'reviewId');

// export const createReview = ;
export const createReview = async (req, res, next) => {
  if (req.user.role !== 'user')
    return next(new AppError('Only users can make review', 400));

  const tour = await Tour.findById(req.params.tourId);
  if (!tour) return next(new AppError('No tour found with this Id.', 404));

  const reviewData = filterObj(req.body, ...allowedFields.reviewData);
  const review = await Review.create({
    ...reviewData,
    tour: tour.id,
    user: req.user.id,
  });

  res.status(201).json({
    status: 'Success',
    data: {
      document: review,
    },
  });
};

// export const checkUserHavePermission = async (req, res, next) => {
//   const review = await Review.findById(req.params.reviewId);
//   if (!review)
//     return next(
//       new AppError(`No review found with this id: ${req.params.reviewId}`),
//     );
//   if (req.user.role !== 'admin' && review.user !== req.user.id)
//     return next(
//       new AppError('You do not have permission to perform this action'),
//     );
//   next();
// };

// export const deleteReview = FactoryHandler.deleteOne(Review, 'reviewId');
export const deleteReview = async (req, res, next) => {
  const review = await Review.findById(req.params.reviewId);

  if (!review) return next(new AppError('No review found with this id.', 404));

  const reviewUserId = review.user?._id
    ? review.user._id.toString()
    : review.user?.toString();

  if (req.user.id !== reviewUserId && req.user.role !== 'admin')
    return next(
      new AppError('You do not have permission to do this action', 403),
    );

  await Review.findByIdAndDelete(req.params.reviewId);

  res.status(204).json({
    status: 'Success',
    data: null,
  });
};

export const updateReview = async (req, res, next) => {
  const review = await Review.findById(req.params.reviewId);
  const updateData = filterObj(req.body, ...allowedFields.reviewData);

  if (!review) return next(new AppError('No review found with this id.', 404));

  const reviewUserId = review.user?._id
    ? review.user._id.toString()
    : review.user?.toString();

  if (req.user.id !== reviewUserId)
    return next(
      new AppError('You do not have permission to do this action', 403),
    );

  const updatedReview = await Review.findByIdAndUpdate(
    req.params.reviewId,
    updateData,
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).json({
    status: 'Success',
    data: {
      document: updatedReview,
    },
  });
};
