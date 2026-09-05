import express from 'express';
import {
  getTours,
  getTour,
  createTour,
  updateTour,
  deleteTour,
  aliasTopTours,
  aliasTopCheapTours,
  getTourStats,
  getMonthlyPlan,
  toursWithin,
  getDistances,
  deactivateTour,
  activateTour,
  getAllInActiveTours,
} from '../controllers/toursController.js';
import {
  restrictTo,
  restrictToOwnTour,
  routeProtect,
} from '../controllers/authController.js';
import {
  createReview,
  getAllReviews,
} from '../controllers/reviewController.js';
import { resizeTourImages, uploadTourImages } from '../util/multer.js';

const toursRouter = express.Router();

// routes
// reviews
toursRouter
  .route('/:tourId/reviews')
  .get(getAllReviews)
  .post(routeProtect, restrictTo('user'), createReview);

toursRouter.route('/top-5').get(aliasTopTours, getTours);
toursRouter.route('/top-5-cheap').get(aliasTopCheapTours, getTours);
toursRouter.route('/tours-stats').get(getTourStats);
toursRouter
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(toursWithin);

toursRouter.route('/distances/:latlng/unit/:unit').get(getDistances);
toursRouter
  .route('/monthly-plan/:year')
  .get(
    routeProtect,
    restrictTo('admin', 'lead-guide', 'guide'),
    getMonthlyPlan,
  );

toursRouter.get(
  '/inactive',
  routeProtect,
  restrictTo('admin'),
  getAllInActiveTours,
);

// Public read routes
toursRouter.get('/', getTours);
toursRouter.get('/:tourId', getTour);

// Protected routes (Admin & Lead Guide only)
toursRouter.use(routeProtect, restrictTo('admin', 'lead-guide'));

toursRouter
  .route('/')
  .post(uploadTourImages, resizeTourImages, createTour);

toursRouter
  .route('/:tourId')
  .patch(restrictToOwnTour, uploadTourImages, resizeTourImages, updateTour)
  .delete(restrictToOwnTour, deleteTour);

toursRouter.patch('/:tourId/deactivate', restrictToOwnTour, deactivateTour);

toursRouter.patch('/:tourId/activate', restrictToOwnTour, activateTour);

export default toursRouter;
