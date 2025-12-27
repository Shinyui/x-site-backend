const Minio = require('minio');
const config = require('../config/env');
const logger = require('../utils/logger');
const { InternalServerError } = require('../utils/errors');

class MinioService {
  constructor() {
    this.client = null;
    this.bucket = config.minio.bucket;
  }

  /**
   * 獲取 MinIO 客戶端（單例模式）
   */
  getClient() {
    if (this.client) {
      return this.client;
    }

    try {
      this.client = new Minio.Client({
        endPoint: config.minio.endpoint,
        port: config.minio.port,
        useSSL: config.minio.useSSL,
        accessKey: config.minio.accessKey,
        secretKey: config.minio.secretKey,
      });

      logger.info('MinIO client initialized', {
        endpoint: config.minio.endpoint,
        bucket: this.bucket,
      });

      return this.client;
    } catch (error) {
      logger.error('Failed to initialize MinIO client', { error: error.message });
      throw new InternalServerError('對象存儲服務初始化失敗');
    }
  }

  /**
   * 確保 Bucket 存在
   */
  async ensureBucket() {
    const client = this.getClient();

    try {
      const exists = await client.bucketExists(this.bucket);
      if (!exists) {
        await client.makeBucket(this.bucket, 'us-east-1');
        logger.info(`Bucket created: ${this.bucket}`);
      }
    } catch (error) {
      logger.error('Failed to ensure bucket exists', {
        bucket: this.bucket,
        error: error.message,
      });
      throw new InternalServerError('對象存儲桶檢查失敗');
    }
  }

  /**
   * 生成預簽名上傳 URL
   * @param {string} objectName - 對象名稱 (如 "file-id/video.mp4")
   * @param {number} expirySeconds - 過期時間（秒）
   */
  async getPresignedUploadUrl(objectName, expirySeconds = 3600) {
    const client = this.getClient();

    try {
      return await client.presignedPutObject(
        this.bucket,
        objectName,
        expirySeconds
      );
    } catch (error) {
      logger.error('Failed to generate presigned upload URL', {
        objectName,
        error: error.message,
      });
      throw new InternalServerError('生成上傳鏈接失敗');
    }
  }

  /**
   * 生成預簽名下載 URL
   */
  async getPresignedDownloadUrl(objectName, expirySeconds = 3600) {
    const client = this.getClient();

    try {
      return await client.presignedGetObject(
        this.bucket,
        objectName,
        expirySeconds
      );
    } catch (error) {
      logger.error('Failed to generate presigned download URL', {
        objectName,
        error: error.message,
      });
      throw new InternalServerError('生成下載鏈接失敗');
    }
  }

  /**
   * 列出指定前綴的所有對象
   */
  async listObjects(prefix) {
    const client = this.getClient();

    return new Promise((resolve, reject) => {
      const objects = [];
      const stream = client.listObjectsV2(this.bucket, prefix, true);

      stream.on('data', (obj) => {
        if (obj?.name) {
          objects.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
          });
        }
      });

      stream.on('error', (error) => {
        logger.error('Failed to list objects', { prefix, error: error.message });
        reject(new InternalServerError('列出對象失敗'));
      });

      stream.on('end', () => resolve(objects));
    });
  }

  /**
   * 批量刪除對象
   */
  async deleteObjects(objectNames) {
    if (!objectNames || objectNames.length === 0) {
      return { deleted: 0 };
    }

    const client = this.getClient();

    return new Promise((resolve, reject) => {
      client.removeObjects(this.bucket, objectNames, (error) => {
        if (error) {
          logger.error('Failed to delete objects', {
            count: objectNames.length,
            error: error.message,
          });
          return reject(new InternalServerError('批量刪除對象失敗'));
        }

        logger.info('Objects deleted successfully', {
          count: objectNames.length,
        });
        resolve({ deleted: objectNames.length });
      });
    });
  }

  /**
   * 刪除單個對象
   */
  async deleteObject(objectName) {
    const client = this.getClient();

    return new Promise((resolve, reject) => {
      client.removeObject(this.bucket, objectName, (error) => {
        if (error) {
          logger.error('Failed to delete object', {
            objectName,
            error: error.message,
          });
          return reject(new InternalServerError('刪除對象失敗'));
        }

        logger.info('Object deleted successfully', { objectName });
        resolve({ deleted: 1 });
      });
    });
  }

  /**
   * 根據文件記錄刪除對應的 MinIO 對象
   * @param {Object} fileRecord - 文件記錄 { id, url }
   */
  async deleteFileObjects(fileRecord) {
    const { bucket, key } = this._parseUrl(fileRecord.url);

    if (!key) {
      throw new InternalServerError('無法解析文件 URL');
    }

    const fileId = fileRecord.id;
    const firstSegment = key.split('/')[0];

    // 如果是目錄結構 (如 "file-id/index.m3u8")，刪除整個目錄
    const isDirectory = firstSegment === fileId && key.includes('/');

    if (isDirectory) {
      const prefix = `${firstSegment}/`;
      const objects = await this.listObjects(prefix);
      const objectNames = objects.map(obj => obj.name);

      if (objectNames.length > 0) {
        await this.deleteObjects(objectNames);
      }

      return { deleted: objectNames.length, type: 'directory', prefix };
    }

    // 單文件刪除
    await this.deleteObject(key);
    return { deleted: 1, type: 'file', key };
  }

  /**
   * 解析 MinIO URL
   * @private
   */
  _parseUrl(fileUrl) {
    const value = String(fileUrl || '').trim();
    if (!value) {
      return { bucket: '', key: '' };
    }

    let pathname = value;
    try {
      pathname = new URL(value).pathname;
    } catch {
      pathname = value;
    }

    // 移除前導斜線
    const normalized = pathname.replace(/^\/+/, '');
    const parts = normalized.split('/').filter(Boolean);

    if (parts.length < 2) {
      // 無法確定 bucket，使用默認值
      return { bucket: this.bucket, key: normalized };
    }

    // 格式: /bucket/path/to/file
    return {
      bucket: parts[0],
      key: parts.slice(1).join('/'),
    };
  }

  /**
   * 獲取對象元數據
   */
  async getObjectMetadata(objectName) {
    const client = this.getClient();

    try {
      return await client.statObject(this.bucket, objectName);
    } catch (error) {
      if (error.code === 'NotFound') {
        return null;
      }
      logger.error('Failed to get object metadata', {
        objectName,
        error: error.message,
      });
      throw new InternalServerError('獲取對象元數據失敗');
    }
  }
}

// 導出單例
module.exports = new MinioService();
