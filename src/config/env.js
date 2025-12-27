const dotenv = require('dotenv');
const path = require('path');

// 根據環境加載對應的 .env 文件
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.local';

const envPath = path.resolve(__dirname, '../../', envFile);

// 嘗試加載環境文件，如果不存在則使用默認 .env
const result = dotenv.config({ path: envPath });
if (result.error) {
  // 回退到 .env
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

// 必需的環境變量列表
const requiredEnvVars = [
  'DATABASE_URL',
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_BUCKET',
];

/**
 * 驗證環境變量
 */
function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n` +
      `Please check your ${envFile} file.`
    );
  }
}

validateEnv();

/**
 * 導出類型安全的配置對象
 */
module.exports = {
  database: {
    url: process.env.DATABASE_URL,
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT,
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucket: process.env.MINIO_BUCKET,
  },
  server: {
    port: parseInt(process.env.PORT || '4000'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
};
