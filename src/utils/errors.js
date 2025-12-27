/**
 * 應用錯誤基類
 */
class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // 區分可預期錯誤 vs 程序錯誤
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 常用錯誤類型
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

class NotFoundError extends AppError {
  constructor(resource, id = null) {
    const message = id
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    super(404, 'NOT_FOUND', message);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

class ConflictError extends AppError {
  constructor(message, details = null) {
    super(409, 'CONFLICT', message, details);
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(500, 'INTERNAL_SERVER_ERROR', message);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
};
