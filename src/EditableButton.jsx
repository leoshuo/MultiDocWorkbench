/**
 * 可编辑按钮组件
 * 在编辑模式下支持拖动和调整大小
 */

import React from 'react';const UI_TEXT = { t1: "编辑样式" };

export function EditableButton({
  button,
  isEditing,
  panelId,
  onMouseDown,
  onStyleEdit,
  onClick,
  children
}) {
  // 默认样式 - 更圆润
  const defaultStyle = {
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: 'transparent',
    fontWeight: 500,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12
  };

  const buttonStyle = { ...defaultStyle, ...(button.style || {}) };
  const isHidden = button.enabled === false;
  const isDisabled = !!button.disabled;

  // 根据按钮类型获取样式配置 - 差异化设计系统
  const getButtonTypeStyle = (kind) => {
    // 主要操作按钮 - 蓝色渐变 (核心操作)
    const primaryKinds = ['final_generate', 'fill_summary', 'dispatch'];
    // 功能按钮 - 绿色渐变 (提取/生成类)
    const successKinds = ['outline_extract', 'text_snippet'];
    // 配置按钮 - 紫色渐变 (配置/设置类)
    const configKinds = ['tab_config', 'view_doc'];
    // 工具栏按钮 - 轻量灰色 (批量操作)
    const toolbarKinds = ['batch_replay', 'select_all', 'deselect_all', 'clear_selection'];
    // 新建/更新按钮 - 蓝色边框
    const createKinds = ['group_new', 'group_update', 'group_replay'];
    // 危险按钮 - 红色 (删除类)
    const dangerKinds = ['delete_selected', 'group_delete'];
    // 次要按钮 - 白底边框 (辅助操作)
    const secondaryKinds = ['clear', 'upload', 'clear_records', 'group_rename'];
    
    if (primaryKinds.includes(kind)) {
      return {
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: '#ffffff',
        border: 'none',
        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
        fontWeight: 600
      };
    }
    if (successKinds.includes(kind)) {
      return {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#ffffff',
        border: 'none',
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
        fontWeight: 600
      };
    }
    if (configKinds.includes(kind)) {
      return {
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        color: '#ffffff',
        border: 'none',
        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
        fontWeight: 600
      };
    }
    if (toolbarKinds.includes(kind)) {
      return {
        background: '#f8fafc',
        color: '#475569',
        border: '1px solid #e2e8f0',
        boxShadow: 'none',
        fontWeight: 500
      };
    }
    if (createKinds.includes(kind)) {
      return {
        background: '#eff6ff',
        color: '#2563eb',
        border: '1px solid #93c5fd',
        boxShadow: 'none',
        fontWeight: 600
      };
    }
    if (dangerKinds.includes(kind)) {
      return {
        background: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fca5a5',
        boxShadow: 'none',
        fontWeight: 500
      };
    }
    if (secondaryKinds.includes(kind)) {
      return {
        background: '#ffffff',
        color: '#374151',
        border: '1px solid #d1d5db',
        boxShadow: 'none',
        fontWeight: 500
      };
    }
    // 默认样式
    return null;
  };

  if (!isEditing) {
    // 正常模式：应用样式
    const getJustifyContent = (align) => {
      if (align === 'left') return 'flex-start';
      if (align === 'right') return 'flex-end';
      return 'center';
    };

    // 检查是否在 flex 容器中（toolbar 场景）- 使用相对定位
    // 仅对沉淀配置的工具栏按钮使用 flex 布局
    const isToolbarButton = panelId === 'processing-records-toolbar';
    
    // 获取按钮类型样式（仅当 button.style 中没有自定义背景时才使用）
    const hasCustomStyle = buttonStyle.background || buttonStyle.backgroundColor !== 'transparent';
    const typeStyle = hasCustomStyle ? {} : (getButtonTypeStyle(button.kind) || {});

    return (
      <button
        onClick={() => onClick?.(button)}
        style={{
          position: isToolbarButton ? 'relative' : 'absolute',
          left: isToolbarButton ? 'auto' : `${button.left}px`,
          top: isToolbarButton ? 'auto' : `${button.top}px`,
          width: isToolbarButton ? 'auto' : `${button.width}px`,
          height: `${button.height}px`,
          boxSizing: 'border-box',
          minWidth: 'auto',
          minHeight: '24px',
          display: isHidden ? 'none' : 'inline-flex',
          alignItems: 'center',
          justifyContent: getJustifyContent(buttonStyle.textAlign),
          zIndex: 10,
          fontSize: `${buttonStyle.fontSize}px`,
          color: buttonStyle.color || typeStyle.color,
          background: buttonStyle.background || typeStyle.background || buttonStyle.backgroundColor,
          fontWeight: buttonStyle.fontWeight || typeStyle.fontWeight,
          border: buttonStyle.border || typeStyle.border || `${buttonStyle.borderWidth}px solid ${buttonStyle.borderColor}`,
          borderRadius: buttonStyle.borderRadius ? `${buttonStyle.borderRadius}px` : '12px',
          boxShadow: buttonStyle.boxShadow || typeStyle.boxShadow || 'none',
          transform: buttonStyle.transform || 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          padding: '0 12px',
          pointerEvents: 'auto',
          textAlign: buttonStyle.textAlign || 'center',
          opacity: isDisabled ? 0.5 : 1,
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
        className="ghost"
        disabled={isDisabled}>
        
        {button.label || children}
      </button>);

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
        boxSizing: 'border-box',
        overflow: 'visible'
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
      }}>
      
      {/* 样式编辑按钮 */}
      {onStyleEdit &&
      <button
        className="style-edit-handle"
        onClick={(e) => {
          e.stopPropagation();
          onStyleEdit(panelId, button.id);
        }}
        style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          transform: 'none',
          width: '10px',
          height: '10px',
          borderRadius: '0',
          background: 'transparent',
          color: '#3b82f6',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 0,
          fontWeight: 600,
          boxShadow: 'none',
          zIndex: 150,
          padding: 0
        }}
        title={UI_TEXT.t1}>

          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
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
          justifyContent: buttonStyle.textAlign === 'left' ? 'flex-start' : buttonStyle.textAlign === 'right' ? 'flex-end' : 'center',
          textAlign: buttonStyle.textAlign || 'center'
        }}>
        
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
          zIndex: 110
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
        }} />
      

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
          zIndex: 110
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
        }} />
      

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
          zIndex: 120
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
        }} />
      
    </div>);

}

export function EditableButtonsContainer({
  panelId,
  buttons,
  isEditing,
  onButtonMouseDown,
  onStyleEdit,
  onClick,
  style = {}
}) {
  const containerStyle = {
    position: 'relative',
    width: '100%',
    height: '40px',
    marginBottom: '8px',
    background: isEditing ? 'rgba(59, 130, 246, 0.02)' : 'transparent',
    borderRadius: isEditing ? '4px' : '0',
    border: isEditing ? '1px dashed #3b82f6' : 'none',
    padding: isEditing ? '4px' : '0'
  };

  return (
    <div style={{ ...containerStyle, ...style }}>
      {buttons && buttons.map((btn) =>
      <EditableButton
        key={btn.id}
        button={btn}
        isEditing={isEditing}
        panelId={panelId}
        onMouseDown={onButtonMouseDown}
        onStyleEdit={onStyleEdit}
        onClick={onClick}>
        
          {btn.label}
        </EditableButton>
      )}
    </div>);

}