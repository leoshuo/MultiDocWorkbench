/**
 * 可编辑按钮组件
 * 在编辑模式下支持拖动和调整大小
 */

import React from 'react';

export function EditableButton({
  button,
  isEditing,
  panelId,
  onMouseDown,
  onStyleEdit,
  onClick,
  children,
}) {
  // 默认样式
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

  if (!isEditing) {
    // 正常模式：应用样式
    const getJustifyContent = (align) => {
      if (align === 'left') return 'flex-start';
      if (align === 'right') return 'flex-end';
      return 'center';
    };

    return (
      <button
        onClick={() => onClick?.(button)}
        style={{
          position: 'absolute',
          left: `${button.left}px`,
          top: `${button.top}px`,
          width: `${button.width}px`,
          height: `${button.height}px`,
          minWidth: 'auto',
          minHeight: '24px',
          display: button.enabled ? 'inline-flex' : 'none',
          alignItems: 'center',
          justifyContent: getJustifyContent(buttonStyle.textAlign),
          zIndex: 10,
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
        disabled={!button.enabled}
      >
        {button.label || children}
      </button>
    );
  }

  // 编辑模式：可拖动和调整大小
  return (
    <div
      style={{
        position: 'absolute',
        left: `${button.left}px`,
        top: `${button.top}px`,
        width: `${button.width}px`,
        height: `${button.height}px`,
        border: '2px solid #3b82f6',
        borderRadius: '4px',
        background: button.enabled ? 'rgba(59, 130, 246, 0.05)' : 'rgba(156, 163, 175, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
        zIndex: 100,
        pointerEvents: 'auto',
        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
        transition: button.enabled ? 'box-shadow 0.2s' : 'none',
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown(e, panelId, button.id, 'move');
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
      }}
    >
      {/* 样式编辑按钮 */}
      {onStyleEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStyleEdit(panelId, button.id);
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
          title="编辑样式"
        >
          ✎
        </button>
      )}

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
          justifyContent: buttonStyle.textAlign === 'left' ? 'flex-start' : buttonStyle.textAlign === 'right' ? 'flex-end' : 'center',
          textAlign: buttonStyle.textAlign || 'center'
        }}
      >
        {button.label || children}
      </div>

      {/* 右边框调整宽度把手 */}
      <div
        style={{
          position: 'absolute',
          right: -4,
          top: 0,
          width: '8px',
          height: '100%',
          cursor: 'ew-resize',
          background: 'linear-gradient(90deg, transparent, #3b82f6)',
          opacity: 0,
          transition: 'opacity 0.2s',
          zIndex: 110,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(e, panelId, button.id, 'resize-e');
        }}
        onMouseEnter={(e) => {
          if (e.currentTarget) e.currentTarget.style.opacity = '0.8';
        }}
        onMouseLeave={(e) => {
          if (e.currentTarget) e.currentTarget.style.opacity = '0';
        }}
      />

      {/* 底部边框调整高度把手 */}
      <div
        style={{
          position: 'absolute',
          bottom: -4,
          left: 0,
          height: '8px',
          width: '100%',
          cursor: 'ns-resize',
          background: 'linear-gradient(180deg, transparent, #3b82f6)',
          opacity: 0,
          transition: 'opacity 0.2s',
          zIndex: 110,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(e, panelId, button.id, 'resize-s');
        }}
        onMouseEnter={(e) => {
          if (e.currentTarget) e.currentTarget.style.opacity = '0.8';
        }}
        onMouseLeave={(e) => {
          if (e.currentTarget) e.currentTarget.style.opacity = '0';
        }}
      />

      {/* 右下角同时调整大小把手 */}
      <div
        style={{
          position: 'absolute',
          right: -4,
          bottom: -4,
          width: '12px',
          height: '12px',
          cursor: 'nwse-resize',
          background: 'linear-gradient(135deg, transparent 50%, #3b82f6 50%)',
          borderRadius: '0 0 4px 0',
          opacity: 0,
          transition: 'opacity 0.2s',
          zIndex: 120,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(e, panelId, button.id, 'resize-se');
        }}
        onMouseEnter={(e) => {
          if (e.currentTarget) e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          if (e.currentTarget) e.currentTarget.style.opacity = '0';
        }}
      />
    </div>
  );
}

export function EditableButtonsContainer({
  panelId,
  buttons,
  isEditing,
  onButtonMouseDown,
  onStyleEdit,
  onClick,
  style = {},
}) {
  const containerStyle = {
    position: 'relative',
    width: '100%',
    height: '40px',
    marginBottom: '8px',
    background: isEditing ? 'rgba(59, 130, 246, 0.02)' : 'transparent',
    borderRadius: isEditing ? '4px' : '0',
    border: isEditing ? '1px dashed #3b82f6' : 'none',
    padding: isEditing ? '4px' : '0',
  };

  return (
    <div style={{ ...containerStyle, ...style }}>
      {buttons && buttons.map((btn) => (
        <EditableButton
          key={btn.id}
          button={btn}
          isEditing={isEditing}
          panelId={panelId}
          onMouseDown={onButtonMouseDown}
          onStyleEdit={onStyleEdit}
          onClick={onClick}
        >
          {btn.label}
        </EditableButton>
      ))}
    </div>
  );
}
