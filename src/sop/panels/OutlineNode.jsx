/**
 * OutlineNode - 大纲节点渲染组件
 * 从 SOPWorkbench.jsx 提取的独立组件
 */
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { UI_TEXT } from '../SOPConstants';

/**
 * 大纲节点组件
 * @param {Object} props
 * @param {Object} props.node - 节点数据 { section, index, children }
 * @param {Object} props.levelLabel - 层级标签映射
 * @param {Object} props.outlineEditing - 大纲编辑状态
 * @param {Object} props.sectionDocLinks - 章节关联文档
 * @param {Object} props.sectionDocDone - 章节文档完成状态
 * @param {Object} props.sectionDocPick - 章节选择的文档
 * @param {boolean} props.showOutlineMode - 是否显示大纲模式
 * @param {string} props.processingTab - 当前处理标签
 * @param {Object} props.selectedOutlineExec - 选中执行的大纲
 * @param {Object} props.sectionCollapsed - 章节折叠状态
 * @param {Object} props.summaryExpanded - 摘要展开状态
 * @param {Array} props.docs - 文档列表
 * @param {Function} props.isSectionHiddenByParent - 检查章节是否被父级隐藏
 * @param {Function} props.updateSectionLevel - 更新章节层级
 * @param {Function} props.setOutlineEditing - 设置大纲编辑状态
 * @param {Function} props.applyOutlineUpdate - 应用大纲更新
 * @param {Function} props.cancelEditOutline - 取消编辑大纲
 * @param {Function} props.startEditOutline - 开始编辑大纲
 * @param {Function} props.setSelectedOutlineExec - 设置选中执行的大纲
 * @param {Function} props.addSectionBelow - 在下方添加章节
 * @param {Function} props.removeSectionById - 删除章节
 * @param {Function} props.hasChildSections - 检查是否有子章节
 * @param {Function} props.toggleSectionCollapse - 切换章节折叠
 * @param {Function} props.clearOutlineSummary - 清除大纲摘要
 * @param {Function} props.setSummaryExpanded - 设置摘要展开状态
 * @param {Function} props.setSectionDocPick - 设置章节文档选择
 * @param {Function} props.addDocToSection - 添加文档到章节
 * @param {Function} props.removeDocFromSection - 从章节移除文档
 * @param {Function} props.copyPreviewToSummary - 复制预览到摘要
 * @param {Function} props.addSummaryToSection - 在章节添加新摘要
 * @param {Function} props.removeSummaryFromSection - 从章节删除摘要
 * @param {Function} props.copyPreviewToSummaryAtIndex - 复制预览到指定索引的摘要
 * @param {Object} props.sectionMergeType - 章节合并方式选择状态
 * @param {Function} props.selectSectionMergeType - 选择章节合并方式（不立即执行）
 * @param {Function} props.renderOutlineNode - 递归渲染函数（用于渲染子节点）
 */
