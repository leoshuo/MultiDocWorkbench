/**
 * AppButtonsConfigPanel - 应用端按钮配置面板
 * 从 SOPWorkbench.jsx 提取的独立组件
 */
import React from 'react';
import { Play } from 'lucide-react';
import { UI_TEXT } from '../SOPConstants';

/**
 * 应用端按钮配置面板组件
 * @param {Object} props
 * @param {Array} props.appButtonsConfig - 应用端按钮配置数组
 * @param {string} props.selectedAppButtonId - 当前选中的按钮ID
 * @param {Function} props.setSelectedAppButtonId - 设置选中按钮ID的函数
 * @param {Array} props.depositGroups - 沉淀集列表
 * @param {Function} props.updateAppButtonLabel - 更新按钮标签的函数
 * @param {Function} props.toggleAppButtonGroup - 切换按钮关联的沉淀集
 * @param {Function} props.saveAppButtonsConfig - 保存配置的函数
 * @param {boolean} props.appButtonsSaving - 是否正在保存中
 * @param {Function} props.replayAppButton - 测试按钮配置的函数
 * @param {Object} props.appButtonReplaying - 按钮测试中状态 { buttonId: bool }
 */
export const AppButtonsConfigPanel = ({
  appButtonsConfig,
  selectedAppButtonId,
  setSelectedAppButtonId,
  depositGroups,
  updateAppButtonLabel,
  toggleAppButtonGroup,
  saveAppButtonsConfig,
  appButtonsSaving,
  replayAppButton,
  appButtonReplaying = {},
}) => (
  <div className="app-buttons-config">
    <div className="card-head" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div className="section-title">{UI_TEXT.t1}</div>
        <div className="hint">{UI_TEXT.t2}</div>
      </div>
      <button
        className="ghost small"
        type="button"
        onClick={saveAppButtonsConfig}
        disabled={appButtonsSaving}
        style={{ pointerEvents: 'auto' }}>
        {appButtonsSaving ? UI_TEXT.t117 : UI_TEXT.t66}
      </button>
    </div>

    {/* 注：Replay 目录配置已移至"文档列表"面板，应用端和后管端共用同一配置 */}
    {appButtonsConfig.length === 0 ? (
      <div className="hint">{UI_TEXT.t3}</div>
    ) : (
      <div className="app-buttons-config-grid">
        <div className="app-buttons-left">
          {appButtonsConfig.map((btn, idx) => {
            const isActive = btn.id === selectedAppButtonId;
            const groupNames = (btn.groupIds || []).map(
              (gid) => depositGroups.find((g) => g.id === gid)?.name || gid
            );
            return (
              <div
                key={btn.id}
                className={`app-button-item ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedAppButtonId(btn.id)}>
                <div className="app-button-row">
                  <span className="pill muted">{idx + 1}</span>
                  <input
                    value={btn.label}
                    onChange={(e) => updateAppButtonLabel(btn.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={UI_TEXT.t43}
                  />
                  {/* Replay 测试按钮 */}
                  {replayAppButton && (
                    <button
                      type="button"
                      className={`ghost small replay-test-btn ${appButtonReplaying[btn.id] ? 'running' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        replayAppButton(btn.id);
                      }}
                      disabled={appButtonReplaying[btn.id] || (btn.groupIds || []).length === 0}
                      title={appButtonReplaying[btn.id] ? '测试中...' : '测试按钮配置'}
                      style={{ marginLeft: 8, padding: '4px 8px', minWidth: 'auto' }}>
                      <Play size={14} style={{ marginRight: 4 }} />
                      {appButtonReplaying[btn.id] ? '测试中' : '测试'}
                    </button>
                  )}
                </div>
                <div className="app-button-selected-groups">
                  {groupNames.length === 0 ? (
                    <span className="hint">{UI_TEXT.t118}</span>
                  ) : (
                    groupNames.map((name) => (
                      <span key={name} className="pill muted">
                        {name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="app-buttons-right">
          <div className="section-title" style={{ fontSize: '14px' }}>
            {UI_TEXT.t4}
          </div>
          <div className="hint">{UI_TEXT.t5}</div>
          {depositGroups.length === 0 ? (
            <div className="hint">{UI_TEXT.t6}</div>
          ) : (
            <div className="app-button-group-list">
              {depositGroups.map((group) => {
                const selected = appButtonsConfig.find(
                  (btn) => btn.id === selectedAppButtonId
                );
                const checked = selected?.groupIds?.includes(group.id);
                return (
                  <label
                    key={group.id}
                    className={`app-button-group-item ${checked ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={!!checked}
                      onChange={() => {
                        if (!selected) return;
                        toggleAppButtonGroup(selected.id, group.id);
                      }}
                    />
                    <span>{group.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

export default AppButtonsConfigPanel;
