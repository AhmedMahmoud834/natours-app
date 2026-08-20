import path from 'path';
import express from 'express';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { inHTMLData } from 'xss-filters';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import cors from 'cors';
import compression from 'compression';

import toursRouter from './routes/toursRoutes.js';
import userRouter from './routes/userRoutes.js';
import reviewRouter from './routes/reviewRoutes.js';
import viewRouter from './routes/viewRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import globalErrorHandler from './controllers/errorController.js';
import AppError from './util/appError.js';
import rootDir from './util/rootDir.js';
import config from './config/index.js';
import { webhookCheckout } from './controllers/bookingController.js';

const app = express();

app.set('trust proxy', 1);
app.set('view engine', 'pug');
app.set('views', path.join(rootDir, 'views'));
app.set('query parser', 'extended');

// 1) GLOBAL MIDDLEWARES

// Implement CORS
app.use(cors());
app.options('*splat', cors());

// Serving static files
app.use(express.static(path.join(rootDir, 'public')));

// Set security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://unpkg.com', 'https://js.stripe.com'],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://unpkg.com',
          'https://fonts.googleapis.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://*.tile.openstreetmap.org',
          'https://*.basemaps.cartocdn.com',
        ],
        connectSrc: [
          "'self'",
          'https://*.tile.openstreetmap.org',
          'https://*.basemaps.cartocdn.com',
          'https://api.stripe.com',
        ],
      },
    },
  }),
);

// Development logging
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 50,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this ip, Please try again later in an hour!',
});
if (config.env === 'production') {
  app.use('/api', limiter);
}

// stripe webhook checkout
app.post(
  'webhook-checkout',
  express.raw({ type: 'application/json' }),
  webhookCheckout,
);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// Cookie parser, reading cookies into req.cookies
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use((req, res, next) => {
  ['body', 'params', 'headers', 'query'].forEach((key) => {
    if (req[key]) {
      const sanitized = mongoSanitize.sanitize(req[key]);
      if (key === 'query') {
        Object.defineProperty(req, 'query', {
          value: sanitized,
          configurable: true,
          writable: true,
          enumerable: true,
        });
      } else {
        req[key] = sanitized;
      }
    }
  });
  next();
});

// Data sanitization against XSS
const sanitizeStrings = (obj) => {
  if (typeof obj === 'string') return inHTMLData(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeStrings);
  if (obj && typeof obj === 'object') {
    // eslint-disable-next-line node/no-unsupported-features/es-builtins
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, sanitizeStrings(v)]),
    );
  }
  return obj;
};
app.use((req, res, next) => {
  if (req.body) req.body = sanitizeStrings(req.body);
  next();
});

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// Compress text responses
app.use(compression());

// 2) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', toursRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/booking', bookingRouter);

// Handle unhandled routes
app.all('*splat', (req, res, next) => {
  const err = new AppError(
    `Can't find ${req.originalUrl} on this server!`,
    404,
  );
  next(err);
});

// Global error handling middleware
app.use(globalErrorHandler);

export default app;
