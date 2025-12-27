const config = require('../config/env');

class Logger {
  constructor() {
    this.isDevelopment = config.server.nodeEnv === 'development';
  }

  _formatMessage(level, message, meta = {}) {
    const log = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    if (this.isDevelopment) {
      // 開發環境：美化輸出
      console.log(`[${log.timestamp}] [${level.toUpperCase()}] ${message}`);
      if (Object.keys(meta).length > 0) {
        console.log(JSON.stringify(meta, null, 2));
      }
    } else {
      // 生產環境：JSON 格式（便於日誌收集）
      console.log(JSON.stringify(log));
    }
  }

  info(message, meta = {}) {
    this._formatMessage('info', message, meta);
  }

  warn(message, meta = {}) {
    this._formatMessage('warn', message, meta);
  }

  error(message, meta = {}) {
    this._formatMessage('error', message, meta);
  }

  debug(message, meta = {}) {
    if (this.isDevelopment) {
      this._formatMessage('debug', message, meta);
    }
  }
}

module.exports = new Logger();
