import AppError from '../util/appError.js';
import APIFeatures from '../util/apiFeatures.js';
import filterObj from '../util/filterObj.js';

class FactoryHandler {
  static deleteOne(Model, paramName = 'id') {
    return async (req, res, next) => {
      const id = req.params[paramName];
      const doc = await Model.findByIdAndDelete(id);
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

  static updateOne(Model, paramName = 'id') {
    return async (req, res, next) => {
      const id = req.params[paramName];
      const updatedDoc = await Model.findByIdAndUpdate(id, req.body, {
        returnDocument: 'after',
        runValidators: true,
      });
      if (!updatedDoc)
        return next(
          new AppError(
            `No ${Model.modelName.toLowerCase()} found with this ID: ${id}`,
            404,
          ),
        );
      res.status(200).json({
        status: 'Success',
        data: {
          updatedDoc,
        },
      });
    };
  }

  static getAll(Model) {
    return async (req, res, next) => {
      let filter = {};
      if (req.params.tourId) filter = { tour: req.params.tourId };
      const features = await new APIFeatures(
        Model.find(filter),
        req.query,
        Model,
      )
        .filter()
        .sort()
        .limitFields()
        .pagination();
      const docs = await features.query;

      // Send res
      res.status(200).json({
        status: 'Success',
        results: docs.length,
        data: {
          Documents: docs,
        },
      });
    };
  }

  static getOne(Model, paramName, populateOptions) {
    return async (req, res, next) => {
      const id = req.params[paramName];
      let query = Model.findById(id);
      if (populateOptions) query = query.populate(populateOptions);
      const doc = await query;
      if (!doc)
        return next(
          new AppError(
            `No ${Model.modelName.toLowerCase()} found with this ID: ${id}`,
            404,
          ),
        );
      res.status(200).json({
        status: 'Success',
        data: {
          document: doc,
        },
      });
    };
  }

  static createOne(Model, allowedFields) {
    return async (req, res, next) => {
      let obj = req.body;
      if (allowedFields) obj = filterObj(req.body, ...allowedFields);
      const newDoc = await Model.create(obj);
      res.status(201).json({
        status: 'Success',
        data: {
          'new document': newDoc,
        },
      });
    };
  }
}

export default FactoryHandler;
