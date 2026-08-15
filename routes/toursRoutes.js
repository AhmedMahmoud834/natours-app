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
  uploadTourImages,
  resizeTourImages,
} from '../controllers/toursController.js';
import { restrictTo, routeProtect } from '../controllers/authController.js';
import reviewRouter from './reviewRoutes.js';

const toursRouter = express.Router();

// routes
// reviews
toursRouter.use('/:tourId/reviews', reviewRouter);

toursRouter.route('/top-5').get(aliasTopTours, getTours);
toursRouter.route('/top-5-cheap').get(aliasTopCheapTours, getTours);
toursRouter.route('/tours-stats').get(getTourStats);
toursRouter
  .route('/monthly-plan/:year')
  .get(
    routeProtect,
    restrictTo('admin', 'lead-guide', 'guide'),
    getMonthlyPlan,
  );

toursRouter
  .route('/')
  .get(getTours)
  .post(routeProtect, restrictTo('admin', 'lead-guide'), createTour);

toursRouter
  .route('/:tourId')
  .patch(
    routeProtect,
    restrictTo('admin', 'lead-guide'),
    uploadTourImages,
    resizeTourImages,
    updateTour,
  )
  .delete(routeProtect, restrictTo('admin', 'lead-guide'), deleteTour)
  .get(getTour);

toursRouter
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(toursWithin);

toursRouter.route('/distances/:latlng/unit/:unit').get(getDistances);

export default toursRouter;
