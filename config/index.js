import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'DATABASE',
  'DATABASE_PASSWORD',
  'DATABASE_USER',
  'PASSWORD_SALT',
  'JWT_SECRET',
  'EMAIL_USERNAME',
  'EMAIL_PASSWORD',
  'EMAIL_HOST',
  'EMAIL_PORT',
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    const msg = `Missing required environment variable: ${key}`;
    throw new Error(msg);
  }
});

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  db: {
    url: process.env.DATABASE,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  },
  hash: {
    passwordSalt: parseInt(process.env.PASSWORD_SALT, 10) || 10,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES || '15d',
    cookieExpiresIn: parseInt(process.env.JWT_COOKIES_EXPIRES, 10) || 15,
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    username: process.env.EMAIL_USERNAME,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'Natours <natours@mail.io>',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publicKey: process.env.STRIPE_PUBLIC_KEY,
    webhookSecret:
      process.env.NODE_ENV === 'production'
        ? process.env.STRIPE_WEBHOOK_SECRET
        : process.env.STRIPE_WEBHOOK_SECRET_TEST,
  },
};

export default Object.freeze(config);
