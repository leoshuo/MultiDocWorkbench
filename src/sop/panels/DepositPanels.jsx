/**
 * DepositPanels - 沉淀相关面板组件
 * 从 SOPWorkbench.jsx 提取的独立组件
 */
import React, { useState } from 'react';
import { Edit3, ChevronDown, ChevronRight, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { UI_TEXT } from '../SOPConstants';
import { normalizePrecipitationMode, sanitizeText } from '../SOPUtils';

/**
 * 沉淀模式选择组件
 * @param {Object} props
 * @param {Object} props.deposit - 沉淀对象
 * @param {Function} props.updateDepositMode - 更新沉淀模式的函数
 */
export const DepositModeSelect = ({ deposit, updateDepositMode }) => (
  <label className="deposit-mode">
    <select
      value={normalizePrecipitationMode(deposit?.precipitationMode)}
      onChange={(e) => updateDepositMode(deposit.id, e.target.value)}>
      <option value="llm">{UI_TEXT.t11}</option>
      <option value="script">{UI_TEXT.t12}</option>
    </select>
  </label>
);

/**
 * 沉淀集选择器组件
 * @param {Object} props
 * @param {string} props.selectedDepositGroupId - 当前选中的沉淀集ID
 * @param {Function} props.setSelectedDepositGroupId - 设置选中沉淀集的函数
 * @param {Array} props.depositGroups - 沉淀集列表
 */
export const DepositGroupSelector = ({
  selectedDepositGroupId,
  setSelectedDepositGroupId,
  depositGroups,
}) => (
  <div className="deposit-group-selector">
    <span className="hint">{UI_TEXT.t13}</span>
    <select
      value={selectedDepositGroupId}
      onChange={(e) => setSelectedDepositGroupId(e.target.value)}>
      <option value="">{UI_TEXT.t14}</option>
      {depositGroups.length === 0 ? (
        <option value="" disabled>
          {UI_TEXT.t6}
        </option>
      ) : null}
      {depositGroups.map((g) => (
        <option key={g.id} value={g.id}>
          {sanitizeText(g.name, g.name || '')}
        </option>
      ))}
    </select>
  </div>
);

/**
 * 沉淀集列表组件
 * @param {Object} props
 * @param {Array} props.depositGroups - 沉淀集列表
 * @param {string} props.selectedDepositGroupId - 当前选中的沉淀集ID
 * @param {Function} props.setSelectedDepositGroupId - 设置选中沉淀集的函数
 * @param {Function} props.renameDepositGroup - 重命名沉淀集的函数
 * @param {Function} props.replayDepositGroup - 重放沉淀集的函数
 * @param {Object} props.depositGroupReplay - 沉淀集重放状态
 */
export const DepositGroupsList = ({
  depositGroups,
  selectedDepositGroupId,
  setSelectedDepositGroupId,
  renameDepositGroup,
  replayDepositGroup,
  depositGroupReplay,
}) => {
  if (depositGroups.length === 0) {
    return (
      <p className="hint" style={{ padding: '20px', textAlign: 'center' }}>
        {UI_TEXT.t6}
      </p>
    );
  }
  return (
    <div
      className="deposit-groups-list"
      style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {depositGroups.map((group) => {
        const isSelected = selectedDepositGroupId === group.id;
        const depositCount = (group.depositIds || []).length;
        return (
          <div
            key={group.id}
            className={`section deposit-group-item ${isSelected ? 'selected' : ''}`}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: isSelected ? '#e0f2fe' : '#f8fafc',
              border: isSelected ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onClick={() => setSelectedDepositGroupId(isSelected ? '' : group.id)}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => setSelectedDepositGroupId(isSelected ? '' : group.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontWeight: 500, fontSize: '14px' }}>
                  {sanitizeText(group.name, group.id)}
                </span>
                <span className="pill muted" style={{ fontSize: '12px' }}>
                  {depositCount} 条沉淀
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="ghost xsmall"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDepositGroupId(group.id);
                    renameDepositGroup();
                  }}>
                  {UI_TEXT.t67}
                </button>
                <button
                  type="button"
                  className="ghost xsmall"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDepositGroupId(isSelected ? '' : group.id);
                  }}>
                  {isSelected ? '收起' : '展开'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * 选中沉淀集详情面板组件
 * @param {Object} props
 * @param {Array} props.depositGroups - 沉淀集列表
 * @param {string} props.selectedDepositGroupId - 当前选中的沉淀集ID
 * @param {Array} props.deposits - 沉淀列表
 * @param {Array} props.depositCategories - 归类列表
 * @param {Object} props.depositEditing - 沉淀编辑状态
 * @param {Function} props.startEditDeposit - 开始编辑沉淀的函数
 * @param {Function} props.applyDepositName - 应用沉淀名称的函数
 * @param {Function} props.handleDepositNameKeyDown - 处理沉淀名称键盘事件
 * @param {Function} props.replayDepositGroup - 重放沉淀集的函数
 * @param {Function} props.replayDeposit - 重放单个沉淀的函数
 * @param {Object} props.depositGroupReplay - 沉淀集重放状态
 * @param {Object} props.replayState - 重放状态
 * @param {Function} props.getDepositReplayStatus - 获取沉淀重放状态
 * @param {Function} props.getDepositReplayReason - 获取沉淀重放原因
 * @param {Function} props.removeDepositFromGroup - 从沉淀集移除沉淀
 * @param {Function} props.moveDepositInGroup - 调整沉淀在沉淀集中的位置
 */
export const SelectedDepositGroupPanel = ({
  depositGroups,
  selectedDepositGroupId,
  deposits,
  depositCategories = [],
  depositEditing,
  startEditDeposit,
  applyDepositName,
  handleDepositNameKeyDown,
  replayDepositGroup,
  replayDeposit,
  depositGroupReplay,
  replayState,
  getDepositReplayStatus,
  getDepositReplayReason,
  removeDepositFromGroup,
  moveDepositInGroup,
}) => {
  // 展开/收起状态
  const [expandedDeposits, setExpandedDeposits] = useState({});
  // 整个面板的展开/收起状态
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  
  const group = depositGroups.find((g) => g.id === selectedDepositGroupId);
  if (!group) return null;

  // 支持一个沉淀被多次添加到同一个沉淀集，保留重复项
  const groupDeposits = (group.depositIds || [])
    .map((id, idx) => {
      const dep = deposits.find((d) => d.id === id);
      return dep ? { ...dep, _groupIdx: idx } : null;
    })
    .filter(Boolean);

  const toggleExpand = (depositId, groupIdx) => {
    const key = `${depositId}_${groupIdx}`;
    setExpandedDeposits(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="section deposit-group-panel">
      <div
        className="section-head"
        style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          className="section-title"
          style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>
            {UI_TEXT.t15}
            {group.name}
          </span>
          <span className="pill muted">{groupDeposits.length}</span>
        </div>
        <div className="section-actions" style={{ gap: 6 }}>
          <button
            className="ghost xsmall"
            type="button"
            onClick={() => setIsPanelExpanded(prev => !prev)}>
            {isPanelExpanded ? '收起' : '展开'}
          </button>
        </div>
      </div>

      {isPanelExpanded && <div className="sections" style={{ gap: 6 }}>
        {groupDeposits.length === 0 && <div className="hint">{UI_TEXT.t16}</div>}
        {groupDeposits.map((dep, idx) => {
          const expandKey = `${dep.id}_${dep._groupIdx}`;
          const isExpanded = !!expandedDeposits[expandKey];
          
          return (
            <div key={expandKey} className="section" style={{ 
              border: '1px solid #e2e8f0', 
              borderRadius: '6px',
              background: '#fafafa'
            }}>
              <div
                className="section-head"
                style={{ 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 12px',
                  cursor: 'pointer'
                }}
                onClick={() => toggleExpand(dep.id, dep._groupIdx)}>
                <div
                  className="section-title"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'nowrap',
                    flex: 1,
                    minWidth: 0,
                  }}>
                  {/* 展开/收起图标 */}
                  <span style={{ opacity: 0.5, display: 'flex', alignItems: 'center' }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                  <span className="pill muted" style={{ minWidth: 24, textAlign: 'center' }}>{idx + 1}</span>
                  {depositEditing[`${dep.id}||name`] !== undefined ? (
                    <input
                      className="deposit-name-input"
                      value={depositEditing[`${dep.id}||name`]}
                      onChange={(e) => startEditDeposit(dep.id, 'name', e.target.value)}
                      onBlur={() => void applyDepositName(dep.id)}
                      onKeyDown={(e) => handleDepositNameKeyDown(e, dep.id)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        border: '1px solid #1a73e8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        width: '180px',
                      }}
                    />
                  ) : (
                    <span
                      className="deposit-name"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startEditDeposit(dep.id, 'name', dep.name || dep.id);
                      }}
                      title={UI_TEXT.t120}
                      style={{ cursor: 'text', fontWeight: 500, fontSize: '14px' }}>
                      {dep.name || UI_TEXT.t144}
                    </span>
                  )}
                  {/* 显示归类标签 */}
                  {dep.categoryId && depositCategories.find(c => c.id === dep.categoryId) && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        marginLeft: '4px',
                        whiteSpace: 'nowrap'
                      }}
                      title="此沉淀属于该归类"
                    >
                      {depositCategories.find(c => c.id === dep.categoryId)?.name}
                    </span>
                  )}
                  <button
                    className="icon-btn tiny"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditDeposit(dep.id, 'name', dep.name || dep.id);
                    }}
                    title={UI_TEXT.t67}
                    style={{ width: 20, height: 20, padding: 2, opacity: 0.5 }}>
                    <Edit3 size={12} />
                  </button>
                </div>
                <div className="section-actions" style={{ gap: 4, display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                  {getDepositReplayStatus(dep) ? (
                    <span
                      className={`status ${getDepositReplayStatus(dep).replace(' ', '-')}`}
                      title={getDepositReplayReason(dep) || UI_TEXT.t122}
                      style={{ fontSize: '11px', padding: '2px 6px' }}>
                      {getDepositReplayStatus(dep)}
                    </span>
                  ) : null}
                  {/* 上移按钮 */}
                  <button
                    className="icon-btn tiny"
                    type="button"
                    onClick={() => moveDepositInGroup && moveDepositInGroup(group.id, idx, idx - 1)}
                    disabled={idx === 0}
                    title="上移"
                    style={{ width: 22, height: 22, padding: 2, opacity: idx === 0 ? 0.3 : 0.6 }}>
                    <ArrowUp size={12} />
                  </button>
                  {/* 下移按钮 */}
                  <button
                    className="icon-btn tiny"
                    type="button"
                    onClick={() => moveDepositInGroup && moveDepositInGroup(group.id, idx, idx + 1)}
                    disabled={idx === groupDeposits.length - 1}
                    title="下移"
                    style={{ width: 22, height: 22, padding: 2, opacity: idx === groupDeposits.length - 1 ? 0.3 : 0.6 }}>
                    <ArrowDown size={12} />
                  </button>
                  {/* 删除按钮 */}
                  <button
                    className="icon-btn tiny"
                    type="button"
                    onClick={() => {
                      if (window.confirm(`确定要从沉淀集中移除「${dep.name || dep.id}」吗？`)) {
                        removeDepositFromGroup && removeDepositFromGroup(group.id, idx);
                      }
                    }}
                    title="从沉淀集移除"
                    style={{ width: 22, height: 22, padding: 2, opacity: 0.6, color: '#ef4444' }}>
                    <Trash2 size={12} />
                  </button>
                  <button
                    className="ghost xsmall"
                    type="button"
                    onClick={() => void replayDeposit(dep.id)}
                    disabled={!!replayState?.[dep.id]?.running}
                    style={{ fontSize: '11px', padding: '3px 8px' }}>
                    Replay
                  </button>
                </div>
              </div>
              {/* 展开内容：显示沉淀的 sections */}
              {isExpanded && (
                <div style={{ 
                  padding: '8px 12px 12px 40px', 
                  borderTop: '1px solid #e2e8f0',
                  background: '#fff',
                  fontSize: '13px'
                }}>
                  {(dep.sections || []).length === 0 ? (
                    <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>暂无记录</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(dep.sections || []).map((sec, secIdx) => (
                        <div key={sec.id || secIdx} style={{
                          padding: '6px 10px',
                          background: '#f8fafc',
                          borderRadius: '4px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                              background: '#e0e7ff', 
                              color: '#4f46e5', 
                              padding: '1px 6px', 
                              borderRadius: '3px',
                              fontSize: '11px',
                              fontWeight: 500
                            }}>
                              {secIdx + 1}
                            </span>
                            <span style={{ fontWeight: 500 }}>{sec.action || '未知操作'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>}
    </div>
  );
};

export default {
  DepositModeSelect,
  DepositGroupSelector,
  DepositGroupsList,
  SelectedDepositGroupPanel,
};
