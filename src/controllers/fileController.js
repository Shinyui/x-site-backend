const fileService = require('../services/file.service');
const { asyncHandler } = require('../middleware/errorHandler');

class FileController {
  /**
   * 初始化上傳
   */
  initUpload = asyncHandler(async (req, res) => {
    const { name, size, type, folderId } = req.body;
    const result = await fileService.initUpload(name, size, type, folderId);
    res.json(result);
  });

  /**
   * 更新文件狀態
   */
  updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, url } = req.body;
    const file = await fileService.updateStatus(id, status, url);
    res.json(file);
  });

  /**
   * 刪除文件
   */
  deleteFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await fileService.deleteFile(id);
    res.json(result);
  });
}

module.exports = new FileController();
