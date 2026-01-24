/**
 * GlobalButtonsConfigPanel - 全局按钮配置面板
 * 从 SOPWorkbench.jsx 提取的独立组件
 */
import React from 'react';
import { UI_TEXT } from '../SOPConstants';
import { defaultLlmButtons } from '../SOPUtils';

/**
 * 全局按钮配置面板组件
 * @param {Object} props
 * @param {Array} props.globalButtons - 全局按钮配置数组
 * @param {Function} props.setGlobalButtons - 设置全局按钮的函数
 * @param {Function} props.saveButtonConfig - 保存配置的函数
 * @param {Function} props.showToast - 显示提示的函数
 */
export const GlobalButtonsConfigPanel = ({
  globalButtons,
  setGlobalButtons,
  saveButtonConfig,
  showToast,
}) => (
  <div style={{ height: '100%', overflow: 'auto' }}>
    <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
      <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600 }}>{UI_TEXT.t7}</h4>
      <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>{UI_TEXT.t8}</p>
    </div>

    <div style={{ padding: '0 12px' }}>
      {globalButtons.map((btn) => (
        <label
          key={btn.id}
          style={{
            display: 'block',
            padding: '10px 0',
            borderBottom: '1px solid #f0f0f0',
          }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>{btn.label}</div>
              <div style={{ fontSize: '11px', color: '#999' }}>{btn.kind}</div>
            </div>
            <input
              type="checkbox"
              checked={btn.enabled !== false}
              disabled={btn.kind === 'outline_extract'}
              style={btn.kind === 'outline_extract' ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              title={btn.kind === 'outline_extract' ? UI_TEXT.t157 : ''}
              onChange={(e) => {
                if (btn.kind === 'outline_extract') return;
                const newEnabled = e.target.checked;
                const newButtons = globalButtons.map((b) =>
                  b.id === btn.id ? { ...b, enabled: newEnabled } : b
                );
                setGlobalButtons(newButtons);
                saveButtonConfig({ activeButtons: newButtons });
              }}
            />
          </div>

          {btn.kind === 'outline_extract' && (
            <div style={{ padding: '8px 0 4px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                {UI_TEXT.t9}
              </div>
              <textarea
                value={btn.prompt || ''}
                onChange={(e) => {
                  const newPrompt = e.target.value;
                  const newButtons = globalButtons.map((b) =>
                    b.id === btn.id ? { ...b, prompt: newPrompt } : b
                  );
                  setGlobalButtons(newButtons);
                  saveButtonConfig({ activeButtons: newButtons });
                }}
                style={{ width: '100%', minHeight: '80px', fontSize: '12px' }}
              />
            </div>
          )}
        </label>
      ))}
    </div>

    <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
      <button
        className="ghost small"
        type="button"
        style={{ color: '#666' }}
        onClick={() => {
          const defaults = defaultLlmButtons();
          const currentKinds = globalButtons.map((b) => b.kind);
          const missing = defaults.filter((d) => !currentKinds.includes(d.kind));
          if (missing.length === 0) {
            showToast(UI_TEXT.t158);
            return;
          }
          if (window.confirm(`${UI_TEXT.t159}${missing.length}${UI_TEXT.t160}`)) {
            const newRestored = missing.map((b) => ({
              ...b,
              id: `btn_restored_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              enabled: true,
            }));
            const newButtons = [...globalButtons, ...newRestored];
            setGlobalButtons(newButtons);
            saveButtonConfig({ activeButtons: newButtons });
            showToast(UI_TEXT.t161);
          }
        }}>
        {UI_TEXT.t10}
      </button>
    </div>
  </div>
);

export default GlobalButtonsConfigPanel;
