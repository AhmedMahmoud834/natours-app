import express from 'express';
import {
  getHome,
  getTourDetailsPage,
  getAllTours,
  getLogin,
  getSignupForm,
  getMePage,
  getForgotPassword,
  getResetPasswordForm,
  getMyTours,
} from '../controllers/viewsController.js';
import {
  isLoggedIn,
  redirectIfLoggedIn,
  routeProtect,
} from '../controllers/authController.js';

const viewRouter = express.Router();

viewRouter.get('/', isLoggedIn, getHome);
viewRouter.get('/tours', isLoggedIn, getAllTours);
viewRouter.get('/tours/:slug', isLoggedIn, getTourDetailsPage);
viewRouter.get('/login', isLoggedIn, redirectIfLoggedIn, getLogin);
viewRouter.get('/signup', isLoggedIn, redirectIfLoggedIn, getSignupForm);
viewRouter.get('/me', routeProtect, getMePage);
viewRouter.get('/my-tours', routeProtect, getMyTours);
viewRouter.get('/forgotPassword', getForgotPassword);
viewRouter.get('/resetPassword/:token', getResetPasswordForm);

export default viewRouter;
