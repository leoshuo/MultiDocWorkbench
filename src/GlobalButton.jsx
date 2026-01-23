import React from 'react';

/**
 * 全局按钮渲染组件
 * 渲染所有全局坐标的按钮
 */const UI_TEXT = { t1: "编辑样式", t2: "删除按钮", t3: "确定要删除这个按钮吗？" };
export function GlobalButtonsContainer({
  buttons,
  isEditing,
  onMouseDown,
  onStyleEdit,
  onClick,
  onDelete
}) {
  if (!buttons || buttons.length === 0) {
    return null;
  }

  return (
    <>
            {buttons.map((button) =>
      <GlobalButton
        key={button.id}
        button={button}
        isEditing={isEditing}
        onMouseDown={onMouseDown}
        onStyleEdit={onStyleEdit}
        onClick={onClick}
        onDelete={onDelete} />

      )}
        </>);

}

/**
 * 全局按钮组件
 */
function GlobalButton({
  button,
  isEditing,
  onMouseDown,
  onStyleEdit,
  onClick,
  onDelete
}) {
  const defaultStyle = {
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: 'transparent',
    fontWeight: 500,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 6
  };

  const buttonStyle = { ...defaultStyle, ...(button.style || {}) };

  const getJustifyContent = (align) => {
    if (align === 'left') return 'flex-start';
    if (align === 'right') return 'flex-end';
    return 'center';
  };

  if (!isEditing) {
    // 正常模式：全局定位的按钮
    const handleClick = (e) => {
      console.log('[GlobalButton handleClick] Event triggered for:', button.label);
      console.log('[GlobalButton handleClick] button:', button);
      console.log('[GlobalButton handleClick] onClick typeof:', typeof onClick);
      console.log('[GlobalButton handleClick] onClick exists:', !!onClick);

      if (onClick) {
        console.log('[GlobalButton handleClick] Calling onClick with button:', button);
        try {
          onClick(button);
          console.log('[GlobalButton handleClick] onClick call completed');
        } catch (error) {
          console.error('[GlobalButton handleClick] onClick threw error:', error);
        }
      } else {
        console.warn('[GlobalButton] No onClick handler provided');
      }
    };

    return (
      <button
        onClick={handleClick}
        style={{
          position: 'absolute',
          left: `${button.x}px`,
          top: `${button.y}px`,
          width: `${button.width}px`,
          height: `${button.height}px`,
          minWidth: 'auto',
          minHeight: '24px',
          display: button.enabled ? 'inline-flex' : 'none',
          alignItems: 'center',
          justifyContent: getJustifyContent(buttonStyle.textAlign),
          zIndex: button.zIndex || 9000,
          fontSize: `${buttonStyle.fontSize}px`,
          color: buttonStyle.color,
          backgroundColor: buttonStyle.backgroundColor,
          fontWeight: buttonStyle.fontWeight,
          border: `${buttonStyle.borderWidth}px solid ${buttonStyle.borderColor}`,
          borderRadius: `${buttonStyle.borderRadius}px`,
          cursor: 'pointer',
          transition: 'all 0.2s',
          padding: '0 8px',
          pointerEvents: 'auto',
          textAlign: buttonStyle.textAlign || 'center'
        }}
        className="ghost"
        disabled={!button.enabled}>
        
                {button.label}
            </button>);

  }

  // 编辑模式：可拖动和调整大小
  return (
    <div
      style={{
        position: 'absolute',
        left: `${button.x}px`,
        top: `${button.y}px`,
        width: `${button.width}px`,
        height: `${button.height}px`,
        border: '2px solid #3b82f6',
        borderRadius: '4px',
        background: button.enabled ? 'rgba(59, 130, 246, 0.05)' : 'rgba(156, 163, 175, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
        zIndex: button.zIndex || 9100,
        pointerEvents: 'auto',
        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
        transition: button.enabled ? 'box-shadow 0.2s' : 'none'
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown(e, button.id, 'move');
      }}
      onMouseEnter={(e) => {
        if (e.currentTarget) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.35)';
        }
      }}
      onMouseLeave={(e) => {
        if (e.currentTarget) {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.2)';
        }
      }}>
      
            {/* 样式编辑按钮 */}
            {onStyleEdit &&
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStyleEdit(button.id);
        }}
        style={{
          position: 'absolute',
          top: '-12px',
          right: '-12px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#3b82f6',
          color: '#fff',
          border: '2px solid #fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          boxShadow: '0 2px 6px rgba(59, 130, 246, 0.4)',
          zIndex: 150,
          padding: 0
        }}
        title={UI_TEXT.t1}>
        
                    ✎
                </button>
      }

            {/* 标题和标签 */}
            <div
        style={{
          flex: 1,
          fontSize: `${buttonStyle.fontSize}px`,
          color: button.enabled ? buttonStyle.color : '#9ca3af',
          fontWeight: buttonStyle.fontWeight,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none',
          padding: '0 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: getJustifyContent(buttonStyle.textAlign),
          textAlign: buttonStyle.textAlign || 'center'
        }}>
        
                {button.label}
            </div>

            {/* Resize 手柄 */}
            <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(e, button.id, 'resize');
        }}
        style={{
          position: 'absolute',
          right: '-6px',
          bottom: '-6px',
          width: '16px',
          height: '16px',
          background: '#3b82f6',
          border: '2px solid #fff',
          borderRadius: '50%',
          cursor: 'nwse-resize',
          zIndex: 120,
          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
        }} />
      

            {/* 删除按钮 */}
            {onDelete &&
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(UI_TEXT.t3)) {
            onDelete(button.id);
          }
        }}
        style={{
          position: 'absolute',
          top: '-12px',
          left: '-12px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#ef4444',
          color: '#fff',
          border: '2px solid #fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
          zIndex: 150,
          padding: 0
        }}
        title={UI_TEXT.t2}>
        
                    ×
                </button>
      }
        </div>);

}
