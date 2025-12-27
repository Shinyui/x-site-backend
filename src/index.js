const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./config/prisma');
const requestIdMiddleware = require('./middleware/requestId');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 4000;

// 中間件順序很重要！
app.use(requestIdMiddleware);           // 1. 添加 Request ID
app.use(cors({ origin: '*' }));
app.use(express.json());

// 請求日誌
app.use((req, res, next) => {
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// 路由
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'x-site-backend is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 錯誤處理必須在最後
app.use(notFoundHandler);               // 2. 404 處理
app.use(errorHandler);                  // 3. 全局錯誤處理

app.listen(PORT, () => {
  connectDatabase();
  logger.info(`Backend running on port ${PORT}`);
});

module.exports = app;
