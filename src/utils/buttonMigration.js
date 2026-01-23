/**
 * 按钮配置迁移工具
 * 将面板相对坐标的按钮配置迁移到全局坐标系统
 */

/**
 * 迁移按钮配置从旧格式到新格式
 * @param {Object} oldConfig - 旧格式: { panelId: [buttons] }
 * @param {Object} panelPositions - 面板位置信息
 * @returns {Object} - 新格式: { activeButtons: [], deletedButtons: [] }
 */
export function migrateButtonConfig(oldConfig, panelPositions) {
    if (!oldConfig || typeof oldConfig !== 'object') {
        return { activeButtons: [], deletedButtons: [] };
    }

    // 检查是否已经是新格式
    if (oldConfig.activeButtons && Array.isArray(oldConfig.activeButtons)) {
        console.log('[Migration] Config is already in new format');
        return oldConfig;
    }

    console.log('[Migration] Starting button config migration...');
    const activeButtons = [];
    let buttonIdCounter = 0;

    // 遍历所有面板的按钮
    Object.keys(oldConfig).forEach(panelId => {
        const panelButtons = oldConfig[panelId];
        if (!Array.isArray(panelButtons)) return;

        // 获取面板位置
        const panel = panelPositions?.[panelId];
        const panelX = panel?.left || 0;
        const panelY = panel?.top || 0;

        console.log(`[Migration] Processing panel ${panelId}, position: (${panelX}, ${panelY})`);

        // 转换每个按钮
        panelButtons.forEach(button => {
            // 计算全局坐标
            const globalX = panelX + (button.left || 0);
            const globalY = panelY + (button.top || 0);

            // 创建新格式的按钮
            const migratedButton = {
                id: button.id || `global-btn-${++buttonIdCounter}`,
                label: button.label || '按钮',
                x: globalX,
                y: globalY,
                width: button.width || 100,
                height: button.height || 30,
                style: button.style || {},
                onClick: button.onClick || null,
                enabled: button.enabled !== undefined ? button.enabled : true,
                zIndex: 10,
                // 保留原始信息用于调试
                _migrated: {
                    from: panelId,
                    originalLeft: button.left,
                    originalTop: button.top
                }
            };

            activeButtons.push(migratedButton);
            console.log(`[Migration] Migrated button ${migratedButton.id}: (${button.left}, ${button.top}) -> (${globalX}, ${globalY})`);
        });
    });

    console.log(`[Migration] Migration complete. Total buttons: ${activeButtons.length}`);

    return {
        activeButtons,
        deletedButtons: [],
        migratedAt: Date.now(),
        version: '2.0'
    };
}

/**
 * 保存备份配置
 * @param {Object} config - 要备份的配置
 * @param {string} key - localStorage 键名
 */
export function backupConfig(config, key = 'app-button-config') {
    try {
        const backupKey = `${key}-backup-${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(config));
        console.log(`[Backup] Config backed up to ${backupKey}`);
        return backupKey;
    } catch (error) {
        console.error('[Backup] Failed to backup config:', error);
        return null;
    }
}

/**
 * 从备份恢复配置
 * @param {string} backupKey - 备份键名
 * @returns {Object|null} - 恢复的配置或null
 */
export function restoreFromBackup(backupKey) {
    try {
        const backupData = localStorage.getItem(backupKey);
        if (!backupData) {
            console.warn(`[Restore] No backup found for key: ${backupKey}`);
            return null;
        }
        const config = JSON.parse(backupData);
        console.log(`[Restore] Config restored from ${backupKey}`);
        return config;
    } catch (error) {
        console.error('[Restore] Failed to restore from backup:', error);
        return null;
    }
}

/**
 * 获取所有备份键
 * @param {string} baseKey - 基础键名
 * @returns {string[]} - 备份键数组
 */
export function listBackups(baseKey = 'app-button-config') {
    const backups = [];
    const prefix = `${baseKey}-backup-`;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            backups.push(key);
        }
    }

    return backups.sort().reverse(); // 最新的在前
}

/**
 * 清理旧备份（保留最新的N个）
 * @param {string} baseKey - 基础键名
 * @param {number} keepCount - 保留数量
 */
export function cleanOldBackups(baseKey = 'app-button-config', keepCount = 5) {
    const backups = listBackups(baseKey);
    const toDelete = backups.slice(keepCount);

    toDelete.forEach(key => {
        localStorage.removeItem(key);
        console.log(`[Cleanup] Removed old backup: ${key}`);
    });

    if (toDelete.length > 0) {
        console.log(`[Cleanup] Cleaned ${toDelete.length} old backups`);
    }
}
