import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getAllUsers,
  updateMe,
  deleteMe,
  getMe,
  userUploadPhoto,
  createUser,
  getUser,
  updateUser,
  activateUser,
  deactivateUser,
  getAllInActiveUsers,
} from '../controllers/usersController.js';
import {
  forgetPassword,
  login,
  logout,
  resetPassword,
  restrictTo,
  routeProtect,
  signup,
  updatePassword,
} from '../controllers/authController.js';
import { resizeUserPhoto } from '../util/multer.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: 'Failed',
    message:
      'Too many login attempts from this IP, please try again in 15 minutes.',
  },
  skipSuccessfulRequests: true,
});

const userRouter = express.Router();

// auth
userRouter.post('/signup', signup);
userRouter.post('/login', loginLimiter, login);
userRouter.get('/logout', logout);
userRouter.post('/forgetPassword', forgetPassword);
userRouter.patch('/resetPassword/:token', resetPassword);

// account settings
userRouter.use(routeProtect);
userRouter.patch('/updatePassword', updatePassword);
userRouter.patch('/updateMe', userUploadPhoto, resizeUserPhoto, updateMe);
userRouter.delete('/deleteMe', deleteMe);
userRouter.get('/me', getMe);

// admin routes
userRouter.use(restrictTo('admin'));
userRouter.route('/').get(getAllUsers).post(createUser);

userRouter.get('/inActive', getAllInActiveUsers);
userRouter.route('/:userId').get(getUser).patch(updateUser);

userRouter.patch('/:userId/activate', activateUser);
userRouter.patch('/:userId/deactivate', deactivateUser);

export default userRouter;