export const OutlineNode = ({
  node,
  levelLabel,
  outlineEditing,
  sectionDocLinks,
  sectionDocDone,
  sectionDocPick,
  showOutlineMode,
  processingTab,
  selectedOutlineExec,
  sectionCollapsed,
  summaryExpanded,
  sectionMergeType,
  selectedSummaries,
  docs,
  isSectionHiddenByParent,
  updateSectionLevel,
  setOutlineEditing,
  applyOutlineUpdate,
  cancelEditOutline,
  startEditOutline,
  setSelectedOutlineExec,
  addSectionBelow,
  removeSectionById,
  hasChildSections,
  toggleSectionCollapse,
  clearOutlineSummary,
  setSummaryExpanded,
  setSelectedSummaries,
  setSectionDocPick,
  addDocToSection,
  removeDocFromSection,
  copyPreviewToSummary,
  addSummaryToSection,
  removeSummaryFromSection,
  copyPreviewToSummaryAtIndex,
  selectSectionMergeType,
  renderOutlineNode,
}) => {
  // 检查是否应该被隐藏
  if (isSectionHiddenByParent(node.index)) {
    return null;
  }

  const sec = node.section;
  const level = sec?.level || 1;
  const prefix = levelLabel[level] || levelLabel[1];
  const titleKey = `${sec.id}||title`;
  const editingTitle = outlineEditing[titleKey];
  const linkedDocIds = sectionDocLinks[sec.id] || [];
  const doneMap = sectionDocDone[sec.id] || {};
  const storedPickDocId = sectionDocPick[sec.id] || '';
  const pickDocId = storedPickDocId || linkedDocIds[linkedDocIds.length - 1] || '';

  // 多摘要支持：获取 summaries 数组，向后兼容单 summary 字段
  const getSummaries = () => {
    if (Array.isArray(sec.summaries) && sec.summaries.length > 0) {
      return sec.summaries;
    }
    // 向后兼容：如果有单个 summary，转换为数组
    if (sec.summary || sec.hint) {
      return [{ id: `${sec.id}_sum_0`, content: sec.summary || sec.hint || '' }];
    }
    return [];
  };
  const summaries = getSummaries();

  const canCopyFullToSummary =
    showOutlineMode &&
    processingTab !== 'records' &&
    !!pickDocId &&
    (linkedDocIds || []).includes(pickDocId);

  return (
    <div
      key={sec.id}
      className={`section outline-node level-${Number(level) || 1}`}
      style={{ position: 'relative' }}>
      <div
        className="section-head"
        style={{ alignItems: 'center', justifyContent: 'space-between', paddingRight: '100px' }}>
        <div
          className="section-title"
          style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {editingTitle !== undefined ? (
            <>
              <select
                value={level}
                onChange={(e) => updateSectionLevel(sec.id, e.target.value)}
                className="level-select">
                <option value="1">{UI_TEXT.t17}</option>
                <option value="2">{UI_TEXT.t18}</option>
                <option value="3">{UI_TEXT.t19}</option>
                <option value="4">{UI_TEXT.t20}</option>
              </select>
              <input
                value={editingTitle}
                onChange={(e) =>
                  setOutlineEditing((prev) => ({ ...prev, [titleKey]: e.target.value }))
                }
                style={{ minWidth: 200 }}
              />
              <button
                className="ghost small"
                onClick={() => applyOutlineUpdate(sec.id, 'title', editingTitle)}>
                {UI_TEXT.t21}
              </button>
              <button className="ghost small" onClick={() => cancelEditOutline(sec.id, 'title')}>
                {UI_TEXT.t22}
              </button>
            </>
          ) : (
            <>
              <span>{`${prefix}：${sec.title}`}</span>
              <button
                className="ghost xsmall"
                style={{ fontSize: '11px', padding: '2px 6px' }}
                onClick={() => startEditOutline(sec.id, 'title', sec.title || '')}>
                {UI_TEXT.t23}
              </button>
            </>
          )}
        </div>

        <div
          className="section-actions btn-compact"
          style={{ position: 'absolute', right: '8px', top: '8px', display: 'flex', alignItems: 'center', gap: '2px' }}>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={!!selectedOutlineExec[sec.id]}
              onChange={(e) =>
                setSelectedOutlineExec((prev) => ({ ...prev, [sec.id]: e.target.checked }))
              }
            />
          </label>
          <button 
            className="ghost xsmall" 
            type="button" 
            onClick={() => addSectionBelow(sec.id)}
            style={{ width: '20px', height: '20px', padding: 0, fontSize: '14px', lineHeight: '18px', fontWeight: 'bold' }}
            title="在同级标题末尾新增">
            +
          </button>
          <button 
            className="ghost xsmall" 
            type="button" 
            onClick={() => removeSectionById(sec.id)}
            style={{ width: '20px', height: '20px', padding: 0, fontSize: '14px', lineHeight: '18px', fontWeight: 'bold' }}
            title="删除此标题及其下级">
            −
          </button>
          {/* 展开/收起按钮 - 仅当有下级标题时显示 */}
          {hasChildSections(sec.id) && (
            <button
              className="ghost xsmall"
              type="button"
              onClick={() => toggleSectionCollapse(sec.id)}
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                minWidth: '36px',
                color: sectionCollapsed[sec.id] ? '#0ea5e9' : '#64748b',
              }}
              title={sectionCollapsed[sec.id] ? '展开下级标题' : '收起下级标题'}>
              {sectionCollapsed[sec.id] ? '展开' : '收起'}
            </button>
          )}
        </div>
      </div>

      {/* 多摘要支持：渲染所有摘要 */}
      <div className="summaries-container" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {summaries.length === 0 ? (
          /* 无摘要时显示添加按钮和占位提示 */
          <div
            className="hint"
            style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="ghost xsmall"
              type="button"
              onClick={() => addSummaryToSection && addSummaryToSection(sec.id)}
              style={{ 
                width: '20px', height: '20px', padding: 0, 
                fontSize: '14px', lineHeight: '18px', fontWeight: 'bold',
                color: '#10b981', border: '1px dashed #10b981', borderRadius: '4px'
              }}
              title="添加摘要">
              +
            </button>
            <span style={{ color: '#9ca3af', fontSize: '13px' }}>{UI_TEXT.t127}</span>
          </div>
        ) : (
          summaries.map((sum, sumIdx) => {
            const summaryKey = `${sec.id}||summary||${sumIdx}`;
            const editingSummary = outlineEditing[summaryKey];
            const isExpanded = summaryExpanded[`${sec.id}_${sumIdx}`];
            const summaryCheckKey = `${sec.id}_${sumIdx}`;
            const isSummarySelected = selectedSummaries?.[summaryCheckKey] || false;
            
            return (
              <div
                key={sum.id || sumIdx}
                className="hint summary-item"
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: 8, 
                  flexWrap: 'wrap',
                  padding: summaries.length > 1 ? '6px 8px' : '0',
                  background: isSummarySelected 
                    ? '#dbeafe' 
                    : (summaries.length > 1 ? (sumIdx % 2 === 0 ? '#f9fafb' : '#fff') : 'transparent'),
                  borderRadius: summaries.length > 1 ? '6px' : '0',
                  border: isSummarySelected 
                    ? '2px solid #3b82f6' 
                    : (summaries.length > 1 ? '1px solid #e5e7eb' : 'none'),
                  position: 'relative'
                }}>
                {/* 摘要多选框 */}
                <input
                  type="checkbox"
                  checked={isSummarySelected}
                  onChange={(e) => {
                    setSelectedSummaries && setSelectedSummaries((prev) => ({
                      ...prev,
                      [summaryCheckKey]: e.target.checked
                    }));
                  }}
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    flexShrink: 0, 
                    marginTop: '3px',
                    cursor: 'pointer',
                    accentColor: '#3b82f6'
                  }}
                  title="选中此摘要用于填入内容"
                />
                {/* 摘要左侧的 + 按钮 */}
                <button
                  className="ghost xsmall"
                  type="button"
                  onClick={() => addSummaryToSection && addSummaryToSection(sec.id, sumIdx + 1)}
                  style={{ 
                    width: '18px', height: '18px', padding: 0, 
                    fontSize: '12px', lineHeight: '16px', fontWeight: 'bold',
                    color: '#10b981', border: '1px dashed #10b981', borderRadius: '3px',
                    flexShrink: 0, marginTop: '2px'
                  }}
                  title="在此摘要后添加新摘要">
                  +
                </button>
                
                {editingSummary !== undefined ? (
                  <>
                    <textarea
                      rows={2}
                      value={editingSummary}
                      onChange={(e) =>
                        setOutlineEditing((prev) => ({ ...prev, [summaryKey]: e.target.value }))
                      }
                      style={{ minWidth: 260, flex: 1 }}
                    />
                    <button
                      className="ghost small"
                      onClick={() => applyOutlineUpdate(sec.id, 'summary', editingSummary, sumIdx)}>
                      {UI_TEXT.t24}
                    </button>
                    <button className="ghost small" onClick={() => cancelEditOutline(sec.id, 'summary', sumIdx)}>
                      {UI_TEXT.t22}
                    </button>
                  </>
                ) : (
                  <>
                    <div 
                      className={`summary-text ${isExpanded ? 'expanded' : ''}`}
                      style={{ flex: 1, minWidth: 0, color: sum.content ? 'inherit' : '#9ca3af' }}>
                      {sum.content || UI_TEXT.t127}
                    </div>
                    {/* 展开/删除/编辑按钮 - 始终显示 */}
                    {sum.content && (
                      <button
                        className="ghost xsmall"
                        type="button"
                        style={{ fontSize: '11px', padding: '2px 6px' }}
                        onClick={() =>
                          setSummaryExpanded((prev) => ({ ...prev, [`${sec.id}_${sumIdx}`]: !prev[`${sec.id}_${sumIdx}`] }))
                        }>
                        {isExpanded ? UI_TEXT.t142 : UI_TEXT.t143}
                      </button>
                    )}
                    <button
                      className="ghost xsmall"
                      style={{ fontSize: '11px', padding: '2px 6px', color: '#ef4444' }}
                      type="button"
                      onClick={() => removeSummaryFromSection && removeSummaryFromSection(sec.id, sumIdx)}
                      title="删除此摘要">
                      {UI_TEXT.t25}
                    </button>
                    <button
                      className="ghost xsmall"
                      style={{ fontSize: '11px', padding: '2px 6px' }}
                      onClick={() => startEditOutline(sec.id, 'summary', sum.content || '', sumIdx)}>
                      {UI_TEXT.t26}
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}
        {/* 多摘要合并方式选择 - 当有多个摘要时显示，点击选择合并方式（高亮），实际合并在最终文档生成时执行 */}
        {summaries.length > 1 && (
          <div 
            className="merge-actions"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginTop: '4px',
              padding: '4px 8px',
              background: '#f0fdf4',
              borderRadius: '6px',
              border: '1px dashed #86efac'
            }}>
            <span style={{ fontSize: '12px', color: '#16a34a' }}>合并 {summaries.length} 个摘要：</span>
            <button
              className="ghost xsmall"
              type="button"
              onClick={() => selectSectionMergeType && selectSectionMergeType(sec.id, 'paragraph')}
              style={{ 
                fontSize: '11px', 
                padding: '2px 8px', 
                background: sectionMergeType?.[sec.id] === 'paragraph' ? '#22c55e' : '#dcfce7', 
                color: sectionMergeType?.[sec.id] === 'paragraph' ? '#fff' : '#16a34a',
                border: sectionMergeType?.[sec.id] === 'paragraph' ? '1px solid #16a34a' : '1px solid #86efac', 
                borderRadius: '4px',
                fontWeight: sectionMergeType?.[sec.id] === 'paragraph' ? '600' : '400',
                transition: 'all 0.15s ease'
              }}
              title="用换行分隔，形成多段落（点击选择，生成时合并）">
              段落拼接
            </button>
            <button
              className="ghost xsmall"
              type="button"
              onClick={() => selectSectionMergeType && selectSectionMergeType(sec.id, 'sentence')}
              style={{ 
                fontSize: '11px', 
                padding: '2px 8px', 
                background: sectionMergeType?.[sec.id] === 'sentence' ? '#22c55e' : '#dcfce7', 
                color: sectionMergeType?.[sec.id] === 'sentence' ? '#fff' : '#16a34a',
                border: sectionMergeType?.[sec.id] === 'sentence' ? '1px solid #16a34a' : '1px solid #86efac', 
                borderRadius: '4px',
                fontWeight: sectionMergeType?.[sec.id] === 'sentence' ? '600' : '400',
                transition: 'all 0.15s ease'
              }}
              title="用分号分隔，形成长句（点击选择，生成时合并）">
              句子拼接
            </button>
          </div>
        )}
      </div>

      <div
        className="link-row outline-row mixed-row"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          marginTop: '4px',
        }}>
        {/* Picker & Add Button (First) */}
        <div className="link-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <select
            value={storedPickDocId || ''}
            onChange={(e) => setSectionDocPick((prev) => ({ ...prev, [sec.id]: e.target.value }))}
            style={{ maxWidth: '140px', padding: '2px 6px', fontSize: '12px', height: '24px' }}>
            <option value="">{UI_TEXT.t27}</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            className="ghost xsmall"
            style={{ fontSize: '11px', padding: '2px 6px', whiteSpace: 'nowrap' }}
            type="button"
            onClick={() => addDocToSection(sec.id)}>
            {UI_TEXT.t28}
          </button>
        </div>

        {/* Linked Docs (After) */}
        {linkedDocIds.map((id) => {
          const doc = docs.find((d) => d.id === id);
          const showCopy = canCopyFullToSummary && id === pickDocId;
          return (
            <span
              key={id}
              className="doc-inline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span
                className={`pill doc-pill ${doneMap[id] ? 'done' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: doneMap[id] ? '#e6f4ea' : '#f1f3f4',
                  fontSize: '12px',
                  border: '1px solid transparent',
                }}>
                <span
                  style={{
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={doc?.name || id}>
                  {doc?.name || id}
                </span>
                {doneMap[id] && (
                  <span className="checkmark" style={{ fontSize: '10px' }}></span>
                )}
                <button
                  type="button"
                  className="pill-close"
                  onClick={() => removeDocFromSection(sec.id, id)}
                  aria-label={UI_TEXT.t29}
                  style={{
                    width: '16px',
                    height: '16px',
                    lineHeight: '14px',
                    fontSize: '14px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'transparent',
                    color: '#666',
                    cursor: 'pointer',
                  }}>
                  ×
                </button>
              </span>
              {showCopy ? (
                <button
                  className="ghost xsmall"
                  type="button"
                  style={{ fontSize: '11px', padding: '2px 6px' }}
                  onClick={() => copyPreviewToSummary(sec.id, pickDocId)}>
                  {UI_TEXT.t30}
                </button>
              ) : null}
            </span>
          );
        })}
      </div>

      {node.children?.length ? (
        <div className="outline-children">{node.children.map(renderOutlineNode)}</div>
      ) : null}
    </div>
  );
};

/**
 * 创建一个绑定了所有依赖的 renderOutlineNode 函数
 * @param {Object} deps - 所有依赖项
 * @returns {Function} - 渲染函数
 */
export const createOutlineNodeRenderer = (deps) => {
  const renderOutlineNode = (node) => (
    <OutlineNode
      key={node.section?.id || node.index}
      node={node}
      {...deps}
      renderOutlineNode={renderOutlineNode}
    />
  );
  return renderOutlineNode;
};

export default OutlineNode;
