import jwt from 'jsonwebtoken';
import config from '../config/index.js';

const signToken = (id) =>
  jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

const sendToken = (id, res) => {
  const token = signToken(id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + config.jwt.cookieExpiresIn * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };
  if (config.env === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
};

export default sendToken;
