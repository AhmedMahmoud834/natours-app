# Natours — Tour Booking & Exploration Platform

> A full-stack tour exploration and booking application providing secure reservations, interactive geospatial mapping, and automated payment processing for travel adventures.

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%209.7-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Stripe](https://img.shields.io/badge/Stripe-v22-008CDD?logo=stripe&logoColor=white)](https://stripe.com/)
[![Sass](https://img.shields.io/badge/Sass-Dart%20Sass-CC6699?logo=sass&logoColor=white)](https://sass-lang.com/)

---

## 📌 Features

- **Tour Discovery & Geospatial Search**: Browse tours filtered by price, difficulty, ratings, or location radius using MongoDB geospatial queries (`$geoWithin`, `$geoNear`).
- **Interactive Mapping**: Leaflet maps rendered with CartoDB Dark Matter tiles, custom coordinates pins, and route bounding boxes.
- **Authentication & Role Authorization**: JSON Web Token (JWT) stored in HTTP-only cookies, with role-based access control (`user`, `guide`, `lead-guide`, `admin`).
- **Account Protection**: Incremental account lockout defense (15m/30m/60m) after 5 consecutive failed login attempts.
- **Password Reset Pipeline**: Time-limited cryptographic reset tokens delivered through responsive HTML emails.
- **Stripe Checkout**: Direct integration with Stripe Checkout Sessions for credit card payments and automated booking generation.
- **User Dashboard**: Profile settings, password management, and a dedicated "My Bookings" view.
- **Image Processing Pipeline**: Multi-part image uploads via Multer (memory storage) with automated resizing, cropping, and JPEG conversion via Sharp.
- **Transactional Emails**: Pre-rendered HTML emails using Pug templates and Nodemailer.
- **Server-Side Rendered UI**: Built with Pug and custom BEM SCSS following the dark "Expedition" palette.

---

## 🛠️ Tech Stack

### Backend & Core
- **Node.js**: Server runtime environment using native ES modules.
- **Express.js (v5)**: Web application and REST API framework.
- **Pug**: Server-side templating engine for views and email templates.

### Database & ODM
- **MongoDB**: NoSQL document database.
- **Mongoose (v9)**: Object Data Modeling (ODM) library with schema validation, virtual populate, and geospatial indexing.

### Authentication & Security
- **JSON Web Tokens (`jsonwebtoken`)**: Stateless token issuance and verification.
- **Bcrypt (`bcryptjs`)**: Password hashing and salt rounds.
- **Helmet**: HTTP header hardening with a custom Content Security Policy (CSP).
- **Express Rate Limit**: IP rate limiting against brute-force attacks.
- **Mongo Sanitize & XSS Filters**: Sanitization of user input against NoSQL operator injection and cross-site scripting.
- **HPP**: Parameter pollution prevention on query strings.

### Payments & Third-Party APIs
- **Stripe SDK (v22)**: Payment processing and Checkout Sessions.
- **Leaflet.js**: Client-side interactive map visualization.
- **Nodemailer**: SMTP email transport delivery.
- **Sharp**: High-performance image transformation and resizing.

---

## 🏛️ Architecture & Project Structure

The project strictly follows the **Model-View-Controller (MVC)** architectural pattern to ensure clean separation of concerns:

- **Models**: Encapsulate business logic, database schemas, validation rules, and lifecycle middleware.
- **Views**: Server-side rendered Pug templates providing the user interface and email formats.
- **Controllers**: Handle HTTP request processing, interface with Mongoose models, and return JSON responses or rendered HTML.
- **Routers**: Modular Express routers mapping HTTP methods and URL paths to middleware pipelines.
- **Utils**: Generic reusable helpers (error handling, email dispatch, query features).

```
natours/
├── config/              # Centralized configuration & environment validation
├── controllers/         # Request handling & application business logic
│   ├── authController.js
│   ├── bookingController.js
│   ├── errorController.js
│   ├── factoryHandler.js
│   ├── reviewController.js
│   ├── toursController.js
│   ├── usersController.js
│   └── viewsController.js
├── models/              # Mongoose data schemas and models
│   ├── bookingModel.js
│   ├── reviewModel.js
│   ├── tourModel.js
│   └── userModel.js
├── public/              # Static assets compiled for client consumption
│   ├── css/             # Compiled CSS stylesheets
│   ├── img/             # Images, icons, and avatars
│   ├── js/              # Modular vanilla client scripts (IIFE encapsulated)
│   └── sass/            # SCSS source files adhering to BEM conventions
├── routes/              # Route declarations mapped to controllers
│   ├── bookingRoutes.js
│   ├── reviewRoutes.js
│   ├── toursRoutes.js
│   ├── userRoutes.js
│   └── viewRoutes.js
├── util/                # Cross-cutting utility classes & helpers
│   ├── apiFeatures.js
│   ├── appError.js
│   ├── email.js
│   ├── filterObj.js
│   ├── logger.js
│   └── sendCookie.js
├── views/               # Pug templates (Views & Transactional Emails)
│   ├── email/           # Email layout and templates
│   ├── account.pug
│   ├── accountBookings.pug
│   ├── base.pug
│   ├── error.pug
│   ├── home.pug
│   ├── login.pug
│   ├── overview.pug
│   ├── signup.pug
│   └── tour.pug
├── app.js               # Express application configuration & middleware stack
├── server.js            # Server bootstrap and database connection
└── package.json
```

---

## 🔌 API Endpoints Reference

### Tours (`/api/v1/tours`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/tours` | Get all tours (supports filter, sort, limit, page) | No |
| `GET` | `/api/v1/tours/:tourId` | Get single tour details | No |
| `POST` | `/api/v1/tours` | Create a new tour | Yes (`admin`, `lead-guide`) |
| `PATCH` | `/api/v1/tours/:tourId` | Update tour & upload cover/gallery images | Yes (`admin`, `lead-guide`) |
| `DELETE` | `/api/v1/tours/:tourId` | Delete a tour | Yes (`admin`, `lead-guide`) |
| `GET` | `/api/v1/tours/top-5` | Alias for top 5 rated cheap tours | No |
| `GET` | `/api/v1/tours/tours-stats` | Aggregation pipeline stats per difficulty | No |
| `GET` | `/api/v1/tours/monthly-plan/:year` | Monthly tour schedule analysis | Yes (`admin`, `lead-guide`, `guide`) |
| `GET` | `/api/v1/tours/tours-within/:distance/center/:latlng/unit/:unit` | Find tours within radial distance | No |
| `GET` | `/api/v1/tours/distances/:latlng/unit/:unit` | Calculate tour distances from coordinates | No |

### Users & Authentication (`/api/v1/users`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/users/signup` | Register new account | No |
| `POST` | `/api/v1/users/login` | Authenticate user & set JWT cookie | No |
| `GET` | `/api/v1/users/logout` | Clear authentication cookie | No |
| `POST` | `/api/v1/users/forgetPassword` | Send password reset token to email | No |
| `PATCH` | `/api/v1/users/resetPassword/:token` | Reset password using valid token | No |
| `GET` | `/api/v1/users/me` | Retrieve current user profile | Yes |
| `PATCH` | `/api/v1/users/updateMe` | Update user details & upload avatar | Yes |
| `PATCH` | `/api/v1/users/updatePassword` | Change user password | Yes |
| `DELETE` | `/api/v1/users/deleteMe` | Deactivate account (soft delete) | Yes |
| `GET` | `/api/v1/users` | Retrieve all users | Yes (`admin`) |

### Bookings & Reviews

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/booking/checkout-session/:tourId` | Generate Stripe Checkout session | Yes |
| `GET` | `/api/v1/reviews` | Get all reviews | No |
| `POST` | `/api/v1/tours/:tourId/reviews` | Create review for a tour | Yes (`user`) |
| `PATCH` | `/api/v1/reviews/:reviewId` | Update own review | Yes (`user`, `admin`) |
| `DELETE` | `/api/v1/reviews/:reviewId` | Delete review | Yes (`user`, `admin`) |

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory and supply the following configuration keys:

| Variable | Description | Example / Default |
|---|---|---|
| `NODE_ENV` | Application environment mode | `development` / `production` |
| `PORT` | Web server listening port | `5000` |
| `DATABASE` | MongoDB connection URI | `mongodb://localhost:27017/natours` |
| `DATABASE_USER` | MongoDB database user (if using Atlas) | `admin` |
| `DATABASE_PASSWORD` | MongoDB database password | `secretpassword` |
| `PASSWORD_SALT` | Bcrypt salt rounds count | `10` |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens | `your-32-character-secret` |
| `JWT_EXPIRES` | JWT validity lifetime duration | `15d` |
| `JWT_COOKIES_EXPIRES` | Cookie expiration timeframe in days | `15` |
| `EMAIL_HOST` | SMTP server hostname | `sandbox.smtp.mailtrap.io` |
| `EMAIL_PORT` | SMTP port number | `2525` |
| `EMAIL_USERNAME` | SMTP account username | `mailtrap_user` |
| `EMAIL_PASSWORD` | SMTP account password | `mailtrap_pass` |
| `EMAIL_FROM` | Default sender email address | `Natours <admin@natours.io>` |
| `STRIPE_SECRET_KEY` | Stripe private API secret key | `sk_test_...` |
| `STRIPE_PUBLIC_KEY` | Stripe publishable API key | `pk_test_...` |

---

## 🚦 Getting Started

### 1. Prerequisites
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (version 18.x or higher)
- [MongoDB](https://www.mongodb.com/) (running locally or a MongoDB Atlas URI)

### 2. Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/AhmedMahmoud834/natours-app.git
cd natours-app
npm install
```

### 3. Build Stylesheets
Compile SCSS source files into the distribution stylesheet:
```bash
# Single build
npm run sass:build

# Active file watcher for frontend development
npm run sass:watch
```

### 4. Run the Server
```bash
# Start with automatic restart on file change
npm start

# Start with Node inspector attached for debugging
npm run debug
```

Open your browser and navigate to `http://localhost:5000`.

---

## 🧪 Testing & Code Quality

Code formatting and static analysis are enforced using ESLint and Prettier configured for Node.js ES modules:

```bash
# Run ESLint validation
npx eslint .

# Format code with Prettier
npx prettier --write .
```

---

## 📸 Screenshots / Preview

*Screenshots and UI demos of the landing page, tour details with Leaflet maps, account dashboard, and Stripe checkout flow will be placed in the `docs/screenshots/` directory.*

---

## 📄 License
This project is licensed under the **ISC License**.

**Author**: Ahmed Mahmoud
