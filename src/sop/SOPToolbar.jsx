/**
 * SOP工具栏组件
 * 包含 EditingToolbar
 */
import { UI_TEXT } from './SOPConstants';

/**
 * 布局编辑工具栏组件
 * @param {boolean} isEditing - 是否处于编辑模式
 * @param {function} onComplete - 完成编辑回调
 * @param {function} onCancel - 取消编辑回调
 * @param {function} onReset - 重置布局回调
 */
export const EditingToolbar = ({ isEditing, onComplete, onCancel, onReset }) => {
  if (!isEditing) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 9999,
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.9)',
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 12px rgba(15,23,42,0.25)',
        borderRadius: 8,
        border: '1px solid #cbd5e1',
        pointerEvents: 'auto'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}>
      <button type="button" className="ghost success" onClick={onComplete} title={UI_TEXT.t31}>
        {UI_TEXT.t32}
      </button>
      <button type="button" className="ghost" onClick={onCancel} title={UI_TEXT.t33}>
        {UI_TEXT.t34}
      </button>
      <button type="button" className="ghost warning" onClick={onReset} title={UI_TEXT.t35}>
        {UI_TEXT.t36}
      </button>
    </div>
  );
};
