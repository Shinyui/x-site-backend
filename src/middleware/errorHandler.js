const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * 錯誤響應格式化
 */
function formatErrorResponse(error, requestId) {
  const isDevelopment = config.server.nodeEnv === 'development';

  const response = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
      requestId,
    },
    timestamp: new Date().toISOString(),
  };

  // 開發環境返回詳細信息
  if (isDevelopment) {
    response.error.stack = error.stack;
    if (error.details) {
      response.error.details = error.details;
    }
  }

  return response;
}

/**
 * 處理 Prisma 特定錯誤
 */
function handlePrismaError(err) {
  const errorMap = {
    P2002: 409, // Unique constraint violation
    P2025: 404, // Record not found
    P2003: 400, // Foreign key constraint failed
    P2014: 400, // Invalid relation
  };

  return errorMap[err.code] || 500;
}

/**
 * 全局錯誤處理中間件
 */
function errorHandler(err, req, res, next) {
  const requestId = req.id || 'unknown';

  // 默認錯誤狀態碼
  let statusCode = err.statusCode || 500;

  // 處理 Prisma 錯誤
  if (err.code && err.code.startsWith('P')) {
    statusCode = handlePrismaError(err);
  }

  // 處理 Joi 驗證錯誤
  if (err.name === 'ValidationError' && err.isJoi) {
    statusCode = 400;
    err.code = 'VALIDATION_ERROR';
  }

  // 記錄錯誤
  if (statusCode >= 500) {
    logger.error('Server error', {
      requestId,
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn('Client error', {
      requestId,
      error: err.message,
      path: req.path,
      method: req.method,
    });
  }

  // 返回錯誤響應
  res.status(statusCode).json(formatErrorResponse(err, requestId));
}

/**
 * 404 處理器
 */
function notFoundHandler(req, res) {
  const requestId = req.id || 'unknown';
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * 異步路由包裝器（避免 try-catch 重複代碼）
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
