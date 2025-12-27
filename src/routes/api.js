const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const fileController = require('../controllers/fileController');
const { validate, validateMultiple } = require('../middleware/validate');

// 導入驗證模式
const {
  createFolderSchema,
  folderIdSchema,
} = require('../validators/folder.validator');

const {
  initUploadSchema,
  updateStatusParamsSchema,
  updateStatusBodySchema,
  deleteFileSchema,
} = require('../validators/file.validator');

// ==================== Folder Routes ====================
router.post(
  '/folders',
  validate(createFolderSchema, 'body'),
  folderController.createFolder
);

router.get(
  '/folders/:id/content',
  validate(folderIdSchema, 'params'),
  folderController.getFolderContent
);

router.delete(
  '/folders/:id',
  validate(folderIdSchema, 'params'),
  folderController.deleteFolder
);

// ==================== File Routes ====================
router.post(
  '/files/init',
  validate(initUploadSchema, 'body'),
  fileController.initUpload
);

router.patch(
  '/files/:id/status',
  validateMultiple({
    params: updateStatusParamsSchema,
    body: updateStatusBodySchema,
  }),
  fileController.updateStatus
);

router.delete(
  '/files/:id',
  validate(deleteFileSchema, 'params'),
  fileController.deleteFile
);

module.exports = router;
