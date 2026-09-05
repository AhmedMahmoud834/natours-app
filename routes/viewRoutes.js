import express from 'express';
import {
  alerts,
  getHome,
  getTourDetailsPage,
  getNotFoundPage,
  getAllTours,
  getLogin,
  getSignupForm,
  getMePage,
  getForgotPassword,
  getResetPasswordForm,
  getMyTours,
  getMyReviews,
  getAdminDashboard,
  getLeadGuideDashboard,
  getGuideDashboard,
} from '../controllers/viewsController.js';
import {
  isLoggedIn,
  redirectIfLoggedIn,
  restrictTo,
  routeProtect,
} from '../controllers/authController.js';
import {
  getAdminUsers,
  getAdminTours,
  getAdminBookings,
  getAdminReviews,
} from '../controllers/adminViewsController.js';

const viewRouter = express.Router();

viewRouter.use(alerts);

viewRouter.get('/', isLoggedIn, getHome);
viewRouter.get('/tours', isLoggedIn, getAllTours);
viewRouter.get('/tours/:slug', isLoggedIn, getTourDetailsPage);
viewRouter.get('/not-found', getNotFoundPage);
viewRouter.get('/login', isLoggedIn, redirectIfLoggedIn, getLogin);
viewRouter.get('/signup', isLoggedIn, redirectIfLoggedIn, getSignupForm);
viewRouter.get('/me', routeProtect, getMePage);
viewRouter.get('/my-tours', routeProtect, getMyTours);
viewRouter.get('/my-reviews', routeProtect, restrictTo('user'), getMyReviews);
viewRouter.get(
  '/guide-dashboard',
  routeProtect,
  restrictTo('guide', 'lead-guide', 'admin'),
  getGuideDashboard,
);
viewRouter.get(
  '/lead-guide-dashboard',
  routeProtect,
  restrictTo('lead-guide', 'admin'),
  getLeadGuideDashboard,
);
viewRouter.get('/forgotPassword', getForgotPassword);
viewRouter.get('/resetPassword/:token', getResetPasswordForm);

// admin panel
viewRouter.use('/admin', routeProtect, restrictTo('admin'), isLoggedIn);
viewRouter.get('/admin', getAdminDashboard);
viewRouter.get('/admin/overview', getAdminDashboard);
viewRouter.get('/admin/users', getAdminUsers);
viewRouter.get('/admin/tours', getAdminTours);
viewRouter.get('/admin/bookings', getAdminBookings);
viewRouter.get('/admin/reviews', getAdminReviews);

export default viewRouter;
