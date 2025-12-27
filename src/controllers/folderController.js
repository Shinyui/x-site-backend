const folderService = require('../services/folder.service');
const { asyncHandler } = require('../middleware/errorHandler');

class FolderController {
  /**
   * 創建文件夾
   */
  createFolder = asyncHandler(async (req, res) => {
    const { name, parentId } = req.body;
    const folder = await folderService.createFolder(name, parentId);
    res.json(folder);
  });

  /**
   * 獲取文件夾內容
   */
  getFolderContent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const content = await folderService.getFolderContent(id);
    res.json(content);
  });

  /**
   * 刪除文件夾
   */
  deleteFolder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await folderService.deleteFolder(id);
    res.json({ ok: true, ...result });
  });
}

module.exports = new FolderController();
