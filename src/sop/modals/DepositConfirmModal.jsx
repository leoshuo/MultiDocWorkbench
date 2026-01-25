/**
 * DepositConfirmModal - 沉淀确认与优化弹窗
 * 从 SOPWorkbench.jsx 提取的独立组件
 */
import React from 'react';

/**
 * 沉淀确认弹窗组件
 * @param {Object} props
 * @param {Object} props.data - 沉淀确认数据
 * @param {Function} props.setData - 更新数据的函数
 * @param {number} props.selectedSectionIndex - 选中的章节索引
 * @param {Function} props.setSelectedSectionIndex - 设置选中章节索引
 * @param {Function} props.onCancel - 取消回调
 * @param {Function} props.onDiscard - 放弃录制回调
 * @param {Function} props.onConfirm - 确认保存回调
 * @param {Function} props.onAIProcess - AI优化处理回调
 * @param {Function} props.getScriptForSection - 获取章节脚本函数
 * @param {Function} props.updateScriptForSection - 更新章节脚本函数
 * @param {boolean} props.isEditMode - 是否为编辑模式（编辑现有沉淀）
 */
export const DepositConfirmModal = ({
  data,
  setData,
  selectedSectionIndex,
  setSelectedSectionIndex,
  onCancel,
  onDiscard,
  onConfirm,
  onAIProcess,
  getScriptForSection,
  updateScriptForSection,
  isEditMode = false,
}) => {
  if (!data) return null;

  const isLlmMode = data.precipitationMode === 'llm';

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          width: '900px', 
          maxWidth: '95vw', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column' 
        }}
      >
        {/* 头部 */}
        <div className="modal-head">
          <h3>{isEditMode ? '✏️ 编辑沉淀' : '📝 沉淀确认与优化'}</h3>
          <button className="ghost xsmall" type="button" onClick={onCancel}>✕</button>
        </div>
        
        {/* 主体 */}
        <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {/* 第一行：沉淀名称 + 沉淀模式 */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>
                沉淀名称
              </label>
              <input
                type="text"
                value={data.depositName || ''}
                onChange={(e) => setData(prev => ({ ...prev, depositName: e.target.value }))}
                placeholder="请输入沉淀名称"
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px', 
                  fontSize: '14px' 
                }}
              />
            </div>
            <div style={{ width: '200px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>
                沉淀模式
              </label>
              <select
                value={data.precipitationMode || 'llm'}
                onChange={(e) => setData(prev => ({ ...prev, precipitationMode: e.target.value }))}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px', 
                  fontSize: '14px', 
                  background: '#fff' 
                }}
              >
                <option value="llm">🤖 大模型Replay</option>
                <option value="script">📜 脚本Replay</option>
              </select>
            </div>
          </div>

          {/* 沉淀模式说明 */}
          <div style={{ 
            marginBottom: '16px', 
            padding: '10px 14px', 
            background: isLlmMode ? '#eff6ff' : '#fef3c7',
            border: `1px solid ${isLlmMode ? '#bfdbfe' : '#fcd34d'}`,
            borderRadius: '6px',
            fontSize: '13px'
          }}>
            {isLlmMode ? (
              <><b>🤖 大模型Replay</b>：Replay 时 AI 会理解沉淀内容，结合当前上下文智能执行，适应性强。如无法执行会告知原因后尝试脚本Replay</>
            ) : (
              <><b>📜 脚本Replay</b>：Replay 时严格按照录制的脚本执行，要求字段完全匹配</>
            )}
          </div>

          {/* 录制的步骤摘要 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>
              录制的操作（共 {data.sections?.length || 0} 步）
              <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>点击查看对应脚本</span>
            </label>
            <div style={{ 
              background: '#f9fafb', 
              border: '1px solid #e5e7eb', 
              borderRadius: '6px', 
              padding: '8px', 
              maxHeight: '120px', 
              overflow: 'auto' 
            }}>
              {/* 全部显示选项 */}
              <div 
                onClick={() => setSelectedSectionIndex(-1)}
                style={{ 
                  padding: '6px 10px', 
                  marginBottom: '4px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: selectedSectionIndex === -1 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : 'transparent',
                  color: selectedSectionIndex === -1 ? '#fff' : '#6b7280',
                  fontWeight: selectedSectionIndex === -1 ? 500 : 400,
                  transition: 'all 0.2s'
                }}
              >
                📋 全部步骤
              </div>
              {/* 各个 section */}
              {data.sections?.map((s, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedSectionIndex(i)}
                  style={{ 
                    padding: '6px 10px', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: selectedSectionIndex === i 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      : 'transparent',
                    color: selectedSectionIndex === i ? '#fff' : '#111827',
                    fontWeight: selectedSectionIndex === i ? 500 : 400,
                    transition: 'all 0.2s',
                    marginBottom: i < data.sections.length - 1 ? '2px' : '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>
                    <span style={{ marginRight: '8px', opacity: 0.7 }}>{i + 1}.</span>
                    <span>{s.action || s.generalizedTitle || '操作'}</span>
                  </span>
                  {/* 校验模式标记 */}
                  <span 
                    style={{ 
                      fontSize: '10px', 
                      padding: '2px 6px', 
                      borderRadius: '3px',
                      background: selectedSectionIndex === i 
                        ? 'rgba(255,255,255,0.2)' 
                        : (data.validationMode === 'strict' ? '#fef3c7' : '#f0fdf4'),
                      color: selectedSectionIndex === i 
                        ? '#fff' 
                        : (data.validationMode === 'strict' ? '#b45309' : '#059669'),
                      opacity: 0.9
                    }}
                    title={data.validationMode === 'strict' 
                      ? '强校验：必须满足相似特征才执行' 
                      : '不校验：努力找到目标位置执行'}
                  >
                    {data.validationMode === 'strict' ? '🔒强校验' : '🔓不校验'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 结构化沉淀脚本 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 500, color: '#374151' }}>
                结构化沉淀脚本
                <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>
                  {selectedSectionIndex >= 0 
                    ? `（当前显示：步骤 ${selectedSectionIndex + 1}）`
                    : (isLlmMode 
                        ? '（可编辑，AI 优化结果将显示在此）' 
                        : '（可编辑，Replay 时将严格执行此脚本）')
                  }
                </span>
              </label>
              {/* 校验模式下拉框 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Replay校验</span>
                <select
                  value={data.validationMode || 'none'}
                  onChange={(e) => setData(prev => ({ ...prev, validationMode: e.target.value }))}
                  title={data.validationMode === 'strict' 
                    ? '强校验：必须校验满足相似的前后特征或相似内容才可处理，较容易导致 pass' 
                    : '不校验：不做强制校验要求，基于提供信息努力找到目标位置并执行'}
                  style={{ 
                    padding: '4px 10px', 
                    border: `1px solid ${data.validationMode === 'strict' ? '#f59e0b' : '#d1d5db'}`,
                    borderRadius: '4px', 
                    fontSize: '13px', 
                    background: data.validationMode === 'strict' ? '#fffbeb' : '#fff',
                    color: data.validationMode === 'strict' ? '#b45309' : '#374151',
                    cursor: 'pointer'
                  }}
                >
                  <option value="none">🔓 不校验</option>
                  <option value="strict">🔒 强校验</option>
                </select>
              </div>
            </div>
            <textarea
              value={selectedSectionIndex >= 0 
                ? getScriptForSection(data.structuredScript, selectedSectionIndex)
                : (data.structuredScript || '')
              }
              onChange={(e) => {
                if (selectedSectionIndex >= 0) {
                  const updatedScript = updateScriptForSection(
                    data.structuredScript, 
                    selectedSectionIndex, 
                    e.target.value
                  );
                  setData(prev => ({ ...prev, structuredScript: updatedScript }));
                } else {
                  setData(prev => ({ ...prev, structuredScript: e.target.value }));
                }
              }}
              placeholder={isLlmMode 
                ? '点击下方「AI 智能优化」按钮，AI 将根据录制的操作生成结构化脚本...\n\n您也可以直接在此编辑脚本内容。'
                : '请输入或编辑结构化脚本，Replay 时将按此脚本执行...'}
              style={{ 
                width: '100%', 
                height: '220px', 
                padding: '12px', 
                border: `1px solid ${data.structuredScript ? '#a7f3d0' : '#d1d5db'}`,
                borderRadius: '6px', 
                fontSize: '13px',
                background: data.structuredScript ? '#f0fdf4' : '#fff',
                color: '#1f2937',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                resize: 'vertical',
                lineHeight: '1.5'
              }}
            />
          </div>

          {/* 大模型沉淀时显示 AI 优化区域 */}
          {isLlmMode && (
            <>
              {/* 补充要求 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#374151' }}>
                  修改指示（可选）
                  <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>告诉 AI 如何调整脚本</span>
                </label>
                <textarea
                  value={data.userRequirements || ''}
                  onChange={(e) => setData(prev => ({ ...prev, userRequirements: e.target.value }))}
                  placeholder="例如：把职称去掉，只留下名字；第2步改为通用描述..."
                  style={{ 
                    width: '100%', 
                    height: '50px', 
                    padding: '10px 12px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px', 
                    fontSize: '14px', 
                    resize: 'vertical' 
                  }}
                />
              </div>

              {/* AI 优化按钮 */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={onAIProcess}
                  disabled={data.isProcessing}
                  style={{
                    background: data.isProcessing 
                      ? '#9ca3af' 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    cursor: data.isProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {data.isProcessing 
                    ? '⏳ AI 处理中...' 
                    : (data.structuredScript ? '🔄 AI 重新优化' : '✨ AI 智能优化')}
                </button>
                <span style={{ color: '#6b7280', fontSize: '13px' }}>
                  {data.structuredScript 
                    ? '将基于当前脚本和修改指示重新优化' 
                    : '将录制内容转化为可复用的结构化脚本'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="modal-foot" style={{ 
          borderTop: '1px solid #e5e7eb', 
          padding: '12px 16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {isLlmMode 
              ? '🤖 大模型Replay：AI 智能执行' 
              : '📜 脚本Replay：严格匹配执行'}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="ghost small" 
              type="button" 
              onClick={onCancel}
              style={{ padding: '8px 16px' }}
            >
              取消
            </button>
            {!isEditMode && (
              <button 
                className="ghost small" 
                type="button" 
                onClick={onDiscard}
                style={{ padding: '8px 16px', color: '#dc2626' }}
              >
                放弃录制
              </button>
            )}
            <button 
              type="button" 
              onClick={onConfirm}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              {isEditMode ? '✓ 保存修改' : '✓ 确认保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositConfirmModal;
