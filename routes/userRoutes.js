import express from 'express';
import {
  getAllUsers,
  updateMe,
  deleteMe,
  getMe,
  userUploadPhoto,
  resizeUserPhoto,
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

const userRouter = express.Router();

// auth
userRouter.post('/signup', signup);
userRouter.post('/login', login);
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
userRouter.route('/').get(restrictTo('admin'), getAllUsers);

export default userRouter;
