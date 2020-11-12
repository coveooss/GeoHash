module.exports = class CoveoError extends Error {
  constructor(detail, ...params) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CoveoError);
    }

    this.name = 'CoveoError';
    this.detail = detail; // err from a request
  }
};
