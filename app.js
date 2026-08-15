import express from 'express';
import path from 'path';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { inHTMLData } from 'xss-filters';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';

import toursRouter from './routes/toursRoutes.js';
import userRouter from './routes/userRoutes.js';
import rootDir from './util/rootDir.js';
import AppError from './util/appError.js';
import globalErrorHandler from './controllers/errorController.js';
import reviewRouter from './routes/reviewRoutes.js';
import viewRouter from './routes/viewRoutes.js';
import config from './config/index.js';
import bookingRouter from './routes/bookingRoutes.js';

const app = express();
app.set('view engine', 'pug');
app.set('views', path.join(rootDir, 'views'));

// Serving static files
app.use(express.static(path.join(rootDir, 'public')));
// data sanitization against XSS

app.set('query parser', 'extended');

// middleware
const limiter = rateLimit({
  max: 50,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this ip, Please try again later in an hour!',
});
if (config.env === 'development') {
  app.use(morgan('dev'));
} else if (config.env === 'production') {
  app.use('/api', limiter);
}
// header middleware with CSP whitelist
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

// limit req rate

// parse body content
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// data sanitization against NoSQL Injection
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

// prevent param pollution
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

// routes

app.use('/', viewRouter);
app.use('/api/v1/tours', toursRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/booking', bookingRouter);

// wrong routes
app.all('*splat', (req, res, next) => {
  const err = new AppError(
    `Can't find ${req.originalUrl} on this server!`,
    404,
  );
  next(err);
});

app.use(globalErrorHandler);

export default app;
