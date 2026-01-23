/**
 * 统一的配置管理工具
 * 为布局和按钮配置提供统一的存储、验证接口
 */

/**
 * 通用配置加载函数
 * @param {string} key - localStorage 键名
 * @param {*} defaultValue - 默认值
 * @param {Function} validator - 验证函数，可选
 * @returns {*} 配置值或默认值
 */
export function loadConfig(key, defaultValue, validator = null) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return defaultValue;

        const parsed = JSON.parse(raw);

        // 如果提供了验证函数，验证配置
        if (validator && typeof validator === 'function') {
            return validator(parsed) ? parsed : defaultValue;
        }

        return parsed;
    } catch (error) {
        console.warn(`[ConfigManager] 加载配置失败 (${key}):`, error);
        return defaultValue;
    }
}

/**
 * 通用配置保存函数
 * @param {string} key - localStorage 键名
 * @param {*} value - 要保存的值
 * @param {Function} validator - 验证函数，可选
 * @returns {boolean} 是否保存成功
 */
export function saveConfig(key, value, validator = null) {
    try {
        // 如果提供了验证函数，先验证
        if (validator && typeof validator === 'function' && !validator(value)) {
            console.warn(`[ConfigManager] 配置验证失败 (${key})`);
            return false;
        }

        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`[ConfigManager] 保存配置失败 (${key}):`, error);
        return false;
    }
}

/**
 * 删除配置
 * @param {string} key - localStorage 键名
 * @returns {boolean} 是否删除成功
 */
export function removeConfig(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`[ConfigManager] 删除配置失败 (${key}):`, error);
        return false;
    }
}

/**
 * 检查配置是否存在
 * @param {string} key - localStorage 键名
 * @returns {boolean}
 */
export function hasConfig(key) {
    try {
        return localStorage.getItem(key) !== null;
    } catch (error) {
        return false;
    }
}

/**
 * 创建配置验证器
 * @param {Function} validationFn - 验证逻辑函数
 * @returns {Function} 验证器函数
 */
export function createValidator(validationFn) {
    return (value) => {
        try {
            return validationFn(value);
        } catch (error) {
            console.error('[ConfigManager] 验证函数执行失败:', error);
            return false;
        }
    };
}

/**
 * 深度合并配置对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @returns {Object} 合并后的对象
 */
export function mergeConfig(target, source) {
    const result = { ...target };

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            if (
                source[key] &&
                typeof source[key] === 'object' &&
                !Array.isArray(source[key])
            ) {
                result[key] = mergeConfig(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
    }

    return result;
}

/**
 * 批量配置操作
 */
export const configBatch = {
    /**
     * 批量加载配置
     * @param {Object} configs - 配置映射 { key: { defaultValue, validator? } }
     * @returns {Object} 加载的配置对象
     */
    load(configs) {
        const result = {};
        for (const [key, { defaultValue, validator }] of Object.entries(configs)) {
            result[key] = loadConfig(key, defaultValue, validator);
        }
        return result;
    },

    /**
     * 批量保存配置
     * @param {Object} configs - 配置映射 { key: { value, validator? } }
     * @returns {Object} 保存结果 { key: success }
     */
    save(configs) {
        const result = {};
        for (const [key, { value, validator }] of Object.entries(configs)) {
            result[key] = saveConfig(key, value, validator);
        }
        return result;
    },

    /**
     * 批量删除配置
     * @param {string[]} keys - 要删除的键数组
     * @returns {Object} 删除结果 { key: success }
     */
    remove(keys) {
        const result = {};
        for (const key of keys) {
            result[key] = removeConfig(key);
        }
        return result;
    }
};

export default {
    loadConfig,
    saveConfig,
    removeConfig,
    hasConfig,
    createValidator,
    mergeConfig,
    configBatch
};
