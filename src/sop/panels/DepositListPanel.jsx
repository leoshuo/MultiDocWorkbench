/**
 * DepositListPanel - 沉淀列表面板组件
 * 包含归类分组和沉淀项渲染的统一组件
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GripVertical } from 'lucide-react';
import { UI_TEXT } from '../SOPConstants';
import { DepositModeSelect } from './DepositPanels';
import { extractReplayMeta, formatOpContent } from '../logic/depositOps';

// 归类级别对应的颜色配置
const LEVEL_COLORS = {
  1: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd', headerBg: '#eff6ff' },
  2: { bg: '#dcfce7', text: '#15803d', border: '#86efac', headerBg: '#f0fdf4' },
  3: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d', headerBg: '#fffbeb' }
};

// 通用样式常量
const STYLES = {
  categoryContainer: {
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    cursor: 'pointer',
    userSelect: 'none'
  },
  categoryHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #bae6fd'
  },
  categoryTag: (colors) => ({
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: '10px',
    border: `1px solid ${colors.border}`
  }),
  deleteButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: '4px 8px',
    fontSize: '12px',
    borderRadius: '4px'
  }
};

/**
 * 沉淀列表面板组件
 */
export const DepositListPanel = ({
  deposits = [],
  depositCategories = [],
  depositEditing = {},
  selectedDepositIds = {},
  expandedLogs = {},
  sectionExpanded = {},
  replayState = {},
  dragOverDepositId = '',
  isEditing = false,
  // 回调函数
  toggleDepositSelected,
  handleDepositDragStart,
  handleDepositDragEnd,
  handleDepositDragOver,
  handleDepositDrop,
  startEditDeposit,
  cancelEditDeposit,
  applyDepositName,
  applyDepositOrder,
  startEditDepositOrder,
  handleDepositNameKeyDown,
  handleDepositOrderKeyDown,
  editDeposit,
  replayDeposit,
  deleteDepositsByIds,
  setExpandedLogs,
  setAllDepositSectionsExpanded,
  toggleSectionExpanded,
  replaySingleSection,
  deleteDepositSection,
  editDepositSection,  // 【新增】编辑单个 section
  updateDepositMode,
  updateSectionReplayMode,
  getDepositReplayStatus,
  getDepositReplayReason,
  deleteCategory,
  renameCategory,
  reorderCategories,
  updateCategoryLevel,
  setCategoryParent,  // 【新增】设置归类的父归类
  showToast,
  // 批量操作
  batchReplayDeposits,
  createDepositGroup,
  updateDepositGroup,
}) => {
  // 归类展开/收起状态
  const [expandedCategories, setExpandedCategories] = useState({});
  const [uncategorizedExpanded, setUncategorizedExpanded] = useState(true);
  
  // 归类选中状态
  const [selectedCategoryIds, setSelectedCategoryIds] = useState({});
  
  // 归类拖拽状态
  const [draggingCategoryId, setDraggingCategoryId] = useState(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState(null);
  
  // 归类编辑状态
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // 性能优化：按归类分组缓存沉淀列表
  const depositsByCategory = useMemo(() => {
    const map = { uncategorized: [] };
    depositCategories.forEach(cat => {
      map[cat.id] = [];
    });
    deposits.forEach(d => {
      const key = d.categoryId || 'uncategorized';
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return map;
  }, [deposits, depositCategories]);

  // 【关键】按层级关系排序归类，确保子归类紧跟在父归类后面
  // 必须在 getAllChildCategoryIds 之前定义，否则会报 "before initialization" 错误
  const sortedCategories = useMemo(() => {
    if (!depositCategories || depositCategories.length === 0) return [];
    
    // 构建层级结构
    const buildTree = (parentId = null) => {
      const children = depositCategories.filter(c => (c.parentId || null) === parentId);
      const result = [];
      children.forEach(child => {
        result.push(child);
        // 递归添加子归类
        result.push(...buildTree(child.id));
      });
      return result;
    };
    
    return buildTree(null);
  }, [depositCategories]);

  // 初始化归类展开状态 - 只在归类列表变化时初始化新归类的展开状态
  useEffect(() => {
    if (depositCategories && depositCategories.length > 0) {
      setExpandedCategories(prev => {
        const initial = { ...prev };
        let hasNew = false;
        depositCategories.forEach(cat => {
          if (initial[cat.id] === undefined) {
            initial[cat.id] = true;
            hasNew = true;
          }
        });
        return hasNew ? initial : prev;
      });
    }
  }, [depositCategories]);

  // 归类选中操作 - 同时级联选中/取消选中该归类下的所有沉淀
  const toggleCategorySelected = useCallback((categoryId, checked) => {
    // 更新归类选中状态
    setSelectedCategoryIds(prev => {
      if (checked) {
        return { ...prev, [categoryId]: true };
      } else {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      }
    });
    
    // 级联更新该归类下所有沉淀的选中状态
    const categoryDeposits = (deposits || []).filter(d => d.categoryId === categoryId);
    categoryDeposits.forEach(dep => {
      toggleDepositSelected?.(dep.id, checked);
    });
  }, [deposits, toggleDepositSelected]);

  const clearCategorySelection = useCallback(() => {
    // 使用 setState 回调获取最新的选中状态，避免闭包问题
    setSelectedCategoryIds(prev => {
      // 清除所有已选归类下沉淀的选中状态
      const selectedCatIds = Object.keys(prev).filter(id => prev[id]);
      selectedCatIds.forEach(catId => {
        const categoryDeposits = (deposits || []).filter(d => d.categoryId === catId);
        categoryDeposits.forEach(dep => {
          toggleDepositSelected?.(dep.id, false);
        });
      });
      return {};
    });
  }, [deposits, toggleDepositSelected]);

  const selectAllCategories = useCallback(() => {
    const all = {};
    depositCategories.forEach(cat => {
      all[cat.id] = true;
      // 同时选中该归类下所有沉淀
      const categoryDeposits = (deposits || []).filter(d => d.categoryId === cat.id);
      categoryDeposits.forEach(dep => {
        toggleDepositSelected?.(dep.id, true);
      });
    });
    setSelectedCategoryIds(all);
  }, [depositCategories, deposits, toggleDepositSelected]);

  const getSelectedCategoryIds = useCallback(() => {
    return Object.keys(selectedCategoryIds).filter(id => selectedCategoryIds[id]);
  }, [selectedCategoryIds]);

  // 归类拖拽操作
  const handleCategoryDragStart = useCallback((categoryId) => (e) => {
    e.stopPropagation();
    setDraggingCategoryId(categoryId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleCategoryDragOver = useCallback((categoryId) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingCategoryId && draggingCategoryId !== categoryId) {
      setDragOverCategoryId(categoryId);
    }
  }, [draggingCategoryId]);

  const handleCategoryDrop = useCallback((targetCategoryId) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggingCategoryId || draggingCategoryId === targetCategoryId) {
      setDraggingCategoryId(null);
      setDragOverCategoryId(null);
      return;
    }
    
    // 找到拖拽的归类和目标归类
    const draggingCat = depositCategories.find(c => c.id === draggingCategoryId);
    const targetCat = depositCategories.find(c => c.id === targetCategoryId);
    
    if (!draggingCat || !targetCat) {
      reorderCategories?.(draggingCategoryId, targetCategoryId);
      setDraggingCategoryId(null);
      setDragOverCategoryId(null);
      return;
    }
    
    // 【新增】如果拖拽的是二级/三级归类，目标是一级归类，则设置父子关系
    if (draggingCat.level > 1 && targetCat.level === 1) {
      // 将二级/三级归类放到一级归类下
      setCategoryParent?.(draggingCategoryId, targetCategoryId);
      showToast?.(`已将「${draggingCat.name}」移入「${targetCat.name}」下`);
    } else if (draggingCat.level === targetCat.level) {
      // 同级别归类之间的排序
      reorderCategories?.(draggingCategoryId, targetCategoryId);
    } else {
      // 其他情况也使用普通排序
      reorderCategories?.(draggingCategoryId, targetCategoryId);
    }
    
    setDraggingCategoryId(null);
    setDragOverCategoryId(null);
  }, [draggingCategoryId, depositCategories, reorderCategories, setCategoryParent, showToast]);

  const handleCategoryDragEnd = useCallback(() => {
    setDraggingCategoryId(null);
    setDragOverCategoryId(null);
  }, []);

  // 归类编辑操作
  const startEditCategoryName = useCallback((categoryId, currentName) => {
    setEditingCategoryId(categoryId);
    setEditingCategoryName(currentName);
  }, []);

  const cancelEditCategoryName = useCallback(() => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  }, []);

  const applyEditCategoryName = useCallback((categoryId) => {
    if (editingCategoryName.trim()) {
      renameCategory?.(categoryId, editingCategoryName.trim());
      showToast?.(`归类已重命名为：${editingCategoryName.trim()}`);
    }
    setEditingCategoryId(null);
    setEditingCategoryName('');
  }, [editingCategoryName, renameCategory, showToast]);

  const handleCategoryNameKeyDown = useCallback((e, categoryId) => {
    if (e.key === 'Enter') {
      applyEditCategoryName(categoryId);
    } else if (e.key === 'Escape') {
      cancelEditCategoryName();
    }
  }, [applyEditCategoryName, cancelEditCategoryName]);

  // 批量操作：获取选中归类下的所有沉淀ID
  const getDepositsInSelectedCategories = useCallback(() => {
    const selectedCatIds = getSelectedCategoryIds();
    if (selectedCatIds.length === 0) return [];
    return (deposits || []).filter(d => selectedCatIds.includes(d.categoryId)).map(d => d.id);
  }, [deposits, getSelectedCategoryIds]);

  // 批量 Replay 选中归类下的沉淀
  const handleBatchReplayCategories = useCallback(() => {
    const depositIds = getDepositsInSelectedCategories();
    if (depositIds.length === 0) {
      showToast?.('选中的归类下没有沉淀');
      return;
    }
    if (batchReplayDeposits) {
      batchReplayDeposits(depositIds);
    } else {
      // 如果没有 batchReplayDeposits，逐个 replay
      depositIds.forEach(id => replayDeposit?.(id));
    }
    showToast?.(`开始批量 Replay ${depositIds.length} 个沉淀`);
  }, [getDepositsInSelectedCategories, batchReplayDeposits, replayDeposit, showToast]);

  // 从选中归类创建沉淀集
  const handleCreateGroupFromCategories = useCallback(() => {
    const depositIds = getDepositsInSelectedCategories();
    if (depositIds.length === 0) {
      showToast?.('选中的归类下没有沉淀');
      return;
    }
    const selectedCatIds = getSelectedCategoryIds();
    const categoryNames = depositCategories
      .filter(c => selectedCatIds.includes(c.id))
      .map(c => c.name)
      .join('+');
    if (createDepositGroup) {
      createDepositGroup(categoryNames || '新沉淀集', depositIds);
      showToast?.(`已创建沉淀集：${categoryNames}`);
    } else {
      showToast?.('创建沉淀集功能不可用');
    }
  }, [getDepositsInSelectedCategories, getSelectedCategoryIds, depositCategories, createDepositGroup, showToast]);

  // 渲染单个沉淀项
  const renderDepositItem = (dep, idx) => {
    const orderKey = `${dep.id}||order`;
    const orderEditing = depositEditing[orderKey] !== undefined;
    const depositStatus = getDepositReplayStatus?.(dep);
    const depositReason = getDepositReplayReason?.(dep);
    const statusClass = depositStatus ? depositStatus.replace(' ', '-') : '';
    
    // 检查该沉淀的所有 section 是否全部展开
    const allSectionsExpanded = (dep.sections || []).length > 0 && (dep.sections || []).every((s) => {
      const key = `${dep.id}_${s.id}`;
      return sectionExpanded[key] === true;
    });
    
    // 切换所有 section 展开/收起状态
    const handleToggleAllSections = () => {
      setAllDepositSectionsExpanded?.(dep.id, !allSectionsExpanded);
    };

    return (
      <div
        key={`${dep.id}-${idx}`}
        className="section"
        onDragOver={handleDepositDragOver?.(dep.id)}
        onDrop={handleDepositDrop?.(dep.id)}
        style={dragOverDepositId === dep.id ? { outline: '2px dashed #3b82f6', outlineOffset: 2 } : undefined}
      >
        <div className="section-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', flex: 1, minWidth: 0 }}>
            <label className="inline-check" style={{ gap: 6 }}>
              <input
                type="checkbox"
                checked={!!selectedDepositIds?.[dep.id]}
                onChange={(e) => toggleDepositSelected?.(dep.id, e.target.checked)}
              />
            </label>
            <button
              className="icon-btn tiny deposit-drag-handle"
              type="button"
              draggable
              onDragStart={handleDepositDragStart?.(dep.id)}
              onDragEnd={handleDepositDragEnd}
              title={UI_TEXT.t64}
            >
              <GripVertical size={12} />
            </button>
            {orderEditing ? (
              <input
                className="deposit-order-input"
                type="number"
                min={1}
                max={deposits.length}
                value={depositEditing[orderKey]}
                onChange={(e) => startEditDeposit?.(dep.id, 'order', e.target.value)}
                onBlur={() => applyDepositOrder?.(dep.id)}
                onKeyDown={(e) => handleDepositOrderKeyDown?.(e, dep.id)}
              />
            ) : (
              <button
                className="pill muted deposit-order-pill"
                type="button"
                onClick={() => startEditDepositOrder?.(dep.id, idx + 1)}
                title={UI_TEXT.t65}
              >
                {idx + 1}
              </button>
            )}
            {depositEditing[`${dep.id}||name`] !== undefined ? (
              <>
                <input
                  className="deposit-name-input"
                  value={depositEditing[`${dep.id}||name`]}
                  onChange={(e) => startEditDeposit?.(dep.id, 'name', e.target.value)}
                  onKeyDown={(e) => handleDepositNameKeyDown?.(e, dep.id)}
                  style={{ minWidth: 180 }}
                />
                <button className="ghost xsmall" type="button" onClick={() => applyDepositName?.(dep.id)}>{UI_TEXT.t66}</button>
                <button className="ghost xsmall" type="button" onClick={() => cancelEditDeposit?.(dep.id, 'name')}>{UI_TEXT.t22}</button>
              </>
            ) : (
              <>
                <span className="deposit-name">{dep.name || UI_TEXT.t144}</span>
                <button
                  className="ghost xsmall"
                  type="button"
                  onClick={() => startEditDeposit?.(dep.id, 'name', dep.name || dep.id)}
                >
                  {UI_TEXT.t67}
                </button>
              </>
            )}
          </div>
          <div className="section-actions" style={{ gap: 6 }}>
            {depositStatus && (
              (depositStatus !== 'done' || (dep.sections?.length > 0 && replayState?.[dep.id]?.bySection && Object.keys(replayState[dep.id].bySection).length === dep.sections.length)) ? (
                <span className={`status ${statusClass}`} title={depositReason || UI_TEXT.t122}>
                  {depositStatus === 'done' ? 'DONE' : depositStatus}
                </span>
              ) : null
            )}
            <DepositModeSelect deposit={dep} updateDepositMode={updateDepositMode} />
            <button className="ghost xsmall" type="button" onClick={() => editDeposit?.(dep.id)} title="编辑沉淀内容">
              ✏️ 编辑
            </button>
            <button className="ghost xsmall" type="button" onClick={() => replayDeposit?.(dep.id)} disabled={!!replayState?.[dep.id]?.running}>
              Replay
            </button>
            {expandedLogs[dep.id] && (dep.sections?.length > 0) && (
              <button className="ghost xsmall" type="button" onClick={handleToggleAllSections}>
                {allSectionsExpanded ? UI_TEXT.t68 : UI_TEXT.t69}
              </button>
            )}
            <button className="ghost xsmall" type="button" onClick={() => deleteDepositsByIds?.([dep.id])}>{UI_TEXT.t25}</button>
            <button className="ghost xsmall" type="button" onClick={() => setExpandedLogs?.((prev) => ({ ...prev, [dep.id]: !prev[dep.id] }))}>
              {expandedLogs[dep.id] ? UI_TEXT.t142 : UI_TEXT.t143}
            </button>
          </div>
        </div>

        {depositStatus && depositStatus !== 'done' && depositReason && (
          <div className="hint" style={{ marginTop: 6, color: '#92400e' }}>{UI_TEXT.t70}{depositReason}</div>
        )}

        {expandedLogs[dep.id] && (
          <div className="sections" style={{ gap: 6 }}>
            {(dep.sections || []).length === 0 && <div className="hint">{UI_TEXT.t71}</div>}
            {(dep.sections || []).map((s, i) => {
              const replay = replayState?.[dep.id]?.bySection?.[s.id];
              const sectionMeta = extractReplayMeta(s?.content || '');
              const canFlexUpload = sectionMeta?.type === 'add_doc' && (
                sectionMeta?.source === 'upload' || (s?.content || '').toString().includes(UI_TEXT.t162)
              );

              return (
                <div key={s.id} className="section" style={{ background: '#fff' }}>
                  <div className="section-head" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', flex: 1, minWidth: 0 }}>
                      <span className="pill muted">{i + 1}</span>
                      <span className="section-action-name">{s.action || UI_TEXT.t123}</span>
                      <span 
                        style={{ 
                          fontSize: '10px', 
                          padding: '2px 5px', 
                          borderRadius: '3px',
                          background: dep.validationMode === 'strict' ? '#fef3c7' : '#f0fdf4',
                          color: dep.validationMode === 'strict' ? '#b45309' : '#059669',
                          marginLeft: '4px'
                        }}
                        title={dep.validationMode === 'strict' 
                          ? '强校验：必须满足相似特征才执行' 
                          : '不校验：努力找到目标位置执行'}
                      >
                        {dep.validationMode === 'strict' ? '🔒' : '🔓'}
                      </span>
                      {replay?.status && (
                        <span 
                          className={`status ${replay.status}`} 
                          title={replay.message || ''}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: replay.status === 'done' 
                              ? (replay.replayMode === 'llm' ? '#dbeafe' : '#dcfce7')
                              : replay.status === 'fail' ? '#fee2e2' : '#fef3c7',
                            color: replay.status === 'done'
                              ? (replay.replayMode === 'llm' ? '#1e40af' : '#166534')
                              : replay.status === 'fail' ? '#b91c1c' : '#b45309'
                          }}
                        >
                          {replay.status === 'done' && replay.replayMode === 'llm' && '🤖'}
                          {replay.status === 'done' && replay.replayMode !== 'llm' && '📜'}
                          {replay.status === 'fail' && '❌'}
                          {replay.status === 'pass' && '⚠️'}
                          {replay.status === 'running' && '⏳'}
                          {replay.status.toUpperCase()}
                          {replay.status === 'done' && replay.replayMode === 'llm' && ' (大模型)'}
                          {replay.status === 'done' && replay.replayMode === 'script' && ' (脚本)'}
                          {replay.status === 'done' && replay.replayMode === 'script_fallback' && ' (脚本回退)'}
                        </span>
                      )}
                    </div>
                    <div className="section-actions" style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <select
                        value={s.sectionReplayMode || dep.precipitationMode || 'llm'}
                        onChange={(e) => updateSectionReplayMode?.(dep.id, s.id, e.target.value)}
                        title="选择此步骤的 Replay 模式"
                        style={{ 
                          fontSize: 10, 
                          padding: '2px 6px',
                          background: (s.sectionReplayMode || dep.precipitationMode || 'llm') === 'llm' ? '#dbeafe' : '#dcfce7',
                          color: (s.sectionReplayMode || dep.precipitationMode || 'llm') === 'llm' ? '#1e40af' : '#166534',
                          borderRadius: 4,
                          border: '1px solid #d1d5db',
                          cursor: 'pointer',
                          minWidth: '85px'
                        }}
                      >
                        <option value="llm">🤖 大模型</option>
                        <option value="script">📜 脚本</option>
                      </select>
                      <button className="ghost xsmall" type="button" onClick={() => replaySingleSection?.(dep.id, s.id)} disabled={replay?.status === 'running'} style={{ fontSize: 10, padding: '2px 6px' }}>Replay</button>
                      {/* 编辑按钮 - 打开编辑弹窗 */}
                      <button className="ghost xsmall" type="button" onClick={() => editDepositSection?.(dep.id, s.id)} style={{ fontSize: 10, padding: '2px 6px' }}>编辑</button>
                      {/* 删除按钮 */}
                      <button className="ghost xsmall" type="button" onClick={() => {
                        if (window.confirm(`确定要删除这条记录吗？`)) {
                          deleteDepositSection?.(dep.id, s.id);
                        }
                      }} style={{ fontSize: 10 }}>删除</button>
                      {/* 展开/收起按钮 - 放在最右边 */}
                      <button className="ghost xsmall" type="button" onClick={() => toggleSectionExpanded?.(dep.id, s.id)} style={{ fontSize: 10, padding: '2px 6px' }}>
                        {sectionExpanded[`${dep.id}_${s.id}`] ? '收起' : '展开'}
                      </button>
                    </div>
                  </div>
                  {sectionExpanded[`${dep.id}_${s.id}`] === true && (() => {
                    // 获取当前 section 的 replay 模式
                    const currentReplayMode = s.sectionReplayMode || dep.precipitationMode || 'llm';
                    const isLlmMode = currentReplayMode === 'llm';
                    
                    // 【关键修复】优先使用 section.meta 字段（JSON中保存的完整数据）
                    // section.meta 是最可靠的数据源，因为它是直接保存的对象
                    const directMeta = s.meta || {};
                    
                    // 从各处尝试解析元数据作为备份
                    const parsedFromContent = extractReplayMeta(s.content) || {};
                    const parsedFromOriginal = extractReplayMeta(s.originalScript?.content) || {};
                    const parsedFromRaw = extractReplayMeta(s.originalScript?.rawContent) || {};
                    const outerParsedMeta = sectionMeta || {};
                    
                    // 合并元数据：directMeta 优先级最高（它是完整的对象）
                    const fullMeta = { 
                      ...parsedFromRaw,
                      ...parsedFromOriginal,
                      ...parsedFromContent,
                      ...outerParsedMeta,
                      ...directMeta  // 【最重要】section.meta 最后覆盖，确保使用保存的完整数据
                    };
                    
                    // 脚本记录：使用合并后的元数据
                    const scriptMeta = {
                      ...fullMeta,
                      type: fullMeta.type || fullMeta.buttonAction || '',
                      outputs: fullMeta.outputs || {}
                    };
                    const scriptFormatted = formatOpContent(scriptMeta);
                    
                    // 大模型记录：合并 llmScript 和元数据
                    const llmScriptData = s.llmScript || {};
                    const llmMeta = {
                      ...fullMeta,
                      ...llmScriptData,
                      // 确保关键字段存在，优先使用 llmScript，其次使用 fullMeta
                      type: llmScriptData.type || fullMeta.type || fullMeta.buttonAction || '',
                      docName: llmScriptData.docName || fullMeta.docName || '',
                      inputs: llmScriptData.inputs?.length > 0 ? llmScriptData.inputs : (fullMeta.inputs || []),
                      outputs: (llmScriptData.outputs && Object.keys(llmScriptData.outputs).length > 0) 
                        ? llmScriptData.outputs 
                        : (fullMeta.outputs || {}),
                      destinations: llmScriptData.destinations?.length > 0 
                        ? llmScriptData.destinations 
                        : (fullMeta.destinations || []),
                      targetSummaries: llmScriptData.targetSummaries?.length > 0 
                        ? llmScriptData.targetSummaries 
                        : (fullMeta.targetSummaries || [])
                    };
                    const llmFormatted = formatOpContent(llmMeta);
                    
                    // 【关键修复】提取输出格式和计算公式字段
                    const extractFieldValue = (text, fieldName) => {
                      if (!text) return '';
                      // 使用与 DepositConfirmModal 完全一致的正则
                      const regex = new RegExp(`【${fieldName}】\\s*([\\s\\S]*?)(?=【[^${fieldName.charAt(0)}]|\\n\\n\\n|===|$)`);
                      const match = text.match(regex);
                      return match ? match[1].trim() : '';
                    };
                    
                    // 从多个来源提取输出格式和计算公式
                    const structuredContent = llmScriptData.structuredScriptContent || '';
                    const rawContent = llmScriptData.rawContent || '';
                    const sectionContent = (s.content || '').split('__REPLAY_META__')[0].trim();
                    
                    let outputFormat = llmMeta.outputFormat || fullMeta.outputFormat || '';
                    let calculationFormula = llmMeta.calculationFormula || fullMeta.calculationFormula || '';
                    let aiGuidance = llmMeta.aiGuidance || fullMeta.aiGuidance || '';
                    
                    // 如果没找到，尝试从内容中提取
                    const contentSources = [structuredContent, rawContent, sectionContent];
                    for (const content of contentSources) {
                      if (!outputFormat && content) {
                        outputFormat = extractFieldValue(content, '输出格式');
                      }
                      if (!calculationFormula && content) {
                        calculationFormula = extractFieldValue(content, '计算公式');
                      }
                      if (!aiGuidance && content) {
                        aiGuidance = extractFieldValue(content, 'AI执行指导');
                      }
                      if (outputFormat && calculationFormula && aiGuidance) break;
                    }
                    
                    return (
                      <>
                        {/* 根据 replay 模式显示对应的记录 */}
                        {isLlmMode ? (
                          /* 大模型记录 - 大模型模式时显示 */
                          <div style={{ background: '#eff6ff', padding: '8px 10px', borderRadius: '6px', marginTop: '6px', border: '1px solid #93c5fd' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>🤖 大模型记录</span>
                              <span style={{ fontSize: '11px', color: '#1d4ed8' }}>{llmMeta?.type || scriptMeta?.type || 'unknown'}</span>
                            </div>
                            
                            {/* 【新增】高亮显示关键字段：输出格式、计算公式、AI执行指导 */}
                            {(outputFormat || calculationFormula || aiGuidance) && (
                              <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '6px', padding: '8px 10px', marginBottom: '8px', boxShadow: '0 2px 4px rgba(245,158,11,0.2)' }}>
                                <div style={{ fontSize: '10px', color: '#92400e', fontWeight: 600, marginBottom: '6px', borderBottom: '1px dashed #f59e0b', paddingBottom: '4px' }}>📌 关键执行参数</div>
                                {outputFormat && (
                                  <div style={{ marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                      <span style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap' }}>输出格式</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 500, lineHeight: 1.5, background: '#eff6ff', padding: '4px 8px', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{outputFormat}</div>
                                  </div>
                                )}
                                {calculationFormula && (
                                  <div style={{ marginBottom: aiGuidance ? '6px' : 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                      <span style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap' }}>计算公式</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 500, lineHeight: 1.5, background: '#fef2f2', padding: '4px 8px', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{calculationFormula}</div>
                                  </div>
                                )}
                                {aiGuidance && (
                                  <details style={{ marginTop: '4px' }}>
                                    <summary style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                                      <span style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap' }}>AI指导</span>
                                      <span style={{ fontSize: '10px', color: '#7c3aed' }}>（点击展开/收起）</span>
                                    </summary>
                                    <div style={{ fontSize: '11px', color: '#5b21b6', fontWeight: 500, lineHeight: 1.5, background: '#f5f3ff', padding: '6px 8px', borderRadius: '4px', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '200px', overflow: 'auto' }}>{aiGuidance}</div>
                                  </details>
                                )}
                              </div>
                            )}
                            
                            <pre style={{ fontSize: '11px', color: '#1e3a5f', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                              {llmFormatted || scriptFormatted || '（暂无大模型记录）'}
                            </pre>
                          </div>
                        ) : (
                          /* 脚本记录 - 脚本模式时显示 */
                          <div style={{ background: '#fffbeb', padding: '8px 10px', borderRadius: '6px', marginTop: '6px', border: '1px solid #fcd34d' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <span style={{ background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>📜 脚本记录</span>
                              <span style={{ fontSize: '11px', color: '#b45309' }}>{scriptMeta?.type || 'unknown'}</span>
                            </div>
                            <pre style={{ fontSize: '11px', color: '#78350f', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                              {scriptFormatted || s.content?.substring(0, 800) || '（暂无脚本记录）'}
                            </pre>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 检查归类是否被父级收起隐藏
  const isCategoryHiddenByParent = useCallback((cat) => {
    if (!cat.parentId) return false;
    // 查找父归类
    const parentCat = depositCategories.find(c => c.id === cat.parentId);
    if (!parentCat) return false;
    // 如果父归类收起，则隐藏子归类
    if (expandedCategories[parentCat.id] === false) return true;
    // 递归检查更上层父归类
    return isCategoryHiddenByParent(parentCat);
  }, [depositCategories, expandedCategories]);

  // 获取归类的缩进级别（基于 parentId 层级关系）
  const getCategoryIndentLevel = useCallback((cat) => {
    let level = 0;
    let current = cat;
    while (current?.parentId) {
      level++;
      current = depositCategories.find(c => c.id === current.parentId);
      if (level > 5) break; // 防止无限循环
    }
    return level;
  }, [depositCategories]);

  // 【重构】获取某个归类的所有子归类ID
  // 支持两种模式：1. 基于 parentId 的显式父子关系  2. 基于 level 和排序的隐式包含关系
  const getAllChildCategoryIds = useCallback((categoryId) => {
    const result = [];
    const targetCat = depositCategories.find(c => c.id === categoryId);
    if (!targetCat) return result;
    
    // 方式1：递归查找显式设置了 parentId 的子归类
    const findChildrenByParentId = (parentId) => {
      depositCategories.forEach(cat => {
        if (cat.parentId === parentId) {
          result.push(cat.id);
          findChildrenByParentId(cat.id);
        }
      });
    };
    findChildrenByParentId(categoryId);
    
    // 方式2：如果没有找到显式子归类，基于 level 和排序顺序推断
    // 找到当前归类在排序列表中的位置，之后所有 level 更大的归类（直到遇到同级或更高级归类）都视为子归类
    if (result.length === 0 && sortedCategories.length > 0) {
      const currentIndex = sortedCategories.findIndex(c => c.id === categoryId);
      if (currentIndex !== -1) {
        const currentLevel = targetCat.level;
        // 向后查找，直到遇到同级或更高级归类
        for (let i = currentIndex + 1; i < sortedCategories.length; i++) {
          const nextCat = sortedCategories[i];
          // 如果遇到同级或更高级（level 更小或相等），停止
          if (nextCat.level <= currentLevel) break;
          // 否则视为子归类
          result.push(nextCat.id);
        }
      }
    }
    
    return result;
  }, [depositCategories, sortedCategories]);

  // 【重构】判断是否有子归类（支持显式和隐式两种方式）
  const hasChildCategoriesFor = useCallback((categoryId) => {
    const targetCat = depositCategories.find(c => c.id === categoryId);
    if (!targetCat) return false;
    
    // 方式1：检查是否有显式设置了 parentId 的子归类
    const hasExplicitChildren = depositCategories.some(c => c.parentId === categoryId);
    if (hasExplicitChildren) return true;
    
    // 方式2：基于排序顺序检查是否有更低级别的归类紧随其后
    const currentIndex = sortedCategories.findIndex(c => c.id === categoryId);
    if (currentIndex !== -1 && currentIndex < sortedCategories.length - 1) {
      const nextCat = sortedCategories[currentIndex + 1];
      // 如果下一个归类的 level 更大，则视为有子归类
      if (nextCat.level > targetCat.level) return true;
    }
    
    return false;
  }, [depositCategories, sortedCategories]);

  // 【新增】计算归类包含的总沉淀数（包括所有子归类）
  const getTotalDepositsInCategory = useCallback((categoryId) => {
    // 直接属于该归类的沉淀
    const directDeposits = depositsByCategory[categoryId] || [];
    
    // 获取所有子归类的沉淀
    const childCategoryIds = getAllChildCategoryIds(categoryId);
    let childDepositsCount = 0;
    childCategoryIds.forEach(childId => {
      const childDeposits = depositsByCategory[childId] || [];
      childDepositsCount += childDeposits.length;
    });
    
    return {
      direct: directDeposits.length,
      fromChildren: childDepositsCount,
      total: directDeposits.length + childDepositsCount,
      childCategoryCount: childCategoryIds.length
    };
  }, [depositsByCategory, getAllChildCategoryIds]);

  // 渲染归类容器
  const renderCategoryContainer = (cat, catIndex) => {
    const colors = LEVEL_COLORS[cat.level] || LEVEL_COLORS[1];
    const categoryDeposits = depositsByCategory[cat.id] || [];
    const isExpanded = expandedCategories[cat.id] !== false;
    const levelText = cat.level === 1 ? '一级' : cat.level === 2 ? '二级' : '三级';
    const isSelected = !!selectedCategoryIds[cat.id];
    const isEditingName = editingCategoryId === cat.id;
    const isDragOver = dragOverCategoryId === cat.id;
    
    // 【新增】检查是否被父归类收起隐藏
    if (isCategoryHiddenByParent(cat)) {
      return null;
    }
    
    // 【新增】计算缩进：基于父子层级关系
    const indentLevel = getCategoryIndentLevel(cat);
    const indentPx = indentLevel * 24; // 每级缩进 24px
    
    // 【重构】检查是否有子归类（使用增强的判断函数）
    const hasChildCategories = hasChildCategoriesFor(cat.id);
    
    // 【新增】计算包含子归类的沉淀总数
    const depositStats = getTotalDepositsInCategory(cat.id);

    return (
      <div 
        key={cat.id} 
        style={{ 
          border: `1px solid ${isDragOver ? '#3b82f6' : colors.border}`,
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '8px',
          marginLeft: `${indentPx}px`, // 【新增】左侧缩进
          outline: isDragOver ? '2px dashed #3b82f6' : 'none',
          outlineOffset: isDragOver ? '2px' : '0',
          transition: 'margin-left 0.2s ease' // 【新增】过渡动画
        }}
        onDragOver={handleCategoryDragOver(cat.id)}
        onDrop={handleCategoryDrop(cat.id)}
      >
        {/* 归类标题栏 */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: isSelected ? '#e0f2fe' : colors.headerBg,
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            {/* 多选框 */}
            <label style={{ display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => toggleCategorySelected(cat.id, e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
            </label>
            
            {/* 拖拽手柄 */}
            <button
              className="icon-btn tiny"
              type="button"
              draggable
              onDragStart={handleCategoryDragStart(cat.id)}
              onDragEnd={handleCategoryDragEnd}
              onClick={(e) => e.stopPropagation()}
              title="拖拽排序"
              style={{ cursor: 'grab', padding: '2px' }}
            >
              <GripVertical size={14} />
            </button>
            
            {/* 展开/收起图标 */}
            <span 
              style={{ color: colors.text, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
              title={hasChildCategories ? (isExpanded ? '收起（包含子归类）' : '展开（包含子归类）') : (isExpanded ? '收起' : '展开')}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
            
            {/* 归类名称（可编辑） */}
            {isEditingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editingCategoryName}
                  onChange={(e) => setEditingCategoryName(e.target.value)}
                  onKeyDown={(e) => handleCategoryNameKeyDown(e, cat.id)}
                  autoFocus
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    border: '1px solid #3b82f6',
                    borderRadius: '4px',
                    minWidth: '120px'
                  }}
                />
                <button 
                  className="ghost xsmall" 
                  type="button" 
                  onClick={() => applyEditCategoryName(cat.id)}
                  style={{ fontSize: '11px' }}
                >
                  确定
                </button>
                <button 
                  className="ghost xsmall" 
                  type="button" 
                  onClick={cancelEditCategoryName}
                  style={{ fontSize: '11px' }}
                >
                  取消
                </button>
              </div>
            ) : (
              <>
                <span 
                  style={{ fontWeight: 600, fontSize: '14px', color: colors.text, cursor: 'pointer' }}
                  onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                >
                  {cat.name}
                </span>
                <button
                  className="ghost xsmall"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditCategoryName(cat.id, cat.name);
                  }}
                  style={{ fontSize: '11px', padding: '2px 4px' }}
                  title="重命名"
                >
                  ✏️
                </button>
              </>
            )}
            
            {/* 级别标签 */}
            <select
              value={cat.level}
              onChange={(e) => {
                e.stopPropagation();
                updateCategoryLevel?.(cat.id, parseInt(e.target.value));
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: colors.bg,
                color: colors.text,
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                cursor: 'pointer'
              }}
              title="修改归类级别"
            >
              <option value={1}>一级</option>
              <option value={2}>二级</option>
              <option value={3}>三级</option>
            </select>
            
            {/* 沉淀数量 - 显示包含子归类的统计 */}
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {hasChildCategories ? (
                // 有子归类时，显示详细的包含信息
                depositStats.total > 0 ? (
                  <>
                    <span style={{ color: '#059669', fontWeight: 500 }}>
                      (含 {depositStats.total} 个沉淀
                    </span>
                    {depositStats.direct > 0 && (
                      <span style={{ color: '#64748b' }}>
                        ：直属 {depositStats.direct}
                      </span>
                    )}
                    {depositStats.fromChildren > 0 && (
                      <span style={{ color: '#3b82f6' }}>
                        {depositStats.direct > 0 ? ' + ' : ''}子归类 {depositStats.fromChildren}
                      </span>
                    )}
                    <span style={{ color: '#059669', fontWeight: 500 }}>)</span>
                  </>
                ) : (
                  <span>(含 {depositStats.childCategoryCount} 个子归类)</span>
                )
              ) : (
                // 无子归类时，直接显示沉淀数量
                `(${categoryDeposits.length} 个沉淀)`
              )}
            </span>
          </div>
          
          {/* 操作按钮 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="ghost xsmall"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedCategories(prev => ({ ...prev, [cat.id]: !isExpanded }));
              }}
              style={{ fontSize: '11px' }}
              title={hasChildCategories ? (isExpanded ? '收起归类和子归类' : '展开归类和子归类') : (isExpanded ? '收起归类' : '展开归类')}
            >
              {isExpanded ? '收起' : '展开'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`确定要删除归类「${cat.name}」吗？该归类下的沉淀将变为未归类。`)) {
                  deleteCategory?.(cat.id);
                  showToast?.(`已删除归类：${cat.name}`);
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '4px 8px',
                fontSize: '12px',
                borderRadius: '4px'
              }}
              title="删除此归类"
            >
              删除
            </button>
          </div>
        </div>
        
        {/* 归类下的沉淀列表 */}
        {isExpanded && (
          <div style={{ padding: categoryDeposits.length > 0 ? '8px' : (hasChildCategories ? '0' : '8px') }}>
            {categoryDeposits.length === 0 ? (
              // 【修改】如果有子归类，不显示"暂无沉淀"，因为子归类中可能有沉淀
              hasChildCategories ? (
                // 有子归类时，显示子归类包含的沉淀信息
                depositStats.fromChildren > 0 ? (
                  <div style={{ 
                    padding: '8px 12px', 
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
                    borderRadius: '6px', 
                    fontSize: '12px', 
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '8px'
                  }}>
                    <span style={{ fontSize: '14px' }}>📂</span>
                    <span>
                      此归类下包含 <strong>{depositStats.childCategoryCount}</strong> 个子归类，
                      共 <strong>{depositStats.fromChildren}</strong> 个沉淀
                    </span>
                  </div>
                ) : (
                  <div style={{ 
                    padding: '8px 12px', 
                    background: '#f8fafc', 
                    borderRadius: '6px', 
                    fontSize: '12px', 
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '8px'
                  }}>
                    <span style={{ fontSize: '14px' }}>📁</span>
                    <span>
                      此归类下包含 <strong>{depositStats.childCategoryCount}</strong> 个子归类
                    </span>
                  </div>
                )
              ) : (
                // 无子归类且无直接沉淀时，显示提示
                <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  暂无沉淀，可通过「更新沉淀归类」按钮添加
                </div>
              )
            ) : (
              categoryDeposits.map((dep, idx) => {
                const globalIdx = deposits.findIndex(d => d.id === dep.id);
                return renderDepositItem(dep, globalIdx);
              })
            )}
          </div>
        )}
      </div>
    );
  };

  // 渲染未归类沉淀
  const renderUncategorizedDeposits = () => {
    const uncategorizedDeposits = depositsByCategory.uncategorized || [];
    if (uncategorizedDeposits.length === 0) return null;

    return (
      <div style={{ 
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '8px'
      }}>
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => setUncategorizedExpanded(!uncategorizedExpanded)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
              {uncategorizedExpanded ? '▼' : '▶'}
            </span>
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#64748b' }}>
              未归类
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              ({uncategorizedDeposits.length} 个沉淀)
            </span>
          </div>
        </div>
        
        {uncategorizedExpanded && (
          <div style={{ padding: '8px' }}>
            {uncategorizedDeposits.map((dep, idx) => {
              const globalIdx = deposits.findIndex(d => d.id === dep.id);
              return renderDepositItem(dep, globalIdx);
            })}
          </div>
        )}
      </div>
    );
  };

  // 渲染批量操作工具栏
  const renderCategoryToolbar = () => {
    const selectedCount = getSelectedCategoryIds().length;
    if (selectedCount === 0) return null;

    return (
      <div style={STYLES.toolbar}>
        <span style={{ fontSize: '13px', color: '#0369a1' }}>
          已选中 {selectedCount} 个归类
        </span>
        <button
          className="ghost xsmall"
          type="button"
          onClick={handleBatchReplayCategories}
          style={{ fontSize: '12px' }}
        >
          批量 Replay
        </button>
        <button
          className="ghost xsmall"
          type="button"
          onClick={handleCreateGroupFromCategories}
          style={{ fontSize: '12px' }}
        >
          新建沉淀集
        </button>
        <button
          className="ghost xsmall"
          type="button"
          onClick={clearCategorySelection}
          style={{ fontSize: '12px' }}
        >
          取消选择
        </button>
      </div>
    );
  };

  // 有归类时：按归类分组显示（即使没有沉淀记录，也要显示归类）
  if (depositCategories && depositCategories.length > 0) {
    return (
      <>
        {renderCategoryToolbar()}
        {sortedCategories.map((cat, idx) => renderCategoryContainer(cat, idx))}
        {renderUncategorizedDeposits()}
        {/* 当所有归类都为空且未分类也为空时，显示提示 */}
        {deposits.length === 0 && (
          <p className="hint" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
            归类下暂无沉淀记录
          </p>
        )}
      </>
    );
  }

  // 无归类时的空状态
  if (deposits.length === 0) {
    return <p className="hint" style={{ padding: '20px', textAlign: 'center' }}>{UI_TEXT.t63}</p>;
  }

  // 无归类时：直接显示所有沉淀
  return (
    <>
      {deposits.map((dep, idx) => renderDepositItem(dep, idx))}
    </>
  );
};

export default DepositListPanel;
