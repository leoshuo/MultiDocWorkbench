import { useState, useEffect } from 'react';

/**
 * 可编辑的内容块组件
 * 在编辑模式下支持拖动和调整大小
 */const UI_TEXT = { t1: "删除面板" };
export function EditableContentBlock({
  blockId,
  panelId,
  isEditing,
  position,
  onPositionChange,
  onDelete, // New prop
  hidden, // New prop
  children,
  allowChildPointerEvents = false,
  minWidth = 50,
  minHeight = 30
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); // 'move', 'resize-e', 'resize-s', 'resize-se'
  const [dragStart, setDragStart] = useState(null);



  const handleMouseDown = (e, type = 'move') => {
    if (!isEditing) return;
    e.stopPropagation(); // Prevent panel drag
    e.preventDefault();

    setIsDragging(true);
    setDragType(type);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startPos: position
    });
  };

  useEffect(() => {
    if (!isDragging || !dragStart) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      if (dragType === 'move') {
        const newLeft = dragStart.startPos.left + deltaX;
        const newTop = dragStart.startPos.top + deltaY;
        onPositionChange({
          ...position,
          left: Math.max(0, newLeft),
          top: Math.max(0, newTop)
        });
      } else if (dragType && dragType.startsWith('resize')) {
        let { left, top, width, height } = dragStart.startPos;

        if (dragType.includes('e')) {
          width = Math.max(minWidth, width + deltaX);
        } else if (dragType.includes('w')) {
          const newW = Math.max(minWidth, width - deltaX);
          left += width - newW;
          width = newW;
        }

        if (dragType.includes('s')) {
          height = Math.max(minHeight, height + deltaY);
        } else if (dragType.includes('n')) {
          const newH = Math.max(minHeight, height - deltaY);
          top += height - newH;
          height = newH;
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
  }, [isDragging, dragStart, dragType, position, onPositionChange, minWidth, minHeight]);

  // Hooks must be called before any early return
  if (hidden) return null;

  if (!isEditing) {
    // View mode: use saved position for absolute positioning
    return (
      <div style={{
        position: 'absolute',
        left: `${position?.left || 0}px`,
        top: `${position?.top || 0}px`,
        width: `${position?.width || '100%'}px`,
        height: `${position?.height || '100%'}px`,
        overflow: 'auto'
      }}>
                {children}
            </div>);

  }

  // Edit mode: render with drag and resize handles
  const blockStyle = {
    position: 'absolute',
    left: `${position.left}px`,
    top: `${position.top}px`,
    width: `${position.width}px`,
    height: `${position.height}px`,
    border: '2px dashed #10b981',
    background: 'rgba(16, 185, 129, 0.05)',
    borderRadius: '6px',
    zIndex: isDragging ? 100 : 5,
    cursor: isDragging ? 'grabbing' : 'grab',
    overflow: 'auto'
  };

  return (
    <div
      style={blockStyle}
      onMouseDown={(e) => handleMouseDown(e, 'move')}>
      
            {/* Content wrapper with disabled pointer events to prevent interaction during edit */}
            <div style={{ width: '100%', height: '100%', pointerEvents: allowChildPointerEvents ? 'auto' : 'none' }}>
                {children}
            </div>

            {/* Resize handles */}
            {['e', 's', 'se', 'w', 'n', 'nw', 'ne', 'sw'].map((dir) => {
        const isCorner = dir.length > 1;
        const styles = {
          position: 'absolute',
          zIndex: 10,
          cursor: dir.includes('n') || dir.includes('s') ?
          dir.includes('e') || dir.includes('w') ? `${dir.includes('n') ? 'ne' : 'se'}sw-resize` : 'ns-resize' :
          'ew-resize'
        };

        if (dir === 'e') {
          Object.assign(styles, { right: 0, top: 0, bottom: 0, width: '10px' });
        } else if (dir === 's') {
          Object.assign(styles, { bottom: 0, left: 0, right: 0, height: '10px' });
        } else if (dir === 'w') {
          Object.assign(styles, { left: 0, top: 0, bottom: 0, width: '10px' });
        } else if (dir === 'n') {
          Object.assign(styles, { top: 0, left: 0, right: 0, height: '10px' });
        } else if (dir === 'se') {
          Object.assign(styles, { right: 0, bottom: 0, width: '20px', height: '20px', background: '#10b981', borderRadius: '0 0 6px 0' });
        } else if (dir === 'sw') {
          Object.assign(styles, { left: 0, bottom: 0, width: '20px', height: '20px', background: '#10b981', borderRadius: '0 0 0 6px' });
        } else if (dir === 'ne') {
          Object.assign(styles, { right: 0, top: 0, width: '20px', height: '20px', background: '#10b981', borderRadius: '0 6px 0 0' });
        } else if (dir === 'nw') {
          Object.assign(styles, { left: 0, top: 0, width: '20px', height: '20px', background: '#10b981', borderRadius: '6px 0 0 0' });
        }

        return (
          <div
            key={dir}
            style={styles}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleMouseDown(e, `resize-${dir}`);
            }} />);


      })}

            {/* Delete Button */}
            {onDelete &&
      <div
        style={{
          position: 'absolute',
          top: -10,
          right: -10,
          width: 20,
          height: 20,
          background: '#ef4444',
          color: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 101,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title={UI_TEXT.t1}>
        
                    ×
                </div>
      }
        </div>);

}