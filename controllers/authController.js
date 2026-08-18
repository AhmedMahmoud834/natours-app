import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import crypto from 'crypto';
import AppError from '../util/appError.js';
import User from '../models/userModel.js';
import sendToken from '../util/sendCookie.js';
import config from '../config/index.js';
import Email from '../util/email.js';

export const signup = async (req, res, next) => {
  const { name, email, password, passwordConfirm } = req.body;
  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
  });
  newUser.password = undefined;

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  sendToken(newUser.id, res);

  res.status(201).json({
    status: 'Success',
    data: {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      id: newUser._id,
    },
  });
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;
  // check email and password
  if (!email || !password)
    return next(new AppError('please provide email and password!', 400));

  // check credentials
  const user = await User.findOne({ email }).select(
    '+password +lockedUntil +loginAttempts +lockoutCount +lockoutResetTime',
  );

  // if account is locked
  if (user && user.lockedUntil && user.lockedUntil.getTime() > Date.now())
    return next(
      new AppError(
        `Too many login attempts, Account is locked until ${new Date(user.lockedUntil)}`,
        401,
      ),
    );

  if (!user || !(await user.checkPassword(password, user.password)))
    return next(new AppError('Incorrect email or password!', 401));

  // gen token and send it
  sendToken(user._id, res);
  res.status(200).json({
    status: 'Success',
  });
};

export const logout = (req, res, next) => {
  res.cookie('jwt', 'logout', {
    expires: new Date(Date.now() + 10),
    httpOnly: true,
  });
  res.status(200).json({ status: 'Success' });
};

export const routeProtect = async (req, res, next) => {
  // check token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token)
    return next(
      new AppError('You are not logged in! please log in to access.', 401),
    );

  // check token valid
  const decoded = await promisify(jwt.verify)(token, config.jwt.secret);
  // check user exist
  const user = await User.findById(decoded.id);
  if (!user)
    return next(
      new AppError('The user belongs to this token no longer exist!', 401),
    );

  // check if user changed password after
  if (user.changedPasswordAfter(decoded.iat))
    return next(
      new AppError('User recently changed password! please log in again.', 401),
    );
  req.user = user;
  next();
};

export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    // check if user role is included
    if (!roles.includes(req.user.role))
      return next(
        new AppError('You do not have permission to perform this action!', 403),
      );

    next();
  };

export const forgetPassword = async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  let resetToken;
  if (user) {
    // gen token
    resetToken = user.genPassResetToken();
    await user.save({ validateBeforeSave: false });
  }

  try {
    // send to user
    if (resetToken) {
      const resetURL = `${req.protocol}://${req.get('host')}/resetPassword/${resetToken}`;
      await new Email(user, resetURL).sendPasswordReset();
    }

    res.status(200).json({
      status: 'Success',
      message: 'If that email is registered a reset link was sent.',
    });
  } catch (err) {
    if (user) {
      user.passResetToken = undefined;
      user.passResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
    }

    return next(
      new AppError(
        'There was an error sending the email! Try again later.',
        500,
      ),
    );
  }
};

export const resetPassword = async (req, res, next) => {
  // crypt the token from user
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // check if token exist
  const user = await User.findOne({
    passResetToken: hashedToken,
    passResetExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError('Token is invalid or has expired!', 400));

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passResetToken = undefined;
  user.passResetExpires = undefined;
  await user.save();

  sendToken(user._id, res);
  res.status(200).json({
    status: 'Success',
  });
};

export const updatePassword = async (req, res, next) => {
  // get old and new pass from user
  const { currentPassword, newPassword, newPasswordConfirm } = req.body;

  // check if old pass is correct
  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.checkPassword(currentPassword, user.password)))
    return next(new AppError('Current password is invalid!', 400));

  // updating the pass
  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;
  await user.save();

  // send token to user
  sendToken(user._id, res);
  res.status(200).json({
    status: 'Success',
    message: 'Password changed successfully!',
  });
};

export const isLoggedIn = async (req, res, next) => {
  if (req.cookies && req.cookies.jwt) {
    try {
      // 1) Verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        config.jwt.secret,
      );
      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) return next();
      // 3) Check if user changed password after token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) return next();
      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

export const redirectIfLoggedIn = (req, res, next) => {
  if (res.locals.user) {
    return res.redirect('/');
  }
  next();
};
