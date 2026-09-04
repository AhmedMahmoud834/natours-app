import User from '../models/userModel.js';
import AppError from '../util/appError.js';
import Email from '../util/email.js';
import filterObj from '../util/filterObj.js';
import genRandomPassword from '../util/genRandomPassword.js';
import logger from '../util/logger.js';
import upload from '../util/multer.js';
import FactoryHandler from './factoryHandler.js';

export const getAllUsers = FactoryHandler.getAll(User);

export const getAllInActiveUsers = FactoryHandler.getAll(User, [], {
  active: false,
});

export const createUser = FactoryHandler.createOne(User, [
  'name',
  'email',
  'photo',
  'password',
  'passwordConfirm',
  'role',
]);

// export const updateUser = FactoryHandler.updateOne(User, 'userId');
export const updateUser = async (req, res, next) => {
  if (
    req.user.id === req.params.userId &&
    req.body.role &&
    req.body.role !== 'admin'
  ) {
    return next(new AppError('You cannot lower your role than admin', 400));
  }
  const updateOne = FactoryHandler.updateOne(User, 'userId', [
    'name',
    'email',
    'role',
  ]);
  return updateOne(req, res, next);
};

export const getUser = FactoryHandler.getOne(User, 'userId');

export const deactivateUser = async (req, res, next) => {
  if (req.user.id === req.params.userId) {
    return next(new AppError('You cannot deactivate your own account!', 400));
  }
  const user = await User.findById(req.params.userId)
    .setOptions({
      includeInactive: true,
    })
    .select('+active');

  if (!user) {
    return next(new AppError('No user found with this id!', 404));
  }

  if (!user.active) {
    return next(new AppError('This user is already deactivated!', 400));
  }

  user.active = false;
  user.email = `deleted_${user.id}_${Date.now()}@deleted.natours.io`;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'Success',
    data: { document: user },
  });
};

export const activateUser = async (req, res, next) => {
  const user = await User.findById(req.params.userId)
    .setOptions({
      includeInactive: true,
    })
    .select('+active');

  if (!user) {
    return next(new AppError('No user found with this id!', 404));
  }

  if (user.active) {
    return next(new AppError('This user is already active!', 400));
  }

  const { email } = req.body;

  if (!email) {
    return next(
      new AppError('Please provide an email to activate this user', 400),
    );
  }

  const randomPassword = genRandomPassword();

  user.email = email;
  user.password = randomPassword;
  user.passwordConfirm = randomPassword;
  user.active = true;
  await user.save();

  try {
    const loginUrl = `${req.protocol}://${req.get('host')}/login`;
    await new Email(user, loginUrl).sendAccountActivation(
      user.name,
      randomPassword,
    );
  } catch (err) {
    logger.error('Failed to send account activation email', {
      userId: user.id,
      error: err.message,
    });
  }

  res.status(200).json({
    status: 'Success',
    data: { document: user },
  });
};

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

export const userUploadPhoto = upload.single('photo');
