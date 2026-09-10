import mongoose from 'mongoose';
import isEmail from 'validator/lib/isEmail.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ReturnDocument } from 'mongodb';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter a name!'],
    minlength: [1, 'Name must be more or equal to 1 char!'],
    maxlength: [40, 'Name must be less or equal to 40 char!'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please enter your email!'],
    unique: [true, 'Email already registered!'],
    trim: true,
    validate: {
      validator: isEmail,
      message: 'Email must be valid!',
    },
    lowercase: true,
  },
  photo: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please enter a password!'],
    minlength: [8, 'Password length must be 8 or more!'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [
      function () {
        return this.isNew || this.isModified('password');
      },
      'Please confirm your password!',
    ],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords must match!',
    },
  },
  changedPassAt: {
    type: Date,
    select: false,
  },
  passResetToken: {
    type: String,
    select: false,
  },
  passResetExpires: {
    type: Date,
    select: false,
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  loginAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  lockedUntil: {
    type: Date,
    select: false,
  },
  lockoutCount: {
    type: Number,
    default: 0,
    select: false,
  },
  lockoutResetTime: {
    type: Date,
    select: false,
  },
});

// middleware
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(
    this.password,
    Number(process.env.PASSWORD_SALT),
  );
  this.passwordConfirm = undefined;
});

userSchema.pre('save', function () {
  if (!this.isModified('password') || this.isNew) return;

  this.changedPassAt = Date.now() - 1000;
});

userSchema.pre(/^find/, function () {
  if (this.getOptions().includeInactive) return;
  this.find({ active: { $ne: false } });
});

userSchema.methods.checkPassword = async function (
  candidatePassword,
  userPassword,
) {
  const isCorrect = await bcrypt.compare(candidatePassword, userPassword);
  if (!isCorrect) {
    const updated = await this.constructor
      .findOneAndUpdate(
        { _id: this.id },
        {
          $inc: { loginAttempts: 1 },
          lockoutCount:
            this.lockoutResetTime < Date.now() ? 0 : this.lockoutCount,
          lockoutResetTime: Date.now() + 24 * 60 * 60 * 1000,
        },
        { returnDocument: 'after' },
      )
      .select('+loginAttempts +lockoutCount');
    if (updated.loginAttempts >= 5) {
      const nextLockoutCount = (updated.lockoutCount || 0) + 1;

      const lockoutDurationMs =
        15 * 60 * 1000 * 2 ** Math.max(0, nextLockoutCount - 1);
      const lockedUntil = new Date(Date.now() + lockoutDurationMs);
      await this.constructor.findOneAndUpdate(
        { _id: this.id },
        {
          $set: {
            loginAttempts: 0,
            lockoutCount: nextLockoutCount,
            lockedUntil,
          },
        },
      );
    }
  } else if (this.loginAttempts > 0) {
    await this.constructor.findOneAndUpdate(
      {
        _id: this.id,
      },
      {
        $unset: { lockedUntil: 1 },
        $set: { loginAttempts: 0 },
        lockoutCount:
          this.lockoutResetTime < Date.now() ? 0 : this.lockoutCount,
      },
    );
  }

  return isCorrect;
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.changedPassAt) {
    const passwordTimestamp = parseInt(this.changedPassAt.getTime() / 1000, 10);
    return passwordTimestamp > JWTTimestamp;
  }
  return false;
};

userSchema.methods.genPassResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', userSchema);

export default User;
