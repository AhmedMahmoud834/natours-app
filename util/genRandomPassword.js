import crypto from 'crypto';

const genRandomPassword = () =>
  crypto.randomBytes(12).toString('base64').slice(0, 16);

export default genRandomPassword;
