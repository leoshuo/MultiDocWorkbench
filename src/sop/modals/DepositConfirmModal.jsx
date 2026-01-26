/**
 * DepositConfirmModal - 沉淀确认与优化弹窗
 * 从 SOPWorkbench.jsx 提取的独立组件
 */
import React, { useState, useMemo } from 'react';

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
  // 脚本视图模式：'llm' 显示大模型记录内容（默认），'script' 显示结构化脚本
  const [scriptViewMode, setScriptViewMode] = useState('llm');
  
  if (!data) return null;

  const isLlmMode = data.precipitationMode === 'llm';
  
  // 生成大模型记录内容（从 sections 中提取 llmScript 信息 + 结构化脚本内容）
  const llmRecordContent = useMemo(() => {
    if (!data.sections || data.sections.length === 0) return '暂无大模型记录';
    
    // 辅助函数：生成单个步骤的完整大模型记录
    const generateStepRecord = (section, idx) => {
      const llm = section.llmScript || {};
      const originalScript = section.originalScript || {};
      const meta = section.meta || {};
      const lines = [];
      
      lines.push(`=== 步骤 ${idx + 1}: ${section.action || section.generalizedTitle || '操作'} ===`);
      
      // ========== 核心字段（大模型记录） ==========
      if (llm.type || meta.type) lines.push(`【操作类型】${llm.type || meta.type}`);
      if (llm.description || meta.actionDescription) lines.push(`【描述】${llm.description || meta.actionDescription}`);
      if (llm.docName || meta.docName) lines.push(`【文档名称】${llm.docName || meta.docName}`);
      if (llm.docSelector) lines.push(`【文档选择器】${JSON.stringify(llm.docSelector)}`);
      if (llm.targetSectionTitle || meta.targetSectionTitle) lines.push(`【目标标题】${llm.targetSectionTitle || meta.targetSectionTitle}`);
      if (llm.targetSectionId || meta.sectionId) lines.push(`【目标标题ID】${llm.targetSectionId || meta.sectionId}`);
      
      // ========== 指令与指导 ==========
      if (llm.instructions || meta.instructions) lines.push(`【指令】${llm.instructions || meta.instructions}`);
      if (llm.promptContent || meta.promptContent) lines.push(`【Prompt内容】${llm.promptContent || meta.promptContent}`);
      if (llm.aiGuidance || meta.aiGuidance) lines.push(`【AI指导】${llm.aiGuidance || meta.aiGuidance}`);
      if (llm.specialRequirements || meta.specialRequirements) lines.push(`【特殊要求】${llm.specialRequirements || meta.specialRequirements}`);
      
      // ========== 输入来源信息 ==========
      if (llm.inputSourceDesc || meta.inputSourceDesc) lines.push(`【输入来源】${llm.inputSourceDesc || meta.inputSourceDesc}`);
      if (llm.contextSummary) lines.push(`【上下文摘要】${llm.contextSummary}`);
      if (llm.flexKeywords) lines.push(`【灵活匹配关键词】${llm.flexKeywords}`);
      
      // ========== 内容特征（用于 Replay 定位） ==========
      if (llm.contentStart || meta.contentStart) lines.push(`【内容开头】${llm.contentStart || meta.contentStart}`);
      if (llm.contentEnd || meta.contentEnd) lines.push(`【内容结尾】${llm.contentEnd || meta.contentEnd}`);
      if (llm.contextBefore || meta.contextBefore) lines.push(`【前文上下文】${llm.contextBefore || meta.contextBefore}`);
      if (llm.contextAfter || meta.contextAfter) lines.push(`【后文上下文】${llm.contextAfter || meta.contextAfter}`);
      
      // ========== 执行结果 ==========
      if (llm.result || meta.result) lines.push(`【执行结果】${llm.result || meta.result}`);
      if (meta.outputs?.summary) lines.push(`【输出摘要】${meta.outputs.summary}`);
      
      // ========== 结构化脚本内容（完整保留） ==========
      const scriptContent = llm.structuredScriptContent || llm.rawContent || originalScript.content || section.content;
      if (scriptContent) {
        // 清理 __REPLAY_META__ 标记后的内容
        const cleanContent = scriptContent.split('__REPLAY_META__')[0].trim();
        if (cleanContent && !lines.some(l => l.includes(cleanContent.substring(0, 50)))) {
          lines.push(`\n【完整脚本记录】\n${cleanContent}`);
        }
      }
      
      // ========== 原始 Meta 数据（JSON格式，用于调试/完整性） ==========
      const hasMeaningfulMeta = meta && Object.keys(meta).filter(k => 
        meta[k] !== null && meta[k] !== undefined && meta[k] !== ''
      ).length > 0;
      
      if (hasMeaningfulMeta) {
        // 只保留关键字段，避免内容过长
        const compactMeta = {};
        ['type', 'buttonAction', 'docName', 'sectionId', 'targetSectionTitle', 'buttonId', 'overwritten', 'source'].forEach(key => {
          if (meta[key] !== null && meta[key] !== undefined && meta[key] !== '') {
            compactMeta[key] = meta[key];
          }
        });
        if (Object.keys(compactMeta).length > 0) {
          lines.push(`\n【原始回放参数】${JSON.stringify(compactMeta)}`);
        }
      }
      
      return lines.length > 1 ? lines.join('\n') : `=== 步骤 ${idx + 1}: ${section.action || '操作'} ===\n（暂无大模型记录）`;
    };
    
    // 如果选中了某个步骤，只显示该步骤的大模型记录
    if (selectedSectionIndex >= 0) {
      const section = data.sections[selectedSectionIndex];
      if (!section) return '该步骤暂无大模型记录';
      return generateStepRecord(section, selectedSectionIndex);
    }
    
    // 显示所有步骤的大模型记录
    return data.sections.map((section, idx) => generateStepRecord(section, idx)).join('\n\n---\n\n');
  }, [data.sections, selectedSectionIndex]);

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
                onChange={(e) => {
                  const newMode = e.target.value;
                  // 同时更新所有 section 的 sectionReplayMode
                  const updatedSections = (data.sections || []).map(s => ({
                    ...s,
                    sectionReplayMode: newMode
                  }));
                  setData(prev => ({ 
                    ...prev, 
                    precipitationMode: newMode,
                    sections: updatedSections
                  }));
                }}
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
              {data.sections?.map((s, i) => {
                // 获取该 section 的 replay 模式，优先使用 section 级别设置
                const sectionMode = s.sectionReplayMode || data.precipitationMode || 'llm';
                const isSectionLlm = sectionMode === 'llm';
                
                return (
                  <div 
                    key={i} 
                    style={{ 
                      padding: '6px 10px', 
                      borderRadius: '4px',
                      background: selectedSectionIndex === i 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                        : 'transparent',
                      color: selectedSectionIndex === i ? '#fff' : '#111827',
                      fontWeight: selectedSectionIndex === i ? 500 : 400,
                      transition: 'all 0.2s',
                      marginBottom: i < data.sections.length - 1 ? '2px' : '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <span 
                      onClick={() => setSelectedSectionIndex(i)}
                      style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <span style={{ marginRight: '8px', opacity: 0.7 }}>{i + 1}.</span>
                      <span>{s.action || s.generalizedTitle || '操作'}</span>
                    </span>
                    {/* 每个 section 的 replay 模式下拉框 */}
                    <select
                      value={sectionMode}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        const newSectionMode = e.target.value;
                        const updatedSections = [...(data.sections || [])];
                        updatedSections[i] = { ...updatedSections[i], sectionReplayMode: newSectionMode };
                        setData(prev => ({ ...prev, sections: updatedSections }));
                      }}
                      style={{
                        padding: '2px 6px',
                        fontSize: '10px',
                        borderRadius: '3px',
                        border: `1px solid ${isSectionLlm ? '#93c5fd' : '#fcd34d'}`,
                        background: selectedSectionIndex === i 
                          ? 'rgba(255,255,255,0.9)' 
                          : (isSectionLlm ? '#eff6ff' : '#fffbeb'),
                        color: isSectionLlm ? '#1d4ed8' : '#b45309',
                        cursor: 'pointer',
                        minWidth: '80px'
                      }}
                      title={isSectionLlm ? '大模型Replay：AI 智能执行' : '脚本Replay：严格匹配执行'}
                    >
                      <option value="llm">🤖 大模型</option>
                      <option value="script">📜 脚本</option>
                    </select>
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
                );
              })}
            </div>
          </div>

          {/* 脚本内容区域 - 支持切换结构化脚本/大模型记录 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              {/* 左侧：视图模式下拉框 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={scriptViewMode}
                  onChange={(e) => setScriptViewMode(e.target.value)}
                  style={{ 
                    padding: '4px 12px', 
                    border: '1px solid #d1d5db',
                    borderRadius: '4px', 
                    fontSize: '14px', 
                    fontWeight: 500,
                    background: scriptViewMode === 'llm' ? '#eff6ff' : '#f0fdf4',
                    color: '#374151',
                    cursor: 'pointer'
                  }}
                >
                  <option value="script">📜 结构化脚本内容</option>
                  <option value="llm">🤖 大模型记录内容</option>
                </select>
                <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '13px' }}>
                  {selectedSectionIndex >= 0 
                    ? `（当前显示：步骤 ${selectedSectionIndex + 1}）`
                    : (scriptViewMode === 'llm'
                        ? '（只读，查看各步骤的大模型记录）'
                        : (isLlmMode 
                            ? '（可编辑，AI 优化结果将显示在此）' 
                            : '（可编辑，Replay 时将严格执行此脚本）')
                      )
                  }
                </span>
              </div>
              {/* 右侧：校验模式下拉框（仅在结构化脚本视图时显示） */}
              {scriptViewMode === 'script' && (
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
              )}
            </div>
            
            {/* 根据视图模式显示不同内容 */}
            {scriptViewMode === 'script' ? (
              /* 结构化脚本内容 - 可编辑 */
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
                placeholder={'请输入或编辑结构化脚本，Replay 时将按此脚本执行...'}
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
            ) : (
              /* 大模型记录内容 - 可编辑 */
              <div style={{ position: 'relative' }}>
                <textarea
                  value={data.llmRecordContent || (data.autoProcessing ? '' : llmRecordContent)}
                  onChange={(e) => {
                    setData(prev => ({ ...prev, llmRecordContent: e.target.value }));
                  }}
                  placeholder={data.autoProcessing 
                    ? '⏳ AI 正在自动生成结构化的大模型记录...'
                    : '大模型记录内容，可编辑后进行 AI 优化...'}
                  disabled={data.autoProcessing}
                  style={{ 
                    width: '100%', 
                    height: '220px', 
                    padding: '12px', 
                    border: `1px solid ${data.llmRecordContent ? '#93c5fd' : '#bfdbfe'}`,
                    borderRadius: '6px', 
                    fontSize: '13px',
                    background: data.autoProcessing ? '#f3f4f6' : '#eff6ff',
                    color: data.autoProcessing ? '#9ca3af' : '#1e40af',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    resize: 'vertical',
                    lineHeight: '1.5'
                  }}
                />
                {data.autoProcessing && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '16px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    color: '#667eea'
                  }}>
                    <span style={{ fontSize: '20px' }}>⏳</span>
                    <span>AI 正在自动生成结构化记录...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI 优化区域 - 根据当前视图模式进行优化 */}
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
                onClick={() => onAIProcess(scriptViewMode)}
                disabled={data.isProcessing}
                style={{
                  background: data.isProcessing 
                    ? '#9ca3af' 
                    : (scriptViewMode === 'llm' 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'),
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
                  : (scriptViewMode === 'llm' 
                      ? (data.llmRecordContent ? '🔄 AI 重新优化大模型记录' : '🤖 大模型Replay：AI 智能执行')
                      : (data.structuredScript ? '🔄 AI 重新优化脚本' : '📜 脚本Replay 优化')
                    )
                }
              </button>
              <span style={{ color: '#6b7280', fontSize: '13px' }}>
                {scriptViewMode === 'llm' 
                  ? (data.llmRecordContent 
                      ? '基于大模型记录内容和修改指示优化，结果写回大模型记录' 
                      : '将录制内容转化为大模型可理解的结构化记录')
                  : (data.structuredScript 
                      ? '基于脚本内容和修改指示优化，结果写回脚本记录' 
                      : '将录制内容转化为可复用的结构化脚本')
                }
              </span>
            </div>
          </>
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
