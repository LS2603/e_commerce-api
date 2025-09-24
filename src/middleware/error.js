const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const notFound = (req, res, _next) => {
  res.status(404).json({ error: 'Route not found' });
};

const errorHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
};

module.exports = { asyncHandler, notFound, errorHandler };
