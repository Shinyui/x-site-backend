const { prisma } = require('../config/prisma');

class FolderRepository {
  /**
   * 創建文件夾
   */
  async create(data) {
    return await prisma.folder.create({ data });
  }

  /**
   * 根據 ID 查找文件夾
   */
  async findById(id) {
    return await prisma.folder.findUnique({
      where: { id },
    });
  }

  /**
   * 查找子文件夾
   */
  async findByParentId(parentId) {
    return await prisma.folder.findMany({
      where: { parentId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 根據父文件夾 ID 列表查找所有子文件夾
   */
  async findChildrenByParentIds(parentIds) {
    return await prisma.folder.findMany({
      where: { parentId: { in: parentIds } },
      select: { id: true },
    });
  }

  /**
   * 批量刪除文件夾
   */
  async deleteMany(folderIds) {
    return await prisma.folder.deleteMany({
      where: { id: { in: folderIds } },
    });
  }
}

module.exports = new FolderRepository();
