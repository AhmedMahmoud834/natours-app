import Booking from '../models/bookingModel.js';
import Tour from '../models/tourModel.js';
import APIFeatures from '../util/apiFeatures.js';
import AppError from '../util/appError.js';

export const getHome = async (req, res, next) => {
  const topFeatures = await new APIFeatures(
    Tour.find(),
    {
      sort: 'ratingsAverage',
      limit: '3',
    },
    Tour,
  )
    .sort()
    .pagination();
  const top3Tours = await topFeatures.query;
  const recentFeatures = await new APIFeatures(
    Tour.find(),
    {
      sort: '-createdAt',
      limit: '3',
    },
    Tour,
  )
    .sort()
    .pagination();
  const recent3Tours = await recentFeatures.query;
  res.status(200).render('home', {
    title: 'Home',
    top3Tours,
    recent3Tours,
  });
};

export const getTourDetailsPage = async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate(
    'reviews',
  );
  if (!tour) return next(new AppError('Tour not found!'));
  res.status(200).render('tour', {
    title: tour.name,
    tour,
  });
};

export const getAllTours = async (req, res, next) => {
  const features = new APIFeatures(Tour.find(), req.query, Tour);
  const tours = await features.query;

  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
};

export const getLogin = (req, res, next) => {
  res.status(200).render('login', {
    title: 'Login',
  });
};

export const getSignupForm = (req, res, next) => {
  res.status(200).render('signup', {
    title: 'Sign Up',
  });
};

export const getMePage = (req, res, next) => {
  const { user } = req;

  res.status(200).render('account', {
    title: 'Your Account',
    user,
  });
};

export const getForgotPassword = (req, res, next) => {
  res.status(200).render('forgetPassword', {
    title: 'Forget Password',
  });
};

export const getResetPasswordForm = (req, res, next) => {
  const { token } = req.params;
  if (!token) return next(new AppError('Reset password token is invalid!'));
  res.status(200).render('resetPassword', {
    title: 'Reset Your Password',
    token,
  });
};

export const getMyTours = async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id });

  const toursIds = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: toursIds } });

  res.status(200).render('accountBookings', {
    title: 'My Bookings',
    tours,
    user: req.user,
  });
};
