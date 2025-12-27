const Joi = require('joi');

// 允許的 MIME 類型
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
];

// 最大文件大小 (5GB)
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

/**
 * 初始化上傳驗證
 */
const initUploadSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255)
    .trim()
    .pattern(/^[^<>:"/\\|?*]+$/)
    .required()
    .messages({
      'string.empty': '文件名稱不能為空',
      'string.pattern.base': '文件名稱包含非法字符',
    }),

  size: Joi.number()
    .integer()
    .min(0)
    .max(MAX_FILE_SIZE)
    .required()
    .messages({
      'number.base': '文件大小必須是數字',
      'number.max': `文件大小不能超過 ${MAX_FILE_SIZE / 1024 / 1024 / 1024}GB`,
    }),

  type: Joi.string()
    .valid(...ALLOWED_MIME_TYPES)
    .required()
    .messages({
      'any.only': '不支持的文件類型',
    }),

  folderId: Joi.alternatives()
    .try(
      Joi.string().uuid(),
      Joi.string().valid('root'),
      Joi.allow(null)
    )
    .optional(),
});

/**
 * 更新文件狀態驗證 - params
 */
const updateStatusParamsSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

/**
 * 更新文件狀態驗證 - body
 */
const updateStatusBodySchema = Joi.object({
  status: Joi.string()
    .valid('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')
    .required(),

  url: Joi.string()
    .uri()
    .when('status', {
      is: 'COMPLETED',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      'any.required': '完成狀態必須提供 URL',
    }),
});

/**
 * 刪除文件驗證
 */
const deleteFileSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

module.exports = {
  initUploadSchema,
  updateStatusParamsSchema,
  updateStatusBodySchema,
  deleteFileSchema,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};
