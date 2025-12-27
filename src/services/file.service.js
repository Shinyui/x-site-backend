const fileRepository = require('../repositories/file.repository');
const minioService = require('./minio.service');
const { NotFoundError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

class FileService {
  /**
   * 初始化文件上傳
   */
  async initUpload(name, size, type, folderId) {
    // 創建數據庫記錄
    const file = await fileRepository.create({
      name,
      size,
      type,
      folderId: folderId === 'root' ? null : folderId,
      status: 'PENDING',
    });

    logger.info('File upload initialized', {
      fileId: file.id,
      name: file.name,
      size: file.size,
    });

    return {
      fileId: file.id,
      ...file,
    };
  }

  /**
   * 更新文件狀態（由視頻服務調用）
   */
  async updateStatus(fileId, status, url) {
    const file = await fileRepository.findById(fileId);
    if (!file) {
      throw new NotFoundError('File', fileId);
    }

    const updated = await fileRepository.update(fileId, {
      status,
      url,
    });

    logger.info('File status updated', {
      fileId,
      status,
      hasUrl: !!url,
    });

    return updated;
  }

  /**
   * 刪除文件
   */
  async deleteFile(fileId) {
    const file = await fileRepository.findById(fileId);
    if (!file) {
      throw new NotFoundError('File', fileId);
    }

    // 刪除 MinIO 中的文件
    if (file.url) {
      try {
        const result = await minioService.deleteFileObjects(file);
        logger.info('MinIO objects deleted', {
          fileId,
          ...result,
        });
      } catch (error) {
        logger.error('Failed to delete MinIO objects', {
          fileId,
          error: error.message,
        });
        throw new AppError(
          500,
          'MINIO_DELETE_FAILED',
          '刪除對象存儲文件失敗',
          { fileId, originalError: error.message }
        );
      }
    }

    // 刪除數據庫記錄
    await fileRepository.delete(fileId);

    logger.info('File deleted successfully', { fileId });
    return { ok: true };
  }
}

module.exports = new FileService();
