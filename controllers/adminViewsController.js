import Review from '../models/reviewModel.js';
import User from '../models/userModel.js';

export const getAdminUsers = (req, res, next) => {
  res.status(200).render('adminUsers', {
    title: 'Manage Users',
    activeTab: 'users',
  });
};

export const getAdminTours = async (req, res, next) => {
  const guides = await User.find({
    role: { $in: ['lead-guide', 'guide'] },
    active: { $ne: false },
  })
    .select('name role email')
    .sort('role name');

  res.status(200).render('adminTours', {
    title: 'Manage Tours',
    activeTab: 'tours',
    guides,
  });
};

export const getAdminBookings = (req, res, next) => {
  res.status(200).render('adminBookings', {
    title: 'Manage Bookings',
    activeTab: 'bookings',
  });
};

export const getAdminReviews = async (req, res, next) => {
  const reviews = await Review.find()
    .setOptions({ includeUserEmail: true })
    .sort('-createdAt');

  res.status(200).render('adminReviews', {
    title: 'Manage Reviews',
    activeTab: 'reviews',
    reviews,
  });
};
