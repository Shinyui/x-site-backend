const Joi = require('joi');

/**
 * 創建文件夾驗證
 */
const createFolderSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255)
    .trim()
    .pattern(/^[^<>:"/\\|?*]+$/)  // 禁止文件系統特殊字符
    .required()
    .messages({
      'string.empty': '文件夾名稱不能為空',
      'string.max': '文件夾名稱不能超過 255 個字符',
      'string.pattern.base': '文件夾名稱包含非法字符',
    }),

  parentId: Joi.alternatives()
    .try(
      Joi.string().uuid(),
      Joi.string().valid('root'),
      Joi.allow(null)
    )
    .optional()
    .messages({
      'string.guid': '父文件夾 ID 格式錯誤',
    }),
});

/**
 * 文件夾 ID 驗證
 */
const folderIdSchema = Joi.object({
  id: Joi.alternatives()
    .try(
      Joi.string().uuid(),
      Joi.string().valid('root')
    )
    .required()
    .messages({
      'any.required': '文件夾 ID 不能為空',
      'string.guid': '文件夾 ID 格式錯誤',
    }),
});

module.exports = {
  createFolderSchema,
  folderIdSchema,
};
