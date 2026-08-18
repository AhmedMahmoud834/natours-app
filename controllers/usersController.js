import multer from 'multer';
import path from 'node:path';
import sharp from 'sharp';
import User from '../models/userModel.js';
import AppError from '../util/appError.js';
import filterObj from '../util/filterObj.js';
import FactoryHandler from './factoryHandler.js';
import rootDir from '../util/rootDir.js';

export const getAllUsers = FactoryHandler.getAll(User);

export const getMe = (req, res, next) => {
  if (!req.user) return next(new AppError('Please login first!', 401));

  res.status(200).json({
    status: 'Success',
    data: {
      user: req.user,
    },
  });
};

export const updateMe = async (req, res, next) => {
  if (req.body?.password || req.body?.passwordConfirm)
    return next(
      new AppError(
        'This route is not for password update. Please use /updatePassword.',
        400,
      ),
    );
  const filteredObj = filterObj(req.body, 'name', 'email');
  if (req.file) filteredObj.photo = req.file.filename;
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredObj, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!updatedUser) return next(new AppError('User not found.', 404));

  res.status(200).json({
    status: 'Success',
    data: {
      user: updatedUser,
    },
  });
};

export const deleteMe = async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'Success',
    data: null,
  });
};

export const getUser = async (req, res, next) => {
  const id = req.params.userId;
  const user = await User.findById(id);

  if (!user) return next(new AppError('User not found!'));

  res.status(200).json({
    status: 'Success',
    data: {
      user,
    },
  });
};

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

export const userUploadPhoto = upload.single('photo');
