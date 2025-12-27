const { v4: uuidv4 } = require('uuid');

/**
 * 為每個請求添加唯一 ID
 */
function requestIdMiddleware(req, res, next) {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}

module.exports = requestIdMiddleware;
