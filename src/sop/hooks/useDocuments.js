/**
 * useDocuments - 文档管理 Hook
 * 从 SOPWorkbench.jsx 迁移的文档相关状态和操作
 */
import { useState, useCallback } from 'react';

/**
 * 文档管理 Hook
 * @param {object} options - 配置选项
 * @param {Function} options.showToast - Toast 提示函数
 * @param {Function} options.api - API 调用函数
 * @returns {object} 文档状态和操作函数
 */
export const useDocuments = ({ showToast, api } = {}) => {
  // ========== 文档状态 ==========
  const [docs, setDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [docDraft, setDocDraft] = useState('');
  const [loading, setLoading] = useState(false);
  
  // ========== 文档操作 ==========
  
  /**
   * 刷新文档列表
   */
  const refreshDocs = useCallback(async () => {
    if (!api) return [];
    setLoading(true);
    try {
      const data = await api('/api/docs');
      const list = Array.isArray(data) ? data : [];
      setDocs(list);
      return list;
    } catch (e) {
      console.error('[useDocuments] 刷新文档失败', e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  /**
   * 选择文档
   */
  const selectDoc = useCallback((docId) => {
    setSelectedDocId(docId);
    const doc = docs.find(d => d.id === docId);
    setDocDraft(doc?.content || '');
  }, [docs]);
  
  /**
   * 清除选择
   */
  const clearSelection = useCallback(() => {
    setSelectedDocId(null);
    setDocDraft('');
  }, []);
  
  /**
   * 获取当前选中的文档
   */
  const getSelectedDoc = useCallback(() => {
    return docs.find(d => d.id === selectedDocId) || null;
  }, [docs, selectedDocId]);
  
  /**
   * 按 ID 查找文档
   */
  const findDocById = useCallback((docId) => {
    return docs.find(d => d.id === docId) || null;
  }, [docs]);
  
  /**
   * 按名称查找文档
   */
  const findDocByName = useCallback((name) => {
    if (!name) return null;
    // 精确匹配
    const exact = docs.find(d => d.name === name);
    if (exact) return exact;
    // 模糊匹配
    const lower = name.toLowerCase();
    return docs.find(d => 
      d.name.toLowerCase().includes(lower) || 
      lower.includes(d.name.toLowerCase())
    ) || null;
  }, [docs]);
  
  /**
   * 添加文档到列表（前端状态）
   */
  const addDocToList = useCallback((doc) => {
    if (!doc?.id) return;
    setDocs(prev => {
      // 去重，保留最新
      const filtered = prev.filter(d => d.id !== doc.id);
      return [doc, ...filtered];
    });
  }, []);
  
  /**
   * 从列表移除文档（前端状态）
   */
  const removeDocFromList = useCallback((docId) => {
    setDocs(prev => prev.filter(d => d.id !== docId));
    if (selectedDocId === docId) {
      setSelectedDocId(null);
      setDocDraft('');
    }
  }, [selectedDocId]);
  
  /**
   * 更新文档内容（前端状态）
   */
  const updateDocInList = useCallback((docId, updates) => {
    setDocs(prev => prev.map(d => 
      d.id === docId ? { ...d, ...updates } : d
    ));
  }, []);
  
  /**
   * 保存文档草稿到服务端
   */
  const saveDocDraft = useCallback(async () => {
    if (!api || !selectedDocId) return false;
    try {
      await api(`/api/docs/${selectedDocId}`, {
        method: 'PATCH',
        body: { content: docDraft }
      });
      updateDocInList(selectedDocId, { content: docDraft });
      showToast?.('文档已保存');
      return true;
    } catch (e) {
      console.error('[useDocuments] 保存文档失败', e);
      showToast?.('保存文档失败');
      return false;
    }
  }, [api, selectedDocId, docDraft, updateDocInList, showToast]);
  
  /**
   * 创建新文档
   */
  const createDoc = useCallback(async (name, content) => {
    if (!api) return null;
    try {
      const res = await api('/api/docs', {
        method: 'POST',
        body: { name, content }
      });
      if (res?.doc) {
        addDocToList(res.doc);
        return res.doc;
      }
      return null;
    } catch (e) {
      console.error('[useDocuments] 创建文档失败', e);
      showToast?.('创建文档失败');
      return null;
    }
  }, [api, addDocToList, showToast]);
  
  /**
   * 删除文档
   */
  const deleteDoc = useCallback(async (docId) => {
    if (!api || !docId) return false;
    try {
      await api(`/api/docs/${docId}`, { method: 'DELETE' });
      removeDocFromList(docId);
      showToast?.('文档已删除');
      return true;
    } catch (e) {
      console.error('[useDocuments] 删除文档失败', e);
      showToast?.('删除文档失败');
      return false;
    }
  }, [api, removeDocFromList, showToast]);
  
  return {
    // 状态
    docs,
    setDocs,
    selectedDocId,
    setSelectedDocId,
    docDraft,
    setDocDraft,
    loading,
    
    // 文档操作
    refreshDocs,
    selectDoc,
    clearSelection,
    getSelectedDoc,
    findDocById,
    findDocByName,
    
    // 列表操作
    addDocToList,
    removeDocFromList,
    updateDocInList,
    
    // 持久化操作
    saveDocDraft,
    createDoc,
    deleteDoc,
  };
};

export default useDocuments;
