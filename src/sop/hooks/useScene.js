/**
 * useScene - 场景管理 Hook
 * 从 SOPWorkbench.jsx 迁移的场景相关状态和操作
 */
import { useState, useCallback } from 'react';

/**
 * 场景管理 Hook
 * @param {object} options - 配置选项
 * @param {Function} options.showToast - Toast 提示函数
 * @param {Function} options.api - API 调用函数
 * @returns {object} 场景状态和操作函数
 */
export const useScene = ({ showToast, api } = {}) => {
  // ========== 场景状态 ==========
  const [scene, setScene] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // ========== 场景操作 ==========
  
  /**
   * 加载场景
   */
  const loadScene = useCallback(async (sceneId) => {
    if (!api || !sceneId) return null;
    setLoading(true);
    try {
      const data = await api(`/api/scene/${sceneId}`);
      const sceneData = data?.scene || null;
      if (sceneData) {
        setScene(sceneData);
      }
      return sceneData;
    } catch (e) {
      console.error('[useScene] 加载场景失败', e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  /**
   * 刷新当前场景
   */
  const refreshScene = useCallback(async () => {
    if (!scene?.id) return null;
    return loadScene(scene.id);
  }, [scene?.id, loadScene]);
  
  /**
   * 创建新场景
   */
  const createScene = useCallback(async (docIds = []) => {
    if (!api) return null;
    setLoading(true);
    try {
      const res = await api('/api/scene', {
        method: 'POST',
        body: { docIds }
      });
      const newScene = res?.scene || null;
      if (newScene) {
        setScene(newScene);
      }
      return newScene;
    } catch (e) {
      console.error('[useScene] 创建场景失败', e);
      showToast?.('创建场景失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);
  
  /**
   * 更新场景
   */
  const updateScene = useCallback(async (updates) => {
    if (!api || !scene?.id) return false;
    try {
      const res = await api(`/api/scene/${scene.id}`, {
        method: 'PATCH',
        body: updates
      });
      if (res?.scene) {
        setScene(res.scene);
        return true;
      }
      return false;
    } catch (e) {
      console.error('[useScene] 更新场景失败', e);
      return false;
    }
  }, [api, scene?.id]);
  
  /**
   * 更新场景的文档列表
   */
  const updateSceneDocIds = useCallback(async (docIds) => {
    return updateScene({ docIds });
  }, [updateScene]);
  
  /**
   * 更新场景的 sectionDocLinks
   */
  const updateSectionDocLinks = useCallback(async (sectionDocLinks) => {
    return updateScene({ sectionDocLinks });
  }, [updateScene]);
  
  /**
   * 应用模板到场景
   */
  const applyTemplate = useCallback(async (template) => {
    if (!api || !scene?.id) return null;
    try {
      const res = await api(`/api/scene/${scene.id}/apply-template`, {
        method: 'POST',
        body: { template }
      });
      if (res?.template) {
        // 返回应用后的模板
        return res.template;
      }
      return null;
    } catch (e) {
      console.error('[useScene] 应用模板失败', e);
      showToast?.('应用模板失败');
      return null;
    }
  }, [api, scene?.id, showToast]);
  
  /**
   * 获取场景的关联文档
   */
  const getSceneDocLinks = useCallback(() => {
    return scene?.sectionDocLinks || {};
  }, [scene]);
  
  /**
   * 获取某个 section 的关联文档 IDs
   */
  const getSectionDocIds = useCallback((sectionId) => {
    return scene?.sectionDocLinks?.[sectionId] || [];
  }, [scene]);
  
  return {
    // 状态
    scene,
    setScene,
    loading,
    
    // 场景操作
    loadScene,
    refreshScene,
    createScene,
    updateScene,
    updateSceneDocIds,
    updateSectionDocLinks,
    applyTemplate,
    
    // 查询操作
    getSceneDocLinks,
    getSectionDocIds,
  };
};

export default useScene;
