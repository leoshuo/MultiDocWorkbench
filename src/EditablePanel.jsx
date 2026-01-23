import { useRef, useEffect, useState } from 'react';

/**
 * 可编辑的布局面板容器
 * 支持拖动位置和调整宽度/高度
 */const UI_TEXT = { t1: "⚠️ 配置错误", t2: "面板 \"", t3: "\" 缺少位置配置", t4: "请刷新页面或重置布局配置", t5: "拖动调整宽度", t6: "拖动调整高度", t7: "拖动调整大小", t8: "📐 编辑模式 - 拖动标题移动，拖动边框调整大小", t9: "点击编辑标题" };
export function EditableLayoutPanel({
  panelId,
  panelName,
  isEditing,
  position,
  onPositionChange,
  children,
  className = '',
  style = {},
  hidePanelHeader = false,
  dragHandleSelector = 'h2',
  onTitleEdit,
  titleStyle = {},
  headerActions,
  editHeaderActions,
  bounds
}) {
  const panelRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); // 'move', 'resize-e', 'resize-s', 'resize-se'
  const [dragStart, setDragStart] = useState(null);

  const GRID_SIZE = 20; // 20px 网格对齐
  const MIN_WIDTH = 200; // 最小宽度 200px
  const MIN_HEIGHT = 150; // 最小高度 150px

  // 处理开始拖动
  const handleMouseDown = (e, type = 'move') => {
    if (!isEditing) return;

    // Filter interactive elements for 'move' type (prevent dragging when interacting with content)
    if (type === 'move') {
      const target = e.target;
      const tagName = target.tagName.toLowerCase();
      // Check if target is interactive
      // Exclude h2 because it IS a drag handle (though now it's also clickable for edit)
      if (tagName !== 'h2' && !target.closest(dragHandleSelector)) {
        if (['input', 'textarea', 'button', 'select', 'label', 'a', 'option'].includes(tagName) ||
        target.isContentEditable ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('.no-drag'))
        {
          // Allow default interaction, do not start drag
          return;
        }
      }
    }

    e.preventDefault();
    setIsDragging(true);
    setDragType(type);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startPos: position
    });
  };

  // 处理拖动中
  useEffect(() => {
    if (!isDragging || !dragStart) return;

    const maxBounds = bounds && Number.isFinite(bounds.width) && Number.isFinite(bounds.height) ?
    { width: bounds.width, height: bounds.height } :
    null;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      if (dragType === 'move') {
        const newLeft = dragStart.startPos.left + deltaX;
        const newTop = dragStart.startPos.top + deltaY;
        const maxLeft = (maxBounds ? maxBounds.width : window.innerWidth) - 100;
        const maxTop = (maxBounds ? maxBounds.height : window.innerHeight) - 100;
        onPositionChange({
          ...position,
          left: Math.max(0, Math.min(newLeft, Math.max(0, maxLeft))),
          top: Math.max(0, Math.min(newTop, Math.max(0, maxTop)))
        });
      } else if (dragType && dragType.startsWith('resize')) {
        let { left, top, width, height } = dragStart.startPos;

        // Horizontal
        if (dragType.includes('e')) {
          width = Math.max(MIN_WIDTH, width + deltaX);
        } else if (dragType.includes('w')) {
          const newW = Math.max(MIN_WIDTH, width - deltaX);
          left += width - newW; // Adjust left by the amount width changed
          width = newW;
        }

        // Vertical
        if (dragType.includes('s')) {
          height = Math.max(MIN_HEIGHT, height + deltaY);
        } else if (dragType.includes('n')) {
          const newH = Math.max(MIN_HEIGHT, height - deltaY);
          top += height - newH;
          height = newH;
        }

        if (maxBounds) {
          left = Math.max(0, Math.min(left, maxBounds.width - MIN_WIDTH));
          top = Math.max(0, Math.min(top, maxBounds.height - MIN_HEIGHT));
          width = Math.min(width, Math.max(MIN_WIDTH, maxBounds.width - left));
          height = Math.min(height, Math.max(MIN_HEIGHT, maxBounds.height - top));
        }

        onPositionChange({ left, top, width, height });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragType(null);
      setDragStart(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, dragType, position, onPositionChange, isEditing]);

  if (!isEditing) {
    return (
      <div className={`editable-panel-view ${className}`} style={{
        ...style,
        position: position ? 'absolute' : 'relative',
        left: position ? `${position.left}px` : undefined,
        top: position ? `${position.top}px` : undefined,
        width: position ? `${position.width}px` : '100%',
        height: position ? `${position.height}px` : '100%',
        background: 'white',
        border: '1px solid #dadce0',
        borderRadius: '12px',
        boxShadow: '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        zIndex: style.zIndex || 1
      }}>
        {/* Panel title in View Mode - Refactored for headerActions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '0 0 12px 0',
          paddingBottom: '8px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: '#1f2937',
            ...titleStyle // Apply user styles in View Mode
          }}>
            {panelName}
          </h2>
          {headerActions &&
          <div className="panel-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10, position: 'relative', pointerEvents: 'auto' }}>
              {headerActions}
            </div>
          }
        </div>
        {children}
      </div>);

  }


  // 安全检查：如果 position 为 undefined 或缺少必要属性
  if (!position ||
  position.left === undefined ||
  position.top === undefined ||
  position.width === undefined ||
  position.height === undefined) {
    console.warn(`[EditableLayoutPanel] Panel "${panelName}" (${panelId}) has invalid position:`, position);
    // 在编辑模式下，如果没有有效位置，返回一个占位提示
    return (
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '20px',
        background: '#fff3cd',
        border: '2px dashed #ff6b6b',
        borderRadius: '8px',
        textAlign: 'center',
        zIndex: 9999
      }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#856404' }}>{UI_TEXT.t1}</h3>
        <p style={{ margin: 0 }}>{UI_TEXT.t2}{panelName}{UI_TEXT.t3}</p>
        <p style={{ fontSize: '12px', margin: '8px 0 0 0', color: '#666' }}>{UI_TEXT.t4}

        </p>
      </div>);

  }

  const panelStyle = {
    ...style,
    position: 'absolute',
    left: `${position.left}px`,
    top: `${position.top}px`,
    width: `${position.width}px`,
    height: `${position.height}px`,
    border: '2px solid #3b82f6',
    background: 'white',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: isDragging ? 1000 : 10,
    cursor: isDragging ? 'grabbing' : 'grab',
    overflow: 'auto'
  };

  return (
    <div
      ref={panelRef}
      className={`editable-panel ${className}`}
      style={panelStyle}
      onMouseDown={(e) => {
        if (isEditing) {
          // If clicking background (not buttons/handles), drag
          handleMouseDown(e, 'move');
        } else if (dragHandleSelector && e.target.closest(dragHandleSelector)) {
          handleMouseDown(e, 'move');
        }
      }}>

      {!hidePanelHeader &&
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '0 0 8px 0',
          paddingBottom: '6px',
          borderBottom: '2px solid #e5e7eb',
          position: 'relative',
          zIndex: 10
        }}>

          <h2
          style={{
            margin: 0,
            cursor: isEditing ? 'pointer' : 'grab',
            userSelect: 'none',
            fontSize: '14px',
            fontWeight: 600,
            ...titleStyle // Apply user styles
          }}
          onMouseDown={(e) => !isEditing && handleMouseDown(e, 'move')}>

            <span
            onClick={(e) => {
              if (isEditing && onTitleEdit) {
                e.stopPropagation();
                onTitleEdit(panelId);
              }
            }}
            onMouseDown={(e) => isEditing && e.stopPropagation()}
            style={{
              cursor: isEditing ? 'pointer' : 'inherit',
              display: 'inline-block',
              border: isEditing ? '1px dashed #cbd5e1' : 'none',
              borderRadius: '4px',
              padding: isEditing ? '2px 6px' : '0',
              margin: isEditing ? '-2px -6px' : '0',
              transition: 'all 0.2s',
              backgroundColor: isEditing ? 'rgba(255, 255, 255, 0.5)' : 'transparent'
            }}
            title={isEditing ? UI_TEXT.t9 : ""}>

              {panelName}
              {isEditing &&
            <span style={{ marginLeft: '4px', fontSize: '14px', color: '#3b82f6' }}>✎</span>
            }
            </span>
          </h2>
          {editHeaderActions &&
        <div
          className="panel-header-actions"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 11, pointerEvents: 'auto' }}
          onMouseDown={(e) => e.stopPropagation()}>

              {editHeaderActions}
            </div>
        }
        </div>
      }

      {/* Children wrapper - pointerEvents auto to allow button interaction */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0, position: 'relative', zIndex: 1 }}>
        {children}
      </div>


      {/* 调整大小把手 - 上边 */}
      {isEditing &&
      <div
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '12px', cursor: 'ns-resize', zIndex: 10 }}
        onMouseDown={(e) => {e.stopPropagation();handleMouseDown(e, 'resize-n');}} />

      }
      {/* 调整大小把手 - 左边 */}
      {isEditing &&
      <div
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '12px', cursor: 'ew-resize', zIndex: 10 }}
        onMouseDown={(e) => {e.stopPropagation();handleMouseDown(e, 'resize-w');}} />

      }
      {/* 调整大小把手 - 左上角 */}
      {isEditing &&
      <div
        style={{ position: 'absolute', left: 0, top: 0, width: '16px', height: '16px', cursor: 'nwse-resize', zIndex: 11 }}
        onMouseDown={(e) => {e.stopPropagation();handleMouseDown(e, 'resize-nw');}} />

      }
      {/* 调整大小把手 - 右上角 */}
      {isEditing &&
      <div
        style={{ position: 'absolute', right: 0, top: 0, width: '16px', height: '16px', cursor: 'nesw-resize', zIndex: 11 }}
        onMouseDown={(e) => {e.stopPropagation();handleMouseDown(e, 'resize-ne');}} />

      }
      {/* 调整大小把手 - 左下角 */}
      {isEditing &&
      <div
        style={{ position: 'absolute', left: 0, bottom: 0, width: '16px', height: '16px', cursor: 'nesw-resize', zIndex: 11 }}
        onMouseDown={(e) => {e.stopPropagation();handleMouseDown(e, 'resize-sw');}} />

      }

      {/* 调整大小把手 - 右边 */}
      {isEditing &&
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '12px',
          cursor: 'ew-resize',
          zIndex: 10,
          background: 'linear-gradient(90deg, transparent 0%, #3b82f6 100%)',
          opacity: 0.5,
          transition: 'opacity 0.2s'
        }}
        onMouseDown={(e) => {e.stopPropagation();handleMouseDown(e, 'resize-e');}}
        onMouseEnter={(e) => e.target.style.opacity = '1'}
        onMouseLeave={(e) => e.target.style.opacity = '0.5'}
        title={UI_TEXT.t5} />

      }

      {/* 调整大小把手 - 底部 */}
      {isEditing &&
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '12px',
          cursor: 'ns-resize',
          zIndex: 10,
          background: 'linear-gradient(180deg, transparent 0%, #3b82f6 100%)',
          opacity: 0.5,
          transition: 'opacity 0.2s'
        }}
        onMouseDown={(e) => {e.stopPropagation();handleMouseDown(e, 'resize-s');}}
        onMouseEnter={(e) => e.target.style.opacity = '1'}
        onMouseLeave={(e) => e.target.style.opacity = '0.5'}
        title={UI_TEXT.t6} />

      }

      {/* 调整大小把手 - 右下角 */}
      {isEditing &&
      <div
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '24px',
          height: '24px',
          cursor: 'nwse-resize',
          zIndex: 10,
          background: 'linear-gradient(135deg, transparent 50%, #3b82f6 50%)',
          borderRadius: '0 0 6px 0',
          opacity: 0.7,
          transition: 'opacity 0.2s'
        }}
        onMouseDown={(e) => {e.stopPropagation();handleMouseDown(e, 'resize-se');}}
        onMouseEnter={(e) => e.target.style.opacity = '1'}
        onMouseLeave={(e) => e.target.style.opacity = '0.7'}
        title={UI_TEXT.t7} />

      }

    </div>);

}

