import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'DATABASE',
  'DATABASE_PASSWORD',
  'DATABASE_USER',
  'PASSWORD_SALT',
  'JWT_SECRET',
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
    // Mailtrap (development)
    mailtrap: {
      host: process.env.MAILTRAP_EMAIL_HOST,
      port: parseInt(process.env.MAILTRAP_EMAIL_PORT, 10) || 587,
      username: process.env.MAILTRAP_EMAIL_USERNAME,
      password: process.env.MAILTRAP_EMAIL_PASSWORD,
      from: process.env.MAILTRAP_EMAIL_FROM || 'Natours <natours@mail.io>',
    },
    // Brevo (production)
    brevo: {
      host: process.env.BREVO_SMTP_SERVER,
      port: parseInt(process.env.BREVO_PORT, 10) || 587,
      username: process.env.BREVO_LOGIN,
      password: process.env.BREVO_SMTP_KEY,
      from: process.env.BREVO_EMAIL_FROM || 'Natours <natours@mail.io>',
    },
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
