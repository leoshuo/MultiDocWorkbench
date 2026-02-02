/**
 * useModals - 弹窗状态管理 Hook
 * 从 SOPWorkbench.jsx 迁移的弹窗相关状态和操作
 */
import { useState, useCallback } from 'react';

/**
 * 弹窗状态管理 Hook
 * @returns {object} 弹窗状态和操作函数
 */
export const useModals = () => {
  // ========== 弹窗状态 ==========
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDocPreviewModal, setShowDocPreviewModal] = useState(false);
  const [showDepositConfirmModal, setShowDepositConfirmModal] = useState(false);
  const [showUpdateGroupModal, setShowUpdateGroupModal] = useState(false);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showAssignCategoryModal, setShowAssignCategoryModal] = useState(false);
  
  // ========== 弹窗数据 ==========
  const [depositConfirmData, setDepositConfirmData] = useState(null);
  const [updateGroupSelectedIds, setUpdateGroupSelectedIds] = useState([]);
  const [newCategoryData, setNewCategoryData] = useState({ name: '', level: 1, parentId: null });
  const [assignCategoryTargetId, setAssignCategoryTargetId] = useState(null);
  
  // ========== 弹窗操作 ==========
  
  /**
   * 打开历史大纲弹窗
   */
  const openHistoryModal = useCallback(() => {
    setShowHistoryModal(true);
  }, []);
  
  /**
   * 关闭历史大纲弹窗
   */
  const closeHistoryModal = useCallback(() => {
    setShowHistoryModal(false);
  }, []);
  
  /**
   * 打开文档预览弹窗
   */
  const openDocPreviewModal = useCallback(() => {
    setShowDocPreviewModal(true);
  }, []);
  
  /**
   * 关闭文档预览弹窗
   */
  const closeDocPreviewModal = useCallback(() => {
    setShowDocPreviewModal(false);
  }, []);
  
  /**
   * 打开沉淀确认弹窗
   */
  const openDepositConfirmModal = useCallback((data) => {
    setDepositConfirmData(data);
    setShowDepositConfirmModal(true);
  }, []);
  
  /**
   * 关闭沉淀确认弹窗
   */
  const closeDepositConfirmModal = useCallback(() => {
    setShowDepositConfirmModal(false);
    setDepositConfirmData(null);
  }, []);
  
  /**
   * 打开更新沉淀集弹窗
   */
  const openUpdateGroupModal = useCallback((selectedIds = []) => {
    setUpdateGroupSelectedIds(selectedIds);
    setShowUpdateGroupModal(true);
  }, []);
  
  /**
   * 关闭更新沉淀集弹窗
   */
  const closeUpdateGroupModal = useCallback(() => {
    setShowUpdateGroupModal(false);
    setUpdateGroupSelectedIds([]);
  }, []);
  
  /**
   * 打开新建归类弹窗
   */
  const openNewCategoryModal = useCallback(() => {
    setNewCategoryData({ name: '', level: 1, parentId: null });
    setShowNewCategoryModal(true);
  }, []);
  
  /**
   * 关闭新建归类弹窗
   */
  const closeNewCategoryModal = useCallback(() => {
    setShowNewCategoryModal(false);
    setNewCategoryData({ name: '', level: 1, parentId: null });
  }, []);
  
  /**
   * 打开沉淀归类弹窗
   */
  const openAssignCategoryModal = useCallback(() => {
    setAssignCategoryTargetId(null);
    setShowAssignCategoryModal(true);
  }, []);
  
  /**
   * 关闭沉淀归类弹窗
   */
  const closeAssignCategoryModal = useCallback(() => {
    setShowAssignCategoryModal(false);
    setAssignCategoryTargetId(null);
  }, []);
  
  /**
   * 关闭所有弹窗
   */
  const closeAllModals = useCallback(() => {
    setShowHistoryModal(false);
    setShowDocPreviewModal(false);
    setShowDepositConfirmModal(false);
    setShowUpdateGroupModal(false);
    setShowNewCategoryModal(false);
    setShowAssignCategoryModal(false);
    setDepositConfirmData(null);
    setUpdateGroupSelectedIds([]);
    setNewCategoryData({ name: '', level: 1, parentId: null });
    setAssignCategoryTargetId(null);
  }, []);
  
  return {
    // 历史弹窗
    showHistoryModal,
    setShowHistoryModal,
    openHistoryModal,
    closeHistoryModal,
    
    // 文档预览弹窗
    showDocPreviewModal,
    setShowDocPreviewModal,
    openDocPreviewModal,
    closeDocPreviewModal,
    
    // 沉淀确认弹窗
    showDepositConfirmModal,
    setShowDepositConfirmModal,
    depositConfirmData,
    setDepositConfirmData,
    openDepositConfirmModal,
    closeDepositConfirmModal,
    
    // 更新沉淀集弹窗
    showUpdateGroupModal,
    setShowUpdateGroupModal,
    updateGroupSelectedIds,
    setUpdateGroupSelectedIds,
    openUpdateGroupModal,
    closeUpdateGroupModal,
    
    // 新建归类弹窗
    showNewCategoryModal,
    setShowNewCategoryModal,
    newCategoryData,
    setNewCategoryData,
    openNewCategoryModal,
    closeNewCategoryModal,
    
    // 沉淀归类弹窗
    showAssignCategoryModal,
    setShowAssignCategoryModal,
    assignCategoryTargetId,
    setAssignCategoryTargetId,
    openAssignCategoryModal,
    closeAssignCategoryModal,
    
    // 通用操作
    closeAllModals,
  };
};

export default useModals;
