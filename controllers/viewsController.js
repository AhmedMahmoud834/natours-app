import Booking from '../models/bookingModel.js';
import Tour from '../models/tourModel.js';
import User from '../models/userModel.js';
import APIFeatures from '../util/apiFeatures.js';
import AppError from '../util/appError.js';

export const alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking') {
    res.locals.alert =
      "Your booking was successful! Please check your email for a confirmation. If your booking doesn't show up here immediately, please come back later.";
  }
  next();
};

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

export const getTourDetailsPage = async (req, res) => {
  const tour = await Tour.findOne({ slug: req.params.slug });
  if (!tour) {
    return res.status(404).render('error', {
      title: 'Tour Not Found',
      msg: 'The tour you are looking for does not exist or may have been removed.',
    });
  }

  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    slug: req.params.slug,
    tour,
  });
};

export const getNotFoundPage = (req, res) => {
  res.status(404).render('error', {
    title: 'Tour Not Found',
    msg: 'The tour you are looking for does not exist or may have been removed.',
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

export const getAdminDashboard = async (req, res, next) => {
  // Execute all independent database queries concurrently
  const [
    revenueStats,
    activeBookingsCount,
    popularTourData,
    totalUsersCount,
    totalToursCount,
    globalRatingStats,
  ] = await Promise.all([
    // 1. Revenue
    Booking.aggregate([
      { $match: { paid: true } },
      { $group: { _id: null, totalRevenue: { $sum: '$price' } } },
    ]),
    // 2. Active Bookings
    Booking.countDocuments({ status: { $in: ['pending', 'confirmed'] } }),
    // 3. Popular Tour
    Booking.aggregate([
      { $group: { _id: '$tour', numBookings: { $sum: 1 } } },
      { $sort: { numBookings: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'tours',
          localField: '_id',
          foreignField: '_id',
          as: 'tourData',
        },
      },
      { $unwind: '$tourData' },
    ]),
    // 4. Total Clients/Users
    User.countDocuments({ role: 'user' }),
    // 5. Total Tours
    Tour.countDocuments(),
    // 6. Global Average Rating
    Tour.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$ratingsAverage' } } },
    ]),
  ]);

  // Extract values safely
  const totalRevenue =
    revenueStats.length > 0 ? revenueStats[0].totalRevenue : 0;
  const popularTourName =
    popularTourData.length > 0 ? popularTourData[0].tourData.name : 'N/A';
  const popularTourBookings =
    popularTourData.length > 0 ? popularTourData[0].numBookings : 0;
  const globalAvgRating =
    globalRatingStats.length > 0 && globalRatingStats[0].avgRating
      ? (Math.round(globalRatingStats[0].avgRating * 10) / 10).toFixed(1)
      : '0.0';

  // Render the page and pass the crunched data
  res.status(200).render('adminOverview', {
    title: 'Admin Dashboard',
    activeTab: 'overview',
    totalRevenue,
    activeBookingsCount,
    popularTourName,
    popularTourBookings,
    totalUsersCount,
    totalToursCount,
    globalAvgRating,
  });
};

export const getLeadGuideDashboard = async (req, res, next) => {
  // 1. Find all tours (including inactive) where the current user is listed in the guides array
  const myTours = await Tour.find({ guides: req.user.id })
    .setOptions({ includeInactive: true })
    .select('+active');
  const tourIds = myTours.map((tour) => tour.id);

  // 2. Check if a specific tour is being filtered
  let bookingQuery = { tour: { $in: tourIds } };
  if (req.query.tour && req.query.tour !== 'all') {
    if (tourIds.includes(req.query.tour)) {
      bookingQuery = { tour: req.query.tour };
    }
  }

  // 3. Find all bookings for those specific tours and populate the user data
  const bookings = await Booking.find(bookingQuery).populate({
    path: 'user',
    select: 'name email photo',
  });

  // 4. Find all available supporting guides (regular guides only)
  const availableGuides = await User.find({
    role: 'guide',
    active: { $ne: false },
  })
    .select('name email')
    .sort('name');

  // 5. Render the page
  res.status(200).render('leadGuideDashboard', {
    title: 'My Guided Tours',
    tours: myTours,
    bookings,
    selectedTour: req.query.tour || 'all',
    user: req.user,
    availableGuides,
  });
};

export const getGuideDashboard = async (req, res, next) => {
  // 1. Find all active tours assigned to this guide
  const tours = await Tour.find({ guides: req.user.id });
  const tourIds = tours.map((tour) => tour.id);

  // 2. Fetch all bookings for participant counts and customer roster
  const allBookings = await Booking.find({ tour: { $in: tourIds } }).populate({
    path: 'user',
    select: 'name email photo',
  });

  // 3. Compute participants headcount per tour
  const tourParticipantCounts = {};
  allBookings.forEach((b) => {
    const tId = b.tour ? b.tour.toString() : null;
    if (tId) {
      tourParticipantCounts[tId] = (tourParticipantCounts[tId] || 0) + 1;
    }
  });

  // Attach participant count directly to each tour object
  const toursWithCounts = tours.map((t) => {
    const tObj = t.toObject ? t.toObject() : { ...t };
    tObj.totalParticipants = tourParticipantCounts[t.id] || 0;
    return tObj;
  });

  // 4. Filter bookings for the roster if a specific tour is selected
  let bookings = allBookings;
  if (req.query.tour && req.query.tour !== 'all') {
    if (tourIds.includes(req.query.tour)) {
      bookings = allBookings.filter(
        (b) => b.tour && b.tour.toString() === req.query.tour,
      );
    }
  }

  // 5. Render read-only guide dashboard
  res.status(200).render('guideDashboard', {
    title: 'My Tour Itineraries',
    tours: toursWithCounts,
    bookings,
    selectedTour: req.query.tour || 'all',
    user: req.user,
  });
};
