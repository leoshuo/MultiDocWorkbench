/**
 * 可拖动面板组件
 * 提供拖动功能和localStorage持久化
 */

import { useState, useRef, useEffect } from 'react';
import './draggable-panel.css';

export function DraggablePanel({
  id,
  title,
  children,
  onClose,
  defaultX = 0,
  defaultY = 0,
  width = 400,
  height = 600,
  minWidth = 300,
  minHeight = 200,
  zIndex = 1,
  onZIndexChange,
}) {
  const [position, setPosition] = useState({ x: defaultX, y: defaultY });
  const [size, setSize] = useState({ width, height });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState('');
  const [resizeStart, setResizeStart] = useState({ mouseX: 0, mouseY: 0, width: 0, height: 0, x: 0, y: 0 });

  const panelRef = useRef(null);
  const headerRef = useRef(null);

  // 从 localStorage 加载位置
  useEffect(() => {
    const saved = localStorage.getItem(`panel-${id}`);
    if (saved) {
      try {
        const { x, y, width: w, height: h } = JSON.parse(saved);
        setPosition({ x, y });
        setSize({ width: w, height: h });
      } catch (_) {
        // 忽略解析错误
      }
    }
  }, [id]);

  // 保存位置到 localStorage
  useEffect(() => {
    localStorage.setItem(
      `panel-${id}`,
      JSON.stringify({ ...position, ...size })
    );
  }, [id, position, size]);

  // 鼠标按下开始拖动
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // 只处理左键

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });

    // 提升 z-index
    onZIndexChange?.(id);

    e.preventDefault();
  };

  // 鼠标移动
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // 限制在视口内
      const maxX = window.innerWidth - size.width - 20;
      const maxY = window.innerHeight - size.height - 20;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, size]);

  // 调整大小
  const handleResizeMouseDown = (direction) => (e) => {
    if (e.button !== 0) return;

    // 记录初始状态
    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: size.width,
      height: size.height,
      x: position.x,
      y: position.y
    });
    setIsResizing(true);
    setResizeDirection(direction);
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      // 计算相对于初始点击位置的变化
      const deltaX = e.clientX - resizeStart.mouseX;
      const deltaY = e.clientY - resizeStart.mouseY;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.x;
      let newY = resizeStart.y;

      if (resizeDirection.includes('right')) {
        newWidth = Math.max(minWidth, resizeStart.width + deltaX);
      }
      if (resizeDirection.includes('bottom')) {
        newHeight = Math.max(minHeight, resizeStart.height + deltaY);
      }
      if (resizeDirection.includes('left')) {
        const widthDelta = -deltaX;
        newWidth = Math.max(minWidth, resizeStart.width + widthDelta);
        // 只有当宽度真的变化时才移动位置
        if (newWidth > minWidth) {
          newX = resizeStart.x + deltaX;
        } else {
          newX = resizeStart.x + resizeStart.width - minWidth;
        }
      }
      if (resizeDirection.includes('top')) {
        const heightDelta = -deltaY;
        newHeight = Math.max(minHeight, resizeStart.height + heightDelta);
        // 只有当高度真的变化时才移动位置
        if (newHeight > minHeight) {
          newY = resizeStart.y + deltaY;
        } else {
          newY = resizeStart.y + resizeStart.height - minHeight;
        }
      }

      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection('');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeDirection, resizeStart, minWidth, minHeight]);

  return (
    <div
      ref={panelRef}
      className="draggable-panel"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex,
      }}
    >
      {/* 头部（拖动区域） */}
      <div
        ref={headerRef}
        className="draggable-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <h3 className="draggable-title">{title}</h3>
        {onClose && (
          <button
            className="draggable-close"
            onClick={() => onClose()}
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      {/* 内容区域 */}
      <div className="draggable-content">{children}</div>

      {/* 调整大小的把手 */}
      <div
        className="draggable-resize draggable-resize-n"
        onMouseDown={handleResizeMouseDown('top')}
      />
      <div
        className="draggable-resize draggable-resize-s"
        onMouseDown={handleResizeMouseDown('bottom')}
      />
      <div
        className="draggable-resize draggable-resize-w"
        onMouseDown={handleResizeMouseDown('left')}
      />
      <div
        className="draggable-resize draggable-resize-e"
        onMouseDown={handleResizeMouseDown('right')}
      />
      <div
        className="draggable-resize draggable-resize-nw"
        onMouseDown={handleResizeMouseDown('top-left')}
      />
      <div
        className="draggable-resize draggable-resize-ne"
        onMouseDown={handleResizeMouseDown('top-right')}
      />
      <div
        className="draggable-resize draggable-resize-sw"
        onMouseDown={handleResizeMouseDown('bottom-left')}
      />
      <div
        className="draggable-resize draggable-resize-se"
        onMouseDown={handleResizeMouseDown('bottom-right')}
      />
    </div>
  );
}

/**
 * 可拖动面板管理器
 * 管理多个面板的打开/关闭和 z-index
 */
export function DraggablePanelManager({ children }) {
  const [panelZIndexes, setPanelZIndexes] = useState({});

  const handlePanelZIndexChange = (panelId) => {
    const maxZ = Math.max(0, ...Object.values(panelZIndexes));
    setPanelZIndexes((prev) => ({
      ...prev,
      [panelId]: maxZ + 1,
    }));
  };

  // 为子组件注入 z-index 和回调
  const childrenWithZIndex = Array.isArray(children)
    ? children.map((child) => {
        if (!child) return null;
        const panelId = child.props?.id;
        return {
          ...child,
          props: {
            ...child.props,
            zIndex: panelZIndexes[panelId] || 1,
            onZIndexChange: handlePanelZIndexChange,
          },
        };
      })
    : null;

  return <div className="draggable-panel-manager">{childrenWithZIndex}</div>;
}
