/**
 * useDeposits - 沉淀管理 Hook
 * 从 SOPWorkbench.jsx 迁移的沉淀相关状态和操作
 */
import { useState, useCallback, useEffect } from 'react';
import { 
  DEPOSITS_STORAGE_KEY, 
  DEPOSITS_SEQ_STORAGE_KEY,
  DEPOSIT_CATEGORIES_STORAGE_KEY,
  DEFAULT_SECTION_REQUIREMENTS,
  DEFAULT_PRECIPITATION_MODE
} from '../SOPConstants';
import {
  normalizeDepositGroup,
  reorderDepositList,
  moveDepositToIndex,
} from '../logic/documentOps';

/**
 * 从 localStorage 加载沉淀列表
 */
const loadDepositsFromStorage = () => {
  try {
    const raw = localStorage.getItem(DEPOSITS_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error('[useDeposits] 加载沉淀列表失败:', e);
    return [];
  }
};

/**
 * 从 localStorage 加载沉淀序列
 */
const loadDepositsSeqFromStorage = () => {
  try {
    const raw = localStorage.getItem(DEPOSITS_SEQ_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error('[useDeposits] 加载沉淀序列失败:', e);
    return [];
  }
};

/**
 * 从 localStorage 加载沉淀归类
 */
const loadDepositCategoriesFromStorage = () => {
  try {
    const raw = localStorage.getItem(DEPOSIT_CATEGORIES_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error('[useDeposits] 加载沉淀归类失败:', e);
    return [];
  }
};

/**
 * 沉淀管理 Hook
 * @param {object} options - 配置选项
 * @param {Function} options.showToast - Toast 提示函数
 * @param {Function} options.api - API 调用函数
 * @returns {object} 沉淀状态和操作函数
 */
export const useDeposits = ({ showToast, api } = {}) => {
  // ========== 核心状态 ==========
  const [deposits, setDeposits] = useState(() => loadDepositsFromStorage());
  const [depositSeq, setDepositSeq] = useState(() => loadDepositsSeqFromStorage());
  const [depositGroups, setDepositGroups] = useState([]);
  const [depositCategories, setDepositCategories] = useState(() => loadDepositCategoriesFromStorage());
  
  // ========== UI 状态 ==========
  const [selectedDepositIds, setSelectedDepositIds] = useState({});
  const [depositEditing, setDepositEditing] = useState({});
  const [expandedDepositSections, setExpandedDepositSections] = useState({});
  const [compilingDepositSections, setCompilingDepositSections] = useState({});
  const [draggingDepositId, setDraggingDepositId] = useState('');
  const [dragOverDepositId, setDragOverDepositId] = useState('');
  const [selectedDepositGroupId, setSelectedDepositGroupId] = useState('');
  const [depositGroupReplay, setDepositGroupReplay] = useState({});
  const [batchReplayRunning, setBatchReplayRunning] = useState(false);
  
  // ========== 持久化 ==========
  const persistDeposits = useCallback(async (list) => {
    try {
      // 本地存储
      localStorage.setItem(DEPOSITS_STORAGE_KEY, JSON.stringify(list || []));
      
      // 【关键修复】同步保存到服务端 - 批量更新所有沉淀
      // 注意：临时沉淀记录（如 dep_merge_* 合并方式设置）只保存在本地，不同步到服务器
      if (api && Array.isArray(list)) {
        // 过滤掉临时沉淀记录（以 dep_merge_ 开头的是合并方式设置，不需要服务端持久化）
        const persistableDeposits = list.filter(d => !d.id?.startsWith('dep_merge_'));
        
        // 使用 POST 批量保存（服务器端会处理更新或创建）
        for (const deposit of persistableDeposits) {
          try {
            await api(`/api/multi/precipitation/records/${deposit.id}`, {
              method: 'PUT',
              body: deposit
            });
          } catch (err) {
            // 如果是404（记录不存在），尝试创建
            if (err.message?.includes('404') || err.message?.includes('not found')) {
              await api('/api/multi/precipitation/records', {
                method: 'POST',
                body: deposit
              });
            }
          }
        }
        console.log('[useDeposits] 沉淀列表已同步到服务端，共', persistableDeposits.length, '个（跳过临时沉淀）');
      }
    } catch (e) {
      console.error('[useDeposits] 持久化沉淀列表失败:', e);
    }
  }, [api]);
  
  const persistDepositOrder = useCallback(async (list) => {
    try {
      const order = (list || []).map((d) => d.id);
      localStorage.setItem(DEPOSITS_SEQ_STORAGE_KEY, JSON.stringify(order));
      
      // 【新增】同步顺序到服务端
      if (api && order.length > 0) {
        await api('/api/multi/precipitation/records/order', {
          method: 'POST',
          body: { order }
        });
        console.log('[useDeposits] 沉淀顺序已同步到服务端');
      }
    } catch (e) {
      console.error('[useDeposits] 持久化沉淀序列失败:', e);
    }
  }, [api]);
  
  const persistDepositCategories = useCallback(async (list) => {
    console.log('[useDeposits] persistDepositCategories 被调用，数据:', list);
    try {
      // 本地存储
      localStorage.setItem(DEPOSIT_CATEGORIES_STORAGE_KEY, JSON.stringify(list || []));
      console.log('[useDeposits] 本地存储成功');
      
      // 【新增】同步保存到服务端
      if (api) {
        console.log('[useDeposits] 准备调用 API 保存类别到服务端...');
        const result = await api('/api/multi/precipitation/categories', { 
          method: 'PUT', 
          body: list || [] 
        });
        console.log('[useDeposits] 沉淀类别已同步到服务端, 结果:', result);
      } else {
        console.warn('[useDeposits] api 函数未定义，无法同步到服务端');
      }
    } catch (e) {
      console.error('[useDeposits] 持久化沉淀归类失败:', e);
    }
  }, [api]);
  
  // 【新增】从服务端加载沉淀类别（初始化时）
  useEffect(() => {
    const loadCategoriesFromServer = async () => {
      if (!api) return;
      try {
        const serverCategories = await api('/api/multi/precipitation/categories');
        if (Array.isArray(serverCategories) && serverCategories.length > 0) {
          setDepositCategories(serverCategories);
          localStorage.setItem(DEPOSIT_CATEGORIES_STORAGE_KEY, JSON.stringify(serverCategories));
          console.log('[useDeposits] 从服务端加载沉淀类别成功，共', serverCategories.length, '个');
        }
      } catch (e) {
        console.log('[useDeposits] 从服务端加载沉淀类别失败，使用本地数据:', e.message);
      }
    };
    loadCategoriesFromServer();
  }, [api]);
  
  // 【关键修复】从服务端加载沉淀列表（初始化时）
  useEffect(() => {
    const loadDepositsFromServer = async () => {
      if (!api) return;
      try {
        const serverDeposits = await api('/api/multi/precipitation/records');
        if (Array.isArray(serverDeposits) && serverDeposits.length > 0) {
          // 服务端数据优先，合并本地数据中服务端没有的
          const localDeposits = loadDepositsFromStorage();
          const serverIds = new Set(serverDeposits.map(d => d.id));
          const mergedDeposits = [
            ...serverDeposits,
            ...localDeposits.filter(d => !serverIds.has(d.id))
          ];
          setDeposits(mergedDeposits);
          localStorage.setItem(DEPOSITS_STORAGE_KEY, JSON.stringify(mergedDeposits));
          console.log('[useDeposits] 从服务端加载沉淀列表成功，共', serverDeposits.length, '个（合并后', mergedDeposits.length, '个）');
        }
      } catch (e) {
        console.log('[useDeposits] 从服务端加载沉淀列表失败，使用本地数据:', e.message);
      }
    };
    loadDepositsFromServer();
  }, [api]);
  
  // ========== 选择操作 ==========
  const toggleDepositSelected = useCallback((depositId, checked) => {
    setSelectedDepositIds((prev) => {
      if (checked) {
        return { ...prev, [depositId]: true };
      }
      const next = { ...prev };
      delete next[depositId];
      return next;
    });
  }, []);
  
  const clearDepositSelection = useCallback(() => {
    setSelectedDepositIds({});
  }, []);
  
  const selectAllDeposits = useCallback(() => {
    const all = {};
    (deposits || []).forEach((d) => {
      all[d.id] = true;
    });
    setSelectedDepositIds(all);
  }, [deposits]);
  
  const getSelectedDepositIds = useCallback(() => {
    const ids = selectedDepositIds || {};
    return Object.keys(ids).filter((k) => ids[k]);
  }, [selectedDepositIds]);
  
  // ========== 编辑操作 ==========
  const startEditDeposit = useCallback((depositId, field, value) => {
    setDepositEditing((prev) => ({ ...prev, [`${depositId}||${field}`]: value }));
  }, []);
  
  const cancelEditDeposit = useCallback((depositId, field) => {
    setDepositEditing((prev) => {
      const next = { ...prev };
      delete next[`${depositId}||${field}`];
      return next;
    });
  }, []);
  
  // ========== 拖拽操作 ==========
  const handleDepositDragStart = useCallback((depositId) => (e) => {
    setDraggingDepositId(depositId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);
  
  const handleDepositDragOver = useCallback((depositId) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDepositId(depositId);
  }, []);
  
  const handleDepositDrop = useCallback((depositId) => (e) => {
    e.preventDefault();
    if (draggingDepositId && draggingDepositId !== depositId) {
      setDeposits((prev) => {
        const next = reorderDepositList(prev, draggingDepositId, depositId);
        persistDepositOrder(next);
        return next;
      });
    }
    setDraggingDepositId('');
    setDragOverDepositId('');
  }, [draggingDepositId, persistDepositOrder]);
  
  const handleDepositDragEnd = useCallback(() => {
    setDraggingDepositId('');
    setDragOverDepositId('');
  }, []);
  
  // ========== 排序操作 ==========
  const applyDepositOrderChange = useCallback((updater) => {
    let nextList = null;
    setDeposits((prev) => {
      nextList = updater(prev);
      return nextList;
    });
    if (nextList) {
      persistDepositOrder(nextList);
    }
  }, [persistDepositOrder]);
  
  // ========== 展开/折叠操作 ==========
  const isDepositSectionExpanded = useCallback((depositId, sectionId) => {
    return !!expandedDepositSections?.[depositId]?.[sectionId];
  }, [expandedDepositSections]);
  
  const toggleDepositSectionExpanded = useCallback((depositId, sectionId) => {
    setExpandedDepositSections((prev) => ({
      ...prev,
      [depositId]: {
        ...(prev?.[depositId] || {}),
        [sectionId]: !prev?.[depositId]?.[sectionId]
      }
    }));
  }, []);
  
  const setAllDepositSectionsExpanded = useCallback((depositId, expanded) => {
    const deposit = deposits.find((d) => d.id === depositId);
    if (!deposit) return;
    const sectionMap = {};
    (deposit.sections || []).forEach((s) => {
      sectionMap[s.id] = expanded;
    });
    setExpandedDepositSections((prev) => ({
      ...prev,
      [depositId]: sectionMap
    }));
  }, [deposits]);
  
  // ========== 归类操作 ==========
  const createCategory = useCallback((name, level, parentId = null) => {
    console.log('[createCategory] 开始创建归类:', { name, level, parentId });
    const newCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      level, // 1, 2, 3
      parentId, // 父归类ID（用于二级、三级归类）
      createdAt: Date.now()
    };
    console.log('[createCategory] 新归类对象:', newCategory);
    setDepositCategories(prev => {
      console.log('[createCategory] 当前归类列表:', prev);
      const next = [...prev, newCategory];
      console.log('[createCategory] 更新后归类列表:', next);
      persistDepositCategories(next);
      return next;
    });
    return newCategory;
  }, [persistDepositCategories]);
  
  const deleteCategory = useCallback((categoryId) => {
    setDepositCategories(prev => {
      // 删除归类及其所有子归类
      const idsToDelete = new Set([categoryId]);
      let changed = true;
      while (changed) {
        changed = false;
        prev.forEach(cat => {
          if (cat.parentId && idsToDelete.has(cat.parentId) && !idsToDelete.has(cat.id)) {
            idsToDelete.add(cat.id);
            changed = true;
          }
        });
      }
      const next = prev.filter(cat => !idsToDelete.has(cat.id));
      persistDepositCategories(next);
      return next;
    });
    // 同时清除沉淀的归类引用
    setDeposits(prev => {
      const next = prev.map(d => {
        if (d.categoryId === categoryId) {
          return { ...d, categoryId: null };
        }
        return d;
      });
      persistDeposits(next);
      return next;
    });
  }, [persistDepositCategories, persistDeposits]);
  
  const assignDepositsToCategory = useCallback((depositIds, categoryId) => {
    const ids = depositIds || [];
    setDeposits(prev => {
      const next = prev.map(d => {
        if (ids.includes(d.id)) {
          return { ...d, categoryId };
        }
        return d;
      });
      persistDeposits(next);
      return next;
    });
  }, [persistDeposits]);
  
  const removeDepositsFromCategory = useCallback((depositIds) => {
    const ids = depositIds || [];
    setDeposits(prev => {
      const next = prev.map(d => {
        if (ids.includes(d.id)) {
          return { ...d, categoryId: null };
        }
        return d;
      });
      persistDeposits(next);
      return next;
    });
  }, [persistDeposits]);
  
  const renameCategory = useCallback((categoryId, newName) => {
    setDepositCategories(prev => {
      const next = prev.map(cat => {
        if (cat.id === categoryId) {
          return { ...cat, name: newName };
        }
        return cat;
      });
      persistDepositCategories(next);
      return next;
    });
  }, [persistDepositCategories]);
  
  // 归类排序
  const reorderCategories = useCallback((fromId, toId) => {
    setDepositCategories(prev => {
      const fromIndex = prev.findIndex(c => c.id === fromId);
      const toIndex = prev.findIndex(c => c.id === toId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      persistDepositCategories(next);
      return next;
    });
  }, [persistDepositCategories]);
  
  // 更新归类级别
  const updateCategoryLevel = useCallback((categoryId, newLevel) => {
    setDepositCategories(prev => {
      const next = prev.map(cat => {
        if (cat.id === categoryId) {
          return { ...cat, level: newLevel };
        }
        return cat;
      });
      persistDepositCategories(next);
      return next;
    });
  }, [persistDepositCategories]);
  
  // 【新增】设置归类的父归类（用于拖拽二级/三级归类到一级归类下）
  const setCategoryParent = useCallback((categoryId, parentId) => {
    setDepositCategories(prev => {
      // 找到被移动的归类
      const movingCat = prev.find(c => c.id === categoryId);
      if (!movingCat) return prev;
      
      // 找到目标父归类
      const parentCat = parentId ? prev.find(c => c.id === parentId) : null;
      
      // 计算新的级别：如果有父归类，级别为父归类+1，否则保持原级别
      let newLevel = movingCat.level;
      if (parentCat) {
        newLevel = Math.min(parentCat.level + 1, 3);  // 最多三级
      }
      
      const next = prev.map(cat => {
        if (cat.id === categoryId) {
          return { ...cat, parentId: parentId || null, level: newLevel };
        }
        return cat;
      });
      
      persistDepositCategories(next);
      return next;
    });
  }, [persistDepositCategories]);
  
  return {
    // 状态
    deposits,
    setDeposits,
    depositSeq,
    setDepositSeq,
    depositGroups,
    setDepositGroups,
    depositCategories,
    setDepositCategories,
    selectedDepositIds,
    setSelectedDepositIds,
    depositEditing,
    setDepositEditing,
    expandedDepositSections,
    setExpandedDepositSections,
    compilingDepositSections,
    setCompilingDepositSections,
    draggingDepositId,
    setDraggingDepositId,
    dragOverDepositId,
    setDragOverDepositId,
    selectedDepositGroupId,
    setSelectedDepositGroupId,
    depositGroupReplay,
    setDepositGroupReplay,
    batchReplayRunning,
    setBatchReplayRunning,
    
    // 持久化
    persistDeposits,
    persistDepositOrder,
    persistDepositCategories,
    
    // 选择操作
    toggleDepositSelected,
    clearDepositSelection,
    selectAllDeposits,
    getSelectedDepositIds,
    
    // 编辑操作
    startEditDeposit,
    cancelEditDeposit,
    
    // 拖拽操作
    handleDepositDragStart,
    handleDepositDragOver,
    handleDepositDrop,
    handleDepositDragEnd,
    
    // 排序操作
    applyDepositOrderChange,
    
    // 展开/折叠操作
    isDepositSectionExpanded,
    toggleDepositSectionExpanded,
    setAllDepositSectionsExpanded,
    
    // 归类操作
    createCategory,
    deleteCategory,
    assignDepositsToCategory,
    removeDepositsFromCategory,
    renameCategory,
    reorderCategories,
    updateCategoryLevel,
    setCategoryParent,  // 【新增】设置归类的父归类
  };
};

export default useDeposits;
