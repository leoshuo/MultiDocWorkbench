/**
 * UpdateGroupModal - 更新沉淀集弹窗
 * 从 SOPWorkbench.jsx 提取的独立组件
 */
import React from 'react';

/**
 * 更新沉淀集弹窗组件
 * @param {Object} props
 * @param {boolean} props.show - 是否显示
 * @param {Function} props.onClose - 关闭回调
 * @param {Array} props.depositGroups - 沉淀集列表
 * @param {Array} props.selectedGroupIds - 已选中的沉淀集ID列表
 * @param {Function} props.setSelectedGroupIds - 设置选中列表
 * @param {number} props.selectedDepositCount - 已选中的沉淀数量
 * @param {Function} props.onConfirm - 确认回调
 */
export const UpdateGroupModal = ({
  show,
  onClose,
  depositGroups,
  selectedGroupIds,
  setSelectedGroupIds,
  selectedDepositCount,
  onConfirm,
}) => {
  if (!show) return null;

  const handleToggle = (groupId, checked) => {
    if (checked) {
      setSelectedGroupIds(prev => [...prev, groupId]);
    } else {
      setSelectedGroupIds(prev => prev.filter(id => id !== groupId));
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ width: '450px', maxWidth: '90vw' }}
      >
        {/* 头部 */}
        <div className="modal-head">
          <h3>📦 选择要并入的沉淀集</h3>
          <button className="ghost xsmall" type="button" onClick={onClose}>✕</button>
        </div>
        
        {/* 主体 */}
        <div className="modal-body" style={{ padding: '16px', maxHeight: '400px', overflow: 'auto' }}>
          <p style={{ marginBottom: '12px', color: '#6b7280', fontSize: '13px' }}>
            已选择 {selectedDepositCount} 个沉淀，请选择要并入的沉淀集（可多选）：
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {depositGroups.map((group, idx) => {
              const isSelected = selectedGroupIds.includes(group.id);
              return (
                <label 
                  key={group.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    padding: '10px 12px',
                    background: isSelected ? '#eff6ff' : '#f9fafb',
                    border: isSelected ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleToggle(group.id, e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ flex: 1, fontWeight: 500, color: '#374151' }}>
                    {idx + 1}. {group.name}
                  </span>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {(group.depositIds || []).length} 个沉淀
                  </span>
                </label>
              );
            })}
          </div>
          
          {depositGroups.length === 0 && (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>
              暂无沉淀集
            </p>
          )}
        </div>
        
        {/* 底部 */}
        <div className="modal-foot" style={{ 
          borderTop: '1px solid #e5e7eb', 
          padding: '12px 16px', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '12px' 
        }}>
          <button 
            className="ghost small" 
            type="button" 
            onClick={onClose}
            style={{ padding: '8px 16px' }}
          >
            取消
          </button>
          <button 
            type="button" 
            onClick={onConfirm}
            disabled={selectedGroupIds.length === 0}
            style={{
              background: selectedGroupIds.length === 0 
                ? '#d1d5db' 
                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: selectedGroupIds.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            确认并入
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateGroupModal;