/**
 * 布局编辑容器
 * 提供绝对定位的编辑环境
 */
export function LayoutEditContainer({
  isEditing,
  children,
  style = {},
  size,
  onSizeChange,
  minWidth = 800,
  minHeight = 600
}) {
  if (!isEditing) {
    // 非编辑模式：直接渲染子元素，或者渲染一个静态容器
    // 这里我们需要保证容器大小，因为子元素(Panels)是绝对定位的
    // 所以需要一个 relative 的容器来作为定位基准
    const resolvedSize = size || {};
    return (
      <div className="layout-static-container" style={{
        ...style,
        position: 'relative',
        width: resolvedSize.width ? `${resolvedSize.width}px` : '100%',
        height: resolvedSize.height ? `${resolvedSize.height}px` : '100%',
        minHeight: `${minHeight}px`,
        overflow: 'hidden' // 视情况而定
      }}>
        {children}
      </div>);

  }

  const containerRef = useRef(null);
  const dragStateRef = useRef(null);

  /* ResizeObserver removed to avoid conflict with manual drag */
  useEffect(() => {

    // No-op for observer
  }, []);
  useEffect(() => {
    if (!isEditing || !onSizeChange) return;
    const handleMove = (e) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const deltaX = e.clientX - drag.startX;
      const deltaY = e.clientY - drag.startY;
      const next = {
        width: drag.startWidth,
        height: drag.startHeight
      };
      if (drag.type === 'e' || drag.type === 'se') {
        next.width = Math.max(minWidth, drag.startWidth + deltaX);
      }
      if (drag.type === 's' || drag.type === 'se') {
        next.height = Math.max(minHeight, drag.startHeight + deltaY);
      }
      onSizeChange(next);
    };
    const handleUp = () => {
      dragStateRef.current = null;
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isEditing, onSizeChange, minWidth, minHeight]);

  const startDrag = (e, type) => {
    if (!isEditing || !onSizeChange || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragStateRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height
    };
    e.preventDefault();
  };

  const resolvedSize = size || {};
  const containerStyle = {
    ...style,
    position: 'relative',
    width: resolvedSize.width ? `${resolvedSize.width}px` : '100%',
    height: resolvedSize.height ? `${resolvedSize.height}px` : 'auto',
    minHeight: `${minHeight}px`,
    background: 'rgba(59, 130, 246, 0.02)',
    border: '2px dashed #3b82f6',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    overflow: 'auto'
  };

  return (
    <div ref={containerRef} className="layout-edit-container" style={containerStyle}>
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: '#3b82f6',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          zIndex: 999
        }}>{UI_TEXT.t8}


      </div>

      {/* 调整大小把手 - 右边 */}
      {isEditing &&
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '12px',
          cursor: 'ew-resize',
          zIndex: 1000
        }}
        onMouseDown={(e) => startDrag(e, 'e')} />

      }

      {/* 调整大小把手 - 底部 */}
      {isEditing &&
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '12px',
          cursor: 'ns-resize',
          zIndex: 1000
        }}
        onMouseDown={(e) => startDrag(e, 's')} />

      }

      {/* 调整大小把手 - 右下角 */}
      {isEditing &&
      <div
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '24px',
          height: '24px',
          cursor: 'nwse-resize',
          background: 'linear-gradient(135deg, transparent 50%, #3b82f6 50%)',
          borderBottomRightRadius: '8px',
          zIndex: 1001
        }}
        onMouseDown={(e) => startDrag(e, 'se')} />

      }

      {children}
    </div>);

}

export default EditableLayoutPanel;
