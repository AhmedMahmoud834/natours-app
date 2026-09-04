import mongoose from 'mongoose';
import Tour from './tourModel.js';

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      min: [1, 'Ratings must be above 1.0!'],
      max: [5, 'Ratings must be below 5.0!'],
      required: [true, 'Review must have a rating!'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to tour!'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to user!'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function () {
  const userFields = this.getOptions().includeUserEmail
    ? 'name photo email'
    : 'name photo';

  this.populate({
    path: 'user',
    select: userFields,
  }).populate({
    path: 'tour',
    select: 'name',
  });
});

reviewSchema.statics.calculateAvgRating = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        ratingCount: { $sum: 1 },
        ratingAvg: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].ratingCount,
      ratingsAverage: stats[0].ratingAvg,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 1,
    });
  }
};

reviewSchema.post('save', function () {
  this.constructor.calculateAvgRating(this.tour);
});

reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (!doc) return;
  await this.model.calculateAvgRating(doc.tour);
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;
