/**
 * OutlineNode - 大纲节点渲染组件
 * 从 SOPWorkbench.jsx 提取的独立组件
 */
import React from 'react';
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
  setSectionDocPick,
  addDocToSection,
  removeDocFromSection,
  copyPreviewToSummary,
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
  const summaryKey = `${sec.id}||summary`;
  const editingTitle = outlineEditing[titleKey];
  const editingSummary = outlineEditing[summaryKey];
  const linkedDocIds = sectionDocLinks[sec.id] || [];
  const doneMap = sectionDocDone[sec.id] || {};
  const storedPickDocId = sectionDocPick[sec.id] || '';
  const pickDocId = storedPickDocId || linkedDocIds[linkedDocIds.length - 1] || '';

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
          style={{ position: 'absolute', right: '8px', top: '8px' }}>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={!!selectedOutlineExec[sec.id]}
              onChange={(e) =>
                setSelectedOutlineExec((prev) => ({ ...prev, [sec.id]: e.target.checked }))
              }
            />
          </label>
          <button className="ghost xsmall" type="button" onClick={() => addSectionBelow(sec.id)}>
            +
          </button>
          <button className="ghost xsmall" type="button" onClick={() => removeSectionById(sec.id)}>
            {UI_TEXT.t25}
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

      <div
        className="hint"
        style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {editingSummary !== undefined ? (
          <>
            <textarea
              rows={2}
              value={editingSummary}
              onChange={(e) =>
                setOutlineEditing((prev) => ({ ...prev, [summaryKey]: e.target.value }))
              }
              style={{ minWidth: 260 }}
            />
            <button
              className="ghost small"
              onClick={() => applyOutlineUpdate(sec.id, 'summary', editingSummary)}>
              {UI_TEXT.t24}
            </button>
            <button className="ghost small" onClick={() => cancelEditOutline(sec.id, 'summary')}>
              {UI_TEXT.t22}
            </button>
          </>
        ) : (
          <>
            <div className={`summary-text ${summaryExpanded[sec.id] ? 'expanded' : ''}`}>
              {sec.summary || sec.hint || UI_TEXT.t127}
            </div>
            {(sec.summary || sec.hint) && (
              <>
                <button
                  className="ghost xsmall"
                  type="button"
                  style={{ fontSize: '11px', padding: '2px 6px' }}
                  onClick={() =>
                    setSummaryExpanded((prev) => ({ ...prev, [sec.id]: !prev[sec.id] }))
                  }>
                  {summaryExpanded[sec.id] ? UI_TEXT.t142 : UI_TEXT.t143}
                </button>
                <button
                  className="ghost xsmall"
                  style={{ fontSize: '11px', padding: '2px 6px' }}
                  type="button"
                  onClick={() => clearOutlineSummary(sec.id)}>
                  {UI_TEXT.t25}
                </button>
              </>
            )}
            <button
              className="ghost xsmall"
              style={{ fontSize: '11px', padding: '2px 6px' }}
              onClick={() => startEditOutline(sec.id, 'summary', sec.summary || sec.hint || '')}>
              {UI_TEXT.t26}
            </button>
          </>
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
