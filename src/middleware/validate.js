const { AppError } = require('../utils/errors');

/**
 * 通用驗證中間件工廠
 * @param {Joi.Schema} schema - Joi 驗證模式
 * @param {string} source - 驗證來源 ('body' | 'params' | 'query')
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false, // 返回所有錯誤
      stripUnknown: true, // 移除未定義的屬性
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new AppError(400, 'VALIDATION_ERROR', '輸入驗證失敗', details);
    }

    // 用驗證後的值替換原始值
    req[source] = value;
    next();
  };
}

/**
 * 複合驗證（同時驗證多個來源）
 */
function validateMultiple(schemas) {
  return (req, res, next) => {
    const errors = [];

    for (const [source, schema] of Object.entries(schemas)) {
      const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        errors.push(...error.details.map(detail => ({
          source,
          field: detail.path.join('.'),
          message: detail.message,
        })));
      } else {
        req[source] = value;
      }
    }

    if (errors.length > 0) {
      throw new AppError(400, 'VALIDATION_ERROR', '輸入驗證失敗', errors);
    }

    next();
  };
}

module.exports = {
  validate,
  validateMultiple,
};
