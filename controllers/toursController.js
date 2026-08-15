import multer from 'multer';
import sharp from 'sharp';
import path from 'node:path';
import Tour from '../models/tourModel.js';
import FactoryHandler from './factoryHandler.js';
import AppError from '../util/appError.js';
import rootDir from '../util/rootDir.js';

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

// controllers
const getTours = FactoryHandler.getAll(Tour);

const getTour = FactoryHandler.getOne(Tour, 'tourId', { path: 'reviews' });

const updateTour = FactoryHandler.updateOne(Tour, 'tourId');

const deleteTour = FactoryHandler.deleteOne(Tour, 'tourId');

const createTour = FactoryHandler.createOne(Tour);

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

// uploading images
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Please upload image file only!', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

export const uploadTourImages = upload.fields([
  {
    name: 'imageCover',
    maxCount: 1,
  },
  {
    name: 'images',
    maxCount: 3,
  },
]);

export const resizeTourImages = async (req, res, next) => {
  if (!req.files || (!req.files.imageCover && !req.files.images)) return next();

  // cover image
  req.body.imageCover = `tour-${req.params.tourId}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(path.join(rootDir, '/public/img/tours', req.body.imageCover));

  // images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (img, i) => {
      const imageFilename = `tour-${req.params.tourId}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(img.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(path.join(rootDir, '/public/img/tours', imageFilename));
      req.body.images.push(imageFilename);
    }),
  );
  next();
};

export { getTours, getTour, deleteTour, updateTour, createTour };
