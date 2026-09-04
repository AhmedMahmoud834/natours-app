import AppError from '../util/appError.js';
import APIFeatures from '../util/apiFeatures.js';
import filterObj from '../util/filterObj.js';

class FactoryHandler {
  static deleteOne(Model, paramName = 'id') {
    return async (req, res, next) => {
      const id = req.params[paramName];
      const doc = await Model.findByIdAndDelete(id, { includeInactive: true });

      if (!doc) {
        return next(
          new AppError(
            `No ${Model.modelName.toLowerCase()} found with this ID: ${id}`,
            404,
          ),
        );
      }

      res.status(204).end();
    };
  }

  static updateOne(Model, paramName = 'id', allowedFields = []) {
    return async (req, res, next) => {
      const id = req.params[paramName];
      const filteredBody = allowedFields.length
        ? filterObj(req.body, ...allowedFields)
        : req.body;

      const doc = await Model.findById(id).setOptions({
        includeInactive: true,
      });

      if (!doc) {
        return next(
          new AppError(
            `No ${Model.modelName.toLowerCase()} found with this ID: ${id}`,
            404,
          ),
        );
      }

      // Apply updates and trigger schema validators on modified fields
      Object.assign(doc, filteredBody);
      const updatedDoc = await doc.save({ validateModifiedOnly: true });

      res.status(200).json({
        status: 'Success',
        data: {
          document: updatedDoc,
        },
      });
    };
  }

  static createOne(Model, allowedFields = []) {
    return async (req, res, next) => {
      const filteredBody = allowedFields.length
        ? filterObj(req.body, ...allowedFields)
        : req.body;

      const doc = await Model.create(filteredBody);

      res.status(201).json({
        status: 'Success',
        data: {
          document: doc,
        },
      });
    };
  }

  static getOne(Model, paramName = 'id', popOptions = []) {
    return async (req, res, next) => {
      const id = req.params[paramName];
      let query = Model.findById(id).setOptions({ includeInactive: true });

      if (popOptions) {
        const pops = Array.isArray(popOptions) ? popOptions : [popOptions];
        pops.forEach((pop) => {
          query = query.populate(pop);
        });
      }

      const doc = await query;

      if (!doc) {
        return next(
          new AppError(
            `No ${Model.modelName.toLowerCase()} found with this ID: ${id}`,
            404,
          ),
        );
      }

      res.status(200).json({
        status: 'Success',
        data: {
          document: doc,
        },
      });
    };
  }

  static getAll(Model, popOptions = [], baseFilter = {}) {
    return async (req, res, next) => {
      const filter = { ...baseFilter };
      if (req.params.tourId) filter.tour = req.params.tourId;

      let query = Model.find(filter);

      if ('active' in baseFilter) {
        query = query.setOptions({ includeInactive: true });
      }

      if (popOptions) {
        const pops = Array.isArray(popOptions) ? popOptions : [popOptions];
        pops.forEach((pop) => {
          query = query.populate(pop);
        });
      }

      const features = new APIFeatures(query, req.query, Model)
        .filter()
        .sort()
        .limitFields();

      const totalCount = await Model.countDocuments(features.query.getQuery());

      features.pagination();
      const docs = await features.query;

      res.status(200).json({
        status: 'Success',
        results: docs.length,
        totalCount,
        data: {
          document: docs,
        },
      });
    };
  }
}

export default FactoryHandler;
