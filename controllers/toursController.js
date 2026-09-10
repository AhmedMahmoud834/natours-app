import Tour from '../models/tourModel.js';
import User from '../models/userModel.js';
import FactoryHandler from './factoryHandler.js';
import AppError from '../util/appError.js';
import Booking from '../models/bookingModel.js';
import filterObj from '../util/filterObj.js';
import allowedFields from '../util/allowedFields.js';

// controllers
export const getTours = FactoryHandler.getAll(Tour, [
  { path: 'guides', select: 'name email photo role' },
]);

export const getAllInActiveTours = FactoryHandler.getAll(
  Tour,
  [{ path: 'guides', select: 'name email photo role' }],
  { active: false },
);

export const getTour = FactoryHandler.getOne(Tour, 'tourId', [
  { path: 'guides', select: 'name email photo role' },
]);

export const updateTour = async (req, res, next) => {
  if (req.body.guides && !Array.isArray(req.body.guides)) {
    req.body.guides = [req.body.guides];
  }

  // Security check: lead guides can only assign supporting guides (role: 'guide')
  if (req.user.role === 'lead-guide' && req.body.guides) {
    const guidesToCheck = req.body.guides.filter((id) => id !== req.user.id);
    if (guidesToCheck.length > 0) {
      const validGuidesCount = await User.countDocuments({
        _id: { $in: guidesToCheck },
        role: 'guide',
      });

      if (validGuidesCount !== guidesToCheck.length) {
        return next(
          new AppError('Lead guides may only assign supporting guides.', 400),
        );
      }
    }
    req.body.guides = [req.user.id, ...guidesToCheck];
  }

  return FactoryHandler.updateOne(
    Tour,
    'tourId',
    allowedFields.tourData,
  )(req, res, next);
};

export const deleteTour = async (req, res, next) => {
  const [tour, bookingCount] = await Promise.all([
    Tour.findById(req.params.tourId).setOptions({
      includeInactive: true,
    }),
    Booking.countDocuments({ tour: req.params.tourId }),
  ]);

  if (!tour) return next(new AppError('No tour found with this id!', 404));

  if (bookingCount > 0)
    return next(
      new AppError(
        `Cannot permanently delete this tour - it has ${bookingCount} existing booking(s). Deactivate it instead.`,
        400,
      ),
    );

  await Tour.findByIdAndDelete(req.params.tourId, { includeInactive: true });
  res.status(204).json({
    status: 'Success',
    data: null,
  });
};

export const deactivateTour = async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId)
    .setOptions({
      includeInactive: true,
    })
    .select('+active');

  if (!tour) {
    return next(new AppError('No tour found with this Id.', 404));
  }

  if (!tour.active) {
    return next(new AppError('Tour already inactive.', 400));
  }

  tour.active = false;
  await tour.save({ runValidators: false });

  res.status(200).json({
    status: 'Success',
    data: {
      document: tour,
    },
  });
};

export const activateTour = async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId)
    .setOptions({
      includeInactive: true,
    })
    .select('+active');

  if (!tour) {
    return next(new AppError('No tour found with this Id.', 404));
  }

  if (tour.active) {
    return next(new AppError('Tour already active.', 400));
  }

  tour.active = true;
  await tour.save({ runValidators: false });

  res.status(200).json({
    status: 'Success',
    data: {
      document: tour,
    },
  });
};

export const createTour = async (req, res, next) => {
  if (req.body.guides && !Array.isArray(req.body.guides)) {
    req.body.guides = [req.body.guides];
  }

  // Security check: lead guides can only assign supporting guides (role: 'guide')
  if (req.user.role === 'lead-guide' && req.body.guides?.length) {
    const validGuidesCount = await User.countDocuments({
      _id: { $in: req.body.guides },
      role: 'guide',
    });

    if (validGuidesCount !== req.body.guides.length) {
      return next(
        new AppError('Lead guides may only assign supporting guides.', 400),
      );
    }
  }

  const tourData = filterObj({ ...req.body }, ...allowedFields.tourData);
  if (req.user.role === 'lead-guide') {
    const additionalGuides = (tourData.guides || []).filter(
      (id) => id !== req.user.id,
    );
    tourData.guides = [req.user.id, ...additionalGuides];
  }

  const tour = await Tour.create(tourData);

  res.status(201).json({
    status: 'Success',
    data: {
      document: tour,
    },
  });
};

export const getTourStats = async (req, res) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: '$duration',
        toursCount: { $sum: 1 },
        avgRatings: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        ratingsCount: { $sum: '$ratingsQuantity' },
      },
    },
    {
      $sort: {
        _id: -1,
      },
    },
  ]);
  res.status(200).json({
    status: 'Success',
    data: {
      tour: stats,
    },
  });
};

export const getMonthlyPlan = async (req, res) => {
  const year = Number(req.params.year);
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        toursCount: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: {
        month: '$_id',
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: {
        toursCount: -1,
      },
    },
  ]);
  res.status(200).json({
    status: 'Success',
    data: {
      tour: plan,
    },
  });
};

export const toursWithin = async (req, res, next) => {
  const { distance, latlng, unit } = req.params;

  if (!distance) return next(new AppError('Please provide distance.', 400));

  if (!latlng)
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400,
      ),
    );
  const [lat, lng] = latlng.split(',');

  if (!unit || (unit !== 'mi' && unit !== 'km'))
    return next(
      new AppError(
        "Unit is invalid allowed units 'mi' for miles, 'km' for kilometer.",
        400,
      ),
    );
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'Success',
    results: tours.length,
    data: tours,
  });
};

export const getDistances = async (req, res, next) => {
  const { latlng, unit } = req.params;

  if (!latlng)
    return next(
      new AppError(
        "Please provide latitude, longitude and unit in 'mi' or 'km'",
        400,
      ),
    );
  if (!unit || (unit !== 'mi' && unit !== 'km'))
    return next(
      new AppError(
        "Unit is invalid allowed units 'mi' for miles, 'km' for kilometer.",
        400,
      ),
    );
  const multiplayer = unit === 'mi' ? 0.000621371 : 0.001;
  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) return next(new AppError('Invalid latitude and longitude'));

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplayer,
      },
    },
    {
      $project: {
        distance: 1,
        unit: unit,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'Success',
    results: distances.length,
    data: distances,
  });
};

// middleware
export const aliasTopTours = (req, res, next) => {
  Object.defineProperty(req, 'query', {
    value: {
      ...req.query,
      limit: '5',
      sort: '-ratingsAverage,price',
      fields: 'name,price,ratingsAverage,summary,difficulty',
    },
    writable: true,
    configurable: true,
  });
  next();
};

export const aliasTopCheapTours = (req, res, next) => {
  Object.defineProperty(req, 'query', {
    value: {
      ...req.query,
      limit: '5',
      sort: 'price,-ratingsAverage',
      fields: 'name,price,ratingsAverage,summary,difficulty',
    },
    writable: true,
    configurable: true,
  });
  next();
};
