const folderRepository = require('../repositories/folder.repository');
const fileRepository = require('../repositories/file.repository');
const minioService = require('./minio.service');
const { AppError, NotFoundError } = require('../utils/errors');

class FolderService {
  /**
   * 創建文件夾
   */
  async createFolder(name, parentId) {
    // 業務驗證：如果有父文件夾，檢查是否存在
    if (parentId && parentId !== 'root') {
      const parent = await folderRepository.findById(parentId);
      if (!parent) {
        throw new NotFoundError('Folder', parentId);
      }
    }

    const data = {
      name,
      parentId: parentId === 'root' ? null : parentId,
    };

    return await folderRepository.create(data);
  }

  /**
   * 獲取文件夾內容（包含子文件夾和文件）
   */
  async getFolderContent(folderId) {
    const parentId = folderId === 'root' ? null : folderId;

    // 如果不是根目錄，檢查文件夾是否存在
    if (parentId) {
      const folder = await folderRepository.findById(parentId);
      if (!folder) {
        throw new NotFoundError('Folder', parentId);
      }
    }

    // 並行查詢子文件夾和文件
    const [folders, files] = await Promise.all([
      folderRepository.findByParentId(parentId),
      fileRepository.findByFolderId(parentId),
    ]);

    // 格式化返回數據
    return [
      ...folders.map(f => ({ ...f, type: 'folder' })),
      ...files.map(f => ({ ...f, type: 'file', mimeType: f.type })),
    ];
  }

  /**
   * 刪除文件夾（遞歸刪除子文件夾和文件）
   */
  async deleteFolder(folderId) {
    if (folderId === 'root') {
      throw new AppError(400, 'CANNOT_DELETE_ROOT', '無法刪除根目錄');
    }

    // 檢查文件夾是否存在
    const folder = await folderRepository.findById(folderId);
    if (!folder) {
      throw new NotFoundError('Folder', folderId);
    }

    // 使用 BFS 收集所有子文件夾 ID
    const folderIds = await this._collectDescendantFolderIds(folderId);

    // 查找所有需要刪除的文件
    const files = await fileRepository.findByFolderIds(folderIds);

    // 刪除 MinIO 中的文件
    for (const file of files) {
      if (file.url) {
        await minioService.deleteFileObjects(file);
      }
    }

    // 刪除數據庫記錄（文件 → 文件夾）
    await fileRepository.deleteByFolderIds(folderIds);
    await folderRepository.deleteMany(folderIds);

    return {
      deletedFolders: folderIds.length,
      deletedFiles: files.length,
    };
  }

  /**
   * 私有方法：使用 BFS 收集所有後代文件夾 ID
   */
  async _collectDescendantFolderIds(rootId) {
    const folderIds = [rootId];
    let frontier = [rootId];

    while (frontier.length > 0) {
      const children = await folderRepository.findChildrenByParentIds(frontier);
      const childIds = children.map(c => c.id);

      if (childIds.length === 0) break;

      folderIds.push(...childIds);
      frontier = childIds;
    }

    return folderIds;
  }
}

module.exports = new FolderService();
