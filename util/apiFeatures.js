class APIFeatures {
  constructor(query, queryString, Model) {
    this.query = query;
    this.queryString = queryString;
    this.excludedFields = ['page', 'limit', 'sort', 'fields'];
    this.Model = Model
  }

  filter() {
    const queryObj = { ...this.queryString };
    this.excludedFields.forEach((el) => delete queryObj[el]);
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query.sort(sortBy);
    } else {
      this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query.select(fields);
    } else {
      this.query.select('-__v');
    }
    return this;
  }

  async pagination() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 10;
    const skip = (page - 1) * limit;
    this.query.skip(skip).limit(limit);
    if (this.queryString.page) {
      const docCount = await this.Model.countDocuments();
      if (skip >= docCount) throw new Error('This page does not exist');
    }
    return this;
  }
}

export default APIFeatures;
