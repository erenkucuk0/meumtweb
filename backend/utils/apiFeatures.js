class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  search(fields = []) {
    if (this.queryString.search && fields.length > 0) {
      const searchQuery = {
        $or: fields.map(field => ({
          [field]: { $regex: this.queryString.search, $options: 'i' }
        }))
      };
      this.query = this.query.find(searchQuery);
    }
    return this;
  }
}

const getPaginationData = async (model, page = 1, limit = 10, filter = {}) => {
  const skip = (page - 1) * limit;
  
  const [data, total] = await Promise.all([
    model.find(filter).skip(skip).limit(limit),
    model.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev
    }
  };
};

const formatResponse = (data, req) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  return {
    success: true,
    count: Array.isArray(data) ? data.length : 1,
    pagination: {
      currentPage: page,
      limit: limit,
    },
    data: data,
  };
};

module.exports = {
  APIFeatures,
  getPaginationData,
  formatResponse
}; 