const { prisma } = require('../config/prisma');

class FileRepository {
  /**
   * 創建文件記錄
   */
  async create(data) {
    return await prisma.file.create({ data });
  }

  /**
   * 根據 ID 查找文件
   */
  async findById(id) {
    return await prisma.file.findUnique({
      where: { id },
    });
  }

  /**
   * 根據文件夾 ID 查找文件
   */
  async findByFolderId(folderId) {
    return await prisma.file.findMany({
      where: { folderId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 根據文件夾 ID 列表查找文件
   */
  async findByFolderIds(folderIds) {
    return await prisma.file.findMany({
      where: { folderId: { in: folderIds } },
      select: { id: true, url: true, name: true },
    });
  }

  /**
   * 更新文件
   */
  async update(id, data) {
    return await prisma.file.update({
      where: { id },
      data,
    });
  }

  /**
   * 刪除文件
   */
  async delete(id) {
    return await prisma.file.delete({
      where: { id },
    });
  }

  /**
   * 批量刪除文件
   */
  async deleteByFolderIds(folderIds) {
    return await prisma.file.deleteMany({
      where: { folderId: { in: folderIds } },
    });
  }
}

module.exports = new FileRepository();
