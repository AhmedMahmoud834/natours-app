import multer from 'multer';
import path from 'node:path';
import sharp from 'sharp';
import AppError from './appError.js';
import rootDir from './rootDir.js';

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Please upload image file only!', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

export const resizeUserPhoto = async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(path.join(rootDir, '/public/img/users', req.file.filename));

  next();
};

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

  // Use 'new' as the ID in the filename if this is a POST request creating a new tour
  const tourId = req.params.tourId || 'new';

  // cover image
  if (req.files?.imageCover) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    req.body.imageCover = `tour-${tourId}-${uniqueSuffix}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(path.join(rootDir, '/public/img/tours', req.body.imageCover));
  }
  // images
  if (req.files?.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (img, i) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const imageFilename = `tour-${tourId}-${uniqueSuffix}-${i + 1}.jpeg`;

        await sharp(img.buffer)
          .resize(2000, 1333)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(path.join(rootDir, '/public/img/tours', imageFilename));
        req.body.images.push(imageFilename);
      }),
    );
  }
  next();
};

export default upload;
