import mongoose from 'mongoose';
import slugify from 'slugify';

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name!'],
      unique: true,
      trim: true,
      maxlength: [40, 'A name must have less or equal to 40 characters!'],
      minlength: [10, 'A name must have more or equal to 10 characters!'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration!'],
      min: [1, 'A tour must have more or equal to 1 day!'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size!'],
      min: [1, 'A tour must have more or equal to 1 group size!'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty!'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: "Difficulty must be ['easy', 'medium', 'difficult']!",
      },
    },
    ratingsAverage: {
      type: Number,
      default: 1,
      min: [1, 'Ratings must be above 1.0!'],
      max: [5, 'Ratings must be below 5.0!'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price!'],
      min: [1, 'A tour price cant be less than 1!'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return this.price > val;
        },
        message: 'Discount price ({VALUE}) should be less than regular price!',
      },
      default: 0,
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary!'],
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a image cover!'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    startDates: {
      type: [Date],
      required: [true, 'One or more startDates is required.'],
      validate: {
        validator: function (dates) {
          return dates.every(
            (d) => d instanceof Date && !Number.isNaN(d.getTime()),
          );
        },
      },
    },
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        required: [
          true,
          'startLocation must have coordinates [longitude, latitude].',
        ],
        validate: {
          validator: function (coords) {
            if (coords.length !== 2) return false;
            const [lng, lat] = coords;
            return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
          },
          message:
            'startLocation coordinates must be [longitude, latitude] with valid ranges ' +
            '(lng: -180 to 180, lat: -90 to 90).',
        },
      },
      address: String,
      description: String,
    },
    locations: {
      type: [
        {
          type: {
            type: String,
            default: 'Point',
            enum: ['Point'],
          },
          coordinates: {
            type: [Number],
            required: [
              true,
              'Each location must have coordinates [longitude, latitude].',
            ],
            validate: {
              validator: function (coords) {
                if (coords.length !== 2) return false;
                const [lng, lat] = coords;
                return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
              },
              message:
                'Location coordinates must be [longitude, latitude] with valid ranges ' +
                '(lng: -180 to 180, lat: -90 to 90).',
            },
          },
          address: String,
          description: String,
          day: {
            type: Number,
            min: [1, 'Day must be at least 1.'],
          },
        },
      ],
      validate: {
        validator: function (val) {
          return val && val.length > 0;
        },
        message: 'A tour must have at least one location!',
      },
    },
    guides: {
      type: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
      validate: {
        validator: async function (ids) {
          const User = mongoose.model('User');
          const count = await User.countDocuments({
            _id: { $in: ids },
            role: { $in: ['guide', 'lead-guide'] },
          });
          return count === ids.length;
        },
        message: 'All guides must have the role "guide" or "lead-guide".',
      },
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

tourSchema.index({ price: 1, duration: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });

tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return (this.duration / 7).toFixed(1);
});

tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// run before .save() | .create()
tourSchema.pre('save', function () {
  this.slug = slugify(this.name, { lower: true });
});

tourSchema.pre(/^find/, function () {
  if (this.getOptions().includeInactive) return;
  this.find({ active: { $ne: false } });
});

tourSchema.pre(/^find/, function () {
  this.find({ secretTour: { $ne: true } });
});

tourSchema.pre('aggregate', function () {
  const firstStage = this.pipeline()[0];
  if (firstStage && '$geoNear' in firstStage) {
    this.pipeline().splice(1, 0, {
      $match: { secretTour: { $ne: true } },
    });
  } else {
    this.pipeline().unshift({
      $match: { secretTour: { $ne: true } },
    });
  }
});

const Tour = mongoose.model('Tour', tourSchema);

export default Tour;
