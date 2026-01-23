import React, { useState, useEffect } from 'react';
import { SourcesPanel, ChatPanel, StudioPanel } from './MultiPanelComponents';
import { EditableButtonsContainer } from './EditableButton';
import { EditableLayoutPanel, LayoutEditContainer } from './EditablePanel';
import { StyleEditor, StyleEditorOverlay } from './StyleEditor';
import { GalleryVerticalEnd, Layout as LayoutIcon, Save, X, RotateCcw, Pencil, MousePointer2, Settings } from 'lucide-react';
import './style.css';
import './fonts.css';

// 模拟数据接口 (用于内容演示)
const MOCK_SOURCES = [
    { id: '1', name: '产品需求文档.pdf', type: 'PDF', size: '2.4MB', selected: true },
    { id: '2', name: '用户访谈记录.txt', type: 'TXT', size: '12KB', selected: false },
    { id: '3', name: '竞品分析报告.docx', type: 'DOCX', size: '1.8MB', selected: false },
];

const MOCK_MESSAGES = [
    { id: '1', role: 'assistant', content: '您好！我已经阅读了这些文档。您可以问我任何关于产品需求或用户反馈的问题。' },
];

const MOCK_NOTES = [
    { id: '1', title: '核心需求', content: '用户主要关注移动端的易用性和响应速度。' },
];

// 面板 ID 定义
const PANEL_IDS = {
    SOURCES: 'sources-panel',
    CHAT: 'chat-panel',
    STUDIO: 'studio-panel',
    HEADER: 'header-panel'
};

function MultiDocWorkbench({ onSwitch }) {
    // --- 核心内容状态 ---
    const [sources, setSources] = useState(MOCK_SOURCES);
    const [messages, setMessages] = useState(MOCK_MESSAGES);
    const [notes, setNotes] = useState(MOCK_NOTES);
    const [thinking, setThinking] = useState(false);

    // --- 编辑器状态 ---
    const [isEditingLayout, setIsEditingLayout] = useState(false);

    const [layoutSize, setLayoutSize] = useState({ width: 1680, height: 1050 });

    // 标题状态
    const [headerTitles, setHeaderTitles] = useState(() => {
        try {
            const saved = localStorage.getItem('multidoc_header_titles');
            if (saved) return JSON.parse(saved);
        } catch (e) { }
        return {
            title: { text: '多文档处理工作台', style: { fontSize: '24px', fontWeight: 400, color: '#202124', textAlign: 'left' }, position: { left: 0, top: 0 }, width: 300, height: 40 },
            eyebrow: { text: 'KNOWLEDGE STUDIO', style: { fontSize: '11px', letterSpacing: '1px', color: '#5f6368', textTransform: 'uppercase', textAlign: 'left' }, position: { left: 0, top: 0 }, width: 200, height: 30 }
        };
    });
    const [draggingHeaderTitle, setDraggingHeaderTitle] = useState(null);
    const [resizingHeaderTitle, setResizingHeaderTitle] = useState(null);
    const [editingHeaderTitle, setEditingHeaderTitle] = useState(null);

    // 自动保存标题
    useEffect(() => {
        if (headerTitles) {
            localStorage.setItem('multidoc_header_titles', JSON.stringify(headerTitles));
        }
    }, [headerTitles]);

    const [panelPositions, setPanelPositions] = useState({
        [PANEL_IDS.SOURCES]: { left: 20, top: 40, width: 320, height: 900 },
        [PANEL_IDS.CHAT]: { left: 360, top: 40, width: 800, height: 900 },
        [PANEL_IDS.STUDIO]: { left: 1180, top: 40, width: 460, height: 900 },
    });
    const [panelTitles, setPanelTitles] = useState({
        [PANEL_IDS.SOURCES]: '来源',
        [PANEL_IDS.CHAT]: '对话',
        [PANEL_IDS.STUDIO]: 'Studio'
    });

    const [buttonPositions, setButtonPositions] = useState({}); // { panelId: [buttonConfig] }
    const [editingButton, setEditingButton] = useState(null); // { panelId, buttonId, button }

    // 备份用于取消
    const [originalConfig, setOriginalConfig] = useState(null); // Includes buttons and panels

    // --- 初始化加载 ---
    useEffect(() => {
        // 加载按钮配置
        fetch('/api/multi/buttons')
            .then(res => res.ok ? res.json() : {})
            .then(data => setButtonPositions(data))
            .catch(err => console.error('Failed to load buttons:', err));

        // 加载布局配置
        try {
            const storedLayout = localStorage.getItem('multidoc_layout_config');
            if (storedLayout) {
                const parsed = JSON.parse(storedLayout);
                if (parsed.layoutSize) setLayoutSize(parsed.layoutSize);
                if (parsed.panelPositions) setPanelPositions(parsed.panelPositions);
                if (parsed.panelTitles) setPanelTitles(parsed.panelTitles);
            }
        } catch (e) {
            console.error('Failed to load layout:', e);
        }
    }, []);

    // --- 编辑逻辑处理 ---

    // 保存配置
    const saveConfiguration = async () => {
        try {
            // 保存按钮
            await fetch('/api/multi/buttons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buttonPositions)
            });

            // 保存布局
            const layoutConfig = {
                layoutSize,
                panelPositions,
                panelTitles
            };
            localStorage.setItem('multidoc_layout_config', JSON.stringify(layoutConfig));

            // console.log('Configuration saved');
        } catch (err) {
            console.error('Failed to save configuration:', err);
            alert('保存失败，请检查网络或服务器');
        }
    };

    // 切换编辑模式
    const handleToggleEdit = () => {
        if (!isEditingLayout) {
            setOriginalConfig({
                buttons: JSON.parse(JSON.stringify(buttonPositions)),
                panels: JSON.parse(JSON.stringify(panelPositions)),
                titles: JSON.parse(JSON.stringify(panelTitles)),
                size: { ...layoutSize }
            });
            setIsEditingLayout(true);
        } else {
            handleSaveEdit();
        }
    };

    const handleSaveEdit = async () => {
        await saveConfiguration();
        setIsEditingLayout(false);
        setEditingButton(null);
        setOriginalConfig(null);
    };

    const handleCancelEdit = () => {
        if (originalConfig) {
            setButtonPositions(originalConfig.buttons);
            setPanelPositions(originalConfig.panels);
            setPanelTitles(originalConfig.titles);
            setLayoutSize(originalConfig.size);
        }
        setIsEditingLayout(false);
        setEditingButton(null);
        setOriginalConfig(null);
    };

    const handleResetLayout = async () => {
        if (confirm('确定要重置当前编辑的更改吗？这将恢复到上次保存的状态。如果从未保存过，将恢复默认设置。')) {
            try {
                // 尝试从本地存储读取已保存的配置
                const savedConfigStr = localStorage.getItem('multidoc_layout_config');
                const savedHeaderTitlesStr = localStorage.getItem('multidoc_header_titles');

                if (savedConfigStr) {
                    const savedConfig = JSON.parse(savedConfigStr);
                    if (savedConfig.layoutSize) setLayoutSize(savedConfig.layoutSize);
                    if (savedConfig.panelPositions) setPanelPositions(savedConfig.panelPositions);
                    if (savedConfig.panelTitles) setPanelTitles(savedConfig.panelTitles);
                    // 按钮位置通常存储在后端，这里重新获取
                    const res = await fetch('/api/multi/buttons');
                    if (res.ok) {
                        const buttons = await res.json();
                        setButtonPositions(buttons);
                    }
                    if (savedHeaderTitlesStr) {
                        setHeaderTitles(JSON.parse(savedHeaderTitlesStr));
                    }
                } else {
                    // 如果没有保存过，则恢复默认 (Factory Default)
                    const res = await fetch('/api/multi/buttons/reset', { method: 'POST' });
                    if (res.ok) {
                        const defaultButtons = await res.json();
                        setButtonPositions(defaultButtons);
                    }
                    localStorage.removeItem('multidoc_layout_config');
                    setPanelPositions({
                        [PANEL_IDS.SOURCES]: { left: 20, top: 40, width: 320, height: 900 },
                        [PANEL_IDS.CHAT]: { left: 360, top: 40, width: 800, height: 900 },
                        [PANEL_IDS.STUDIO]: { left: 1180, top: 40, width: 460, height: 900 },
                    });
                    setPanelTitles({
                        [PANEL_IDS.SOURCES]: '来源',
                        [PANEL_IDS.CHAT]: '对话',
                        [PANEL_IDS.STUDIO]: 'Studio'
                    });
                    setHeaderTitles({
                        title: { text: '多文档处理工作台', style: { fontSize: '24px', fontWeight: 400, color: '#202124', textAlign: 'left' }, position: { left: 0, top: 0 }, width: 300, height: 40 },
                        eyebrow: { text: 'KNOWLEDGE STUDIO', style: { fontSize: '11px', letterSpacing: '1px', color: '#5f6368', textTransform: 'uppercase', textAlign: 'left' }, position: { left: 0, top: 0 }, width: 200, height: 30 }
                    });
                    localStorage.removeItem('multidoc_header_titles');
                    setLayoutSize({ width: 1680, height: 1050 });
                }

                setEditingButton(null);
                // 退出编辑模式？用户可能想留在编辑模式看结果。
                // 逻辑上Reset通常意味着放弃未保存更改。
                setIsEditingLayout(false);
                setOriginalConfig(null);

            } catch (err) {
                console.error('Reset failed', err);
                alert('重置失败');
            }
        }
    };

    // 主标题拖动处理
    const handleHeaderTitleMouseDown = (e, titleKey) => {
        if (!isEditingLayout) return;
        e.preventDefault(); e.stopPropagation();
        const startX = e.clientX; const startY = e.clientY;
        const startPos = headerTitles[titleKey].position || { left: 0, top: 0 };
        setDraggingHeaderTitle({ titleKey, startX, startY, startPos });
    };

    useEffect(() => {
        if (!draggingHeaderTitle) return;
        const handleMouseMove = (e) => {
            const deltaX = e.clientX - draggingHeaderTitle.startX;
            const deltaY = e.clientY - draggingHeaderTitle.startY;
            setHeaderTitles(prev => ({
                ...prev,
                [draggingHeaderTitle.titleKey]: { ...prev[draggingHeaderTitle.titleKey], position: { left: draggingHeaderTitle.startPos.left + deltaX, top: draggingHeaderTitle.startPos.top + deltaY } }
            }));
        };
        const handleMouseUp = () => setDraggingHeaderTitle(null);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    }, [draggingHeaderTitle]);

    // 主标题调整大小处理
    const handleHeaderTitleResizeMouseDown = (e, titleKey, direction) => {
        if (!isEditingLayout) return;
        e.preventDefault(); e.stopPropagation();
        const startX = e.clientX; const startY = e.clientY;
        const startSize = { width: headerTitles[titleKey].width || 200, height: headerTitles[titleKey].height || 30 };
        setResizingHeaderTitle({ titleKey, startX, startY, startSize, direction });
    };

    useEffect(() => {
        if (!resizingHeaderTitle) return;
        const handleMouseMove = (e) => {
            const deltaX = e.clientX - resizingHeaderTitle.startX;
            const deltaY = e.clientY - resizingHeaderTitle.startY;
            setHeaderTitles(prev => {
                const newWidth = Math.max(50, resizingHeaderTitle.startSize.width + deltaX);
                const newHeight = Math.max(20, resizingHeaderTitle.startSize.height + deltaY);
                return { ...prev, [resizingHeaderTitle.titleKey]: { ...prev[resizingHeaderTitle.titleKey], width: newWidth, height: newHeight } };
            });
        };
        const handleMouseUp = () => setResizingHeaderTitle(null);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    }, [resizingHeaderTitle]);

    // 按钮拖拽与缩放
    const handleButtonMouseDown = (e, panelId, buttonId, type) => {
        if (!isEditingLayout) return;
        e.stopPropagation();

        const btnList = buttonPositions[panelId] || [];
        const btnIndex = btnList.findIndex(b => b.id === buttonId);
        if (btnIndex === -1) return;
        const btn = btnList[btnIndex];

        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = btn.left;
        const startTop = btn.top;
        const startW = btn.width;
        const startH = btn.height;

        const handleMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            const newBtn = { ...btn };

            if (type === 'move') {
                newBtn.left = startLeft + deltaX;
                newBtn.top = startTop + deltaY;
            } else if (type === 'resize-e') {
                newBtn.width = Math.max(20, startW + deltaX);
            } else if (type === 'resize-s') {
                newBtn.height = Math.max(20, startH + deltaY);
            } else if (type === 'resize-se') {
                newBtn.width = Math.max(20, startW + deltaX);
                newBtn.height = Math.max(20, startH + deltaY);
            }

            setButtonPositions(prev => {
                const newList = [...(prev[panelId] || [])];
                newList[btnIndex] = newBtn;
                return { ...prev, [panelId]: newList };
            });
        };

        const handleUp = () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    };

    // 样式编辑
    const handleStyleEdit = (panelId, buttonId) => {
        const btnList = buttonPositions[panelId] || [];
        const button = btnList.find(b => b.id === buttonId);
        if (button) {
            setEditingButton({ panelId, buttonId, button });
        }
    };

    // 删除按钮
    const handleDeleteButton = () => {
        if (!editingButton) return;
        const { panelId, buttonId } = editingButton;
        if (confirm('确定要删除这个按钮吗？')) {
            setButtonPositions(prev => {
                const newList = (prev[panelId] || []).filter(b => b.id !== buttonId);
                return { ...prev, [panelId]: newList };
            });
            setEditingButton(null);
        }
    };

    // 按钮/样式更新
    const handleButtonUpdate = ({ style, label }) => {
        if (!editingButton) return;
        const { panelId, buttonId } = editingButton;

        setButtonPositions(prev => {
            const btnList = [...(prev[panelId] || [])];
            const btnIndex = btnList.findIndex(b => b.id === buttonId);
            if (btnIndex !== -1) {
                // 更新 label 和 style
                btnList[btnIndex] = {
                    ...btnList[btnIndex],
                    label: label !== undefined ? label : btnList[btnIndex].label,
                    style: { ...btnList[btnIndex].style, ...style }
                };
            }
            return { ...prev, [panelId]: btnList };
        });
    };

    // 添加新按钮
    const handleAddButton = (targetPanelId) => {
        const newButton = {
            id: `btn_${Date.now()}`,
            label: '新按钮',
            kind: 'action',
            left: 20,
            top: 20,
            width: 100,
            height: 36,
            enabled: true,
            style: {
                backgroundColor: '#ffffff',
                color: '#1e293b',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500
            }
        };

        setButtonPositions(prev => ({
            ...prev,
            [targetPanelId]: [...(prev[targetPanelId] || []), newButton]
        }));
    };

    // 按钮点击 (通用处理)
    const handleButtonClick = (button) => {
        if (isEditingLayout) return;
        console.log('Button clicked:', button.label, button.kind);

        switch (button.kind) {
            case 'switch': onSwitch?.(); break;
            case 'edit': handleToggleEdit(); break;
            case 'action':
                // TODO: 真正的指令分发逻辑
                alert(`触发指令: ${button.label}`);
                break;
        }
    };

    // 面板标题编辑
    const handleTitleEdit = (panelId) => {
        const currentTitle = panelTitles[panelId];
        const newTitle = prompt('请输入新标题', currentTitle);
        if (newTitle !== null && newTitle.trim() !== '') {
            setPanelTitles(prev => ({
                ...prev,
                [panelId]: newTitle.trim()
            }));
        }
    };

    // --- 内容交互处理 ---
    const handleUpload = (e) => {
        const files = Array.from(e.target.files);
        const newSources = files.map((f, i) => ({
            id: `new_${Date.now()}_${i}`,
            name: f.name,
            type: f.name.split('.').pop().toUpperCase(),
            size: '0KB',
            selected: false
        }));
        setSources(prev => [...prev, ...newSources]);
    };

    const handleDeleteSource = (id) => setSources(prev => prev.filter(s => s.id !== id));
    const handleSelectSource = (id) => setSources(prev => prev.map(s => ({ ...s, selected: s.id === id ? !s.selected : s.selected })));

    const handleSendMessage = (text) => {
        const userMsg = { id: `u_${Date.now()}`, role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setThinking(true);
        setTimeout(() => {
            const aiMsg = {
                id: `a_${Date.now()}`,
                role: 'assistant',
                content: `这是关于“${text}”的回答。根据文档内容...`,
                citations: ['产品需求文档.pdf']
            };
            setMessages(prev => [...prev, aiMsg]);
            setThinking(false);
        }, 1500);
    };

    const handleAddNote = () => setNotes(prev => [{ id: `n_${Date.now()}`, title: '', content: '' }, ...prev]);
    const handleDeleteNote = (id) => setNotes(prev => prev.filter(n => n.id !== id));

    // 渲染覆盖层按钮容器
    const renderButtonsOverlay = (panelId) => (
        <EditableButtonsContainer
            panelId={panelId}
            buttons={buttonPositions[panelId] || []}
            isEditing={isEditingLayout}
            onButtonMouseDown={handleButtonMouseDown}
            onStyleEdit={handleStyleEdit}
            onClick={handleButtonClick}
            style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 10,
                pointerEvents: isEditingLayout ? 'none' : 'none' // 容器本身透传，内部按钮拦截
            }}
        />
    );

    // 头部标题文本更新
    const handleHeaderTitleChange = (key, newText) => {
        setHeaderTitles(prev => ({
            ...prev,
            [key]: { ...prev[key], text: newText }
        }));
    };

    return (
        <div
            className={`layout-multi ${isEditingLayout ? 'editing-mode' : ''}`}
            style={{ position: 'relative', height: '100%', padding: '24px', boxSizing: 'border-box' }}
        >
            {/* Header */}
            <header className="hero multi-header" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={onSwitch}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            background: 'var(--primary-accent)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '999px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    >
                        <GalleryVerticalEnd size={18} /> 切换工作台
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                        {isEditingLayout ? (
                            <>
                                {/* Editable Title (Top) */}
                                <div
                                    style={{
                                        position: 'relative',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        width: `${headerTitles.title.width}px`,
                                        height: `${headerTitles.title.height}px`,
                                        border: '1px dashed #94a3b8',
                                        borderRadius: '4px',
                                        zIndex: draggingHeaderTitle?.titleKey === 'title' ? 200 : 100,
                                        transform: `translate(${headerTitles.title.position?.left || 0}px, ${headerTitles.title.position?.top || 0}px)`,
                                        transition: draggingHeaderTitle?.titleKey === 'title' ? 'none' : 'transform 0.2s',
                                    }}
                                >
                                    {/* Control Bar (Outside Top) */}
                                    <div style={{ position: 'absolute', top: '-24px', left: 0, display: 'flex', gap: '4px', background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                        <div
                                            onMouseDown={(e) => handleHeaderTitleMouseDown(e, 'title')}
                                            style={{ cursor: 'move', display: 'flex', alignItems: 'center', color: '#64748b' }}
                                            title="拖动"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="19 9 22 12 19 15"></polyline><polyline points="9 19 12 22 15 19"></polyline><circle cx="12" cy="12" r="1"></circle></svg>
                                        </div>
                                        <div
                                            onClick={() => setEditingHeaderTitle('title')}
                                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}
                                            title="样式设置"
                                        >
                                            <Settings size={14} />
                                        </div>
                                    </div>

                                    <input
                                        value={headerTitles.title.text}
                                        onChange={(e) => handleHeaderTitleChange('title', e.target.value)}
                                        style={{
                                            ...headerTitles.title.style,
                                            margin: 0,
                                            width: '100%',
                                            height: '100%',
                                            border: 'none',
                                            background: 'transparent',
                                            outline: 'none',
                                            padding: 0
                                        }}
                                    />

                                    <div className="resize-handle e" onMouseDown={(e) => handleHeaderTitleResizeMouseDown(e, 'title', 'e')} />
                                    <div className="resize-handle s" onMouseDown={(e) => handleHeaderTitleResizeMouseDown(e, 'title', 's')} />
                                    <div className="resize-handle se" onMouseDown={(e) => handleHeaderTitleResizeMouseDown(e, 'title', 'se')} />
                                </div>

                                {/* Editable Eyebrow (Bottom) */}
                                <div
                                    style={{
                                        position: 'relative',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        width: `${headerTitles.eyebrow.width}px`,
                                        height: `${headerTitles.eyebrow.height}px`,
                                        border: '1px dashed #94a3b8',
                                        borderRadius: '4px',
                                        zIndex: draggingHeaderTitle?.titleKey === 'eyebrow' ? 200 : 100,
                                        transform: `translate(${headerTitles.eyebrow.position?.left || 0}px, ${headerTitles.eyebrow.position?.top || 0}px)`,
                                        transition: draggingHeaderTitle?.titleKey === 'eyebrow' ? 'none' : 'transform 0.2s',
                                    }}
                                >
                                    {/* Control Bar */}
                                    <div style={{ position: 'absolute', top: '-24px', left: 0, display: 'flex', gap: '4px', background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                        <div
                                            onMouseDown={(e) => handleHeaderTitleMouseDown(e, 'eyebrow')}
                                            style={{ cursor: 'move', display: 'flex', alignItems: 'center', color: '#64748b' }}
                                            title="拖动"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="19 9 22 12 19 15"></polyline><polyline points="9 19 12 22 15 19"></polyline><circle cx="12" cy="12" r="1"></circle></svg>
                                        </div>
                                        <div
                                            onClick={() => setEditingHeaderTitle('eyebrow')}
                                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}
                                            title="样式设置"
                                        >
                                            <Settings size={14} />
                                        </div>
                                    </div>

                                    <input
                                        value={headerTitles.eyebrow.text}
                                        onChange={(e) => handleHeaderTitleChange('eyebrow', e.target.value)}
                                        style={{
                                            ...headerTitles.eyebrow.style,
                                            margin: 0,
                                            width: '100%',
                                            height: '100%',
                                            border: 'none',
                                            background: 'transparent',
                                            outline: 'none',
                                            padding: 0
                                        }}
                                    />

                                    <div className="resize-handle e" onMouseDown={(e) => handleHeaderTitleResizeMouseDown(e, 'eyebrow', 'e')} />
                                    <div className="resize-handle s" onMouseDown={(e) => handleHeaderTitleResizeMouseDown(e, 'eyebrow', 's')} />
                                    <div className="resize-handle se" onMouseDown={(e) => handleHeaderTitleResizeMouseDown(e, 'eyebrow', 'se')} />
                                </div>
                            </>
                        ) : (
                            <>
                                <h1 style={{ ...headerTitles.title.style, margin: 0, width: `${headerTitles.title.width}px`, height: `${headerTitles.title.height}px`, display: 'flex', alignItems: 'center', transform: `translate(${headerTitles.title.position?.left || 0}px, ${headerTitles.title.position?.top || 0}px)`, transition: 'transform 0.2s' }}>{headerTitles.title.text}</h1>
                                <p className="eyebrow" style={{ ...headerTitles.eyebrow.style, margin: 0, width: `${headerTitles.eyebrow.width}px`, height: `${headerTitles.eyebrow.height}px`, display: 'flex', alignItems: 'center', transform: `translate(${headerTitles.eyebrow.position?.left || 0}px, ${headerTitles.eyebrow.position?.top || 0}px)`, transition: 'transform 0.2s' }}>{headerTitles.eyebrow.text}</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Header Actions Area */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    {!isEditingLayout ? (
                        <button className="ghost icon-btn" onClick={handleToggleEdit} title="编辑工作台布局">
                            <Pencil size={20} />
                        </button>
                    ) : (
                        <div className="edit-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '4px 8px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', border: '1px solid #e2e8f0' }}>

                            <button className="ghost small" onClick={handleResetLayout} title="重置"><RotateCcw size={16} /></button>
                            <button className="ghost small" onClick={handleCancelEdit} title="取消"><X size={16} /></button>
                            <button className="primary small" onClick={handleSaveEdit} title="保存"><Save size={16} /> 保存</button>
                        </div>
                    )}
                </div>

                {/* Header 按钮浮层 (如果有) */}
                {renderButtonsOverlay(PANEL_IDS.HEADER)}
            </header>

            {/* Main Layout Area - Replaced Grid with LayoutEditContainer */}
            <div className="multi-content-area" style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                <LayoutEditContainer
                    isEditing={isEditingLayout}
                    size={layoutSize}
                    onSizeChange={setLayoutSize}
                    minWidth={1200}
                    minHeight={800}
                    style={{ background: '#f8fafc' }}
                >
                    {/* Left: Sources */}
                    <EditableLayoutPanel
                        panelId={PANEL_IDS.SOURCES}
                        panelName={panelTitles[PANEL_IDS.SOURCES]}
                        isEditing={isEditingLayout}
                        position={panelPositions[PANEL_IDS.SOURCES]}
                        onPositionChange={(newPos) => setPanelPositions(prev => ({ ...prev, [PANEL_IDS.SOURCES]: newPos }))}
                        onTitleEdit={handleTitleEdit}
                    >
                        <SourcesPanel
                            sources={sources}
                            onUpload={handleUpload}
                            onDelete={handleDeleteSource}
                            onSelect={handleSelectSource}
                        />
                        {renderButtonsOverlay(PANEL_IDS.SOURCES)}
                    </EditableLayoutPanel>

                    {/* Middle: Chat */}
                    <EditableLayoutPanel
                        panelId={PANEL_IDS.CHAT}
                        panelName={panelTitles[PANEL_IDS.CHAT]}
                        isEditing={isEditingLayout}
                        position={panelPositions[PANEL_IDS.CHAT]}
                        onPositionChange={(newPos) => setPanelPositions(prev => ({ ...prev, [PANEL_IDS.CHAT]: newPos }))}
                        onTitleEdit={handleTitleEdit}
                    >
                        <ChatPanel
                            messages={messages}
                            onSendMessage={handleSendMessage}
                            thinking={thinking}
                        />
                        {renderButtonsOverlay(PANEL_IDS.CHAT)}
                    </EditableLayoutPanel>

                    {/* Right: Studio */}
                    <EditableLayoutPanel
                        panelId={PANEL_IDS.STUDIO}
                        panelName={panelTitles[PANEL_IDS.STUDIO]}
                        isEditing={isEditingLayout}
                        position={panelPositions[PANEL_IDS.STUDIO]}
                        onPositionChange={(newPos) => setPanelPositions(prev => ({ ...prev, [PANEL_IDS.STUDIO]: newPos }))}
                        onTitleEdit={handleTitleEdit}
                    >
                        <StudioPanel
                            notes={notes}
                            onAddNote={handleAddNote}
                            onDeleteNote={handleDeleteNote}
                        />
                        {renderButtonsOverlay(PANEL_IDS.STUDIO)}
                    </EditableLayoutPanel>

                </LayoutEditContainer>
            </div>

            {/* Style Editor Overlay */}
            {editingButton && (
                <>
                    <StyleEditorOverlay onClose={() => setEditingButton(null)} />
                    <StyleEditor
                        button={editingButton.button}
                        onStyleChange={handleButtonUpdate}
                        onDelete={handleDeleteButton}
                        onClose={() => setEditingButton(null)}
                    />
                </>
            )}
            {/* Header Title Editor Overlay */}
            {editingHeaderTitle && (
                <>
                    <StyleEditorOverlay onClose={() => setEditingHeaderTitle(null)} />
                    <StyleEditor
                        button={{
                            label: headerTitles[editingHeaderTitle].text,
                            style: headerTitles[editingHeaderTitle].style
                        }}
                        onStyleChange={(updates) => {
                            setHeaderTitles(prev => ({
                                ...prev,
                                [editingHeaderTitle]: {
                                    ...prev[editingHeaderTitle],
                                    text: updates.label,
                                    style: { ...prev[editingHeaderTitle].style, ...updates.style }
                                }
                            }));
                        }}
                        onClose={() => setEditingHeaderTitle(null)}
                        onDelete={() => { /* Disable delete for header titles */ }}
                    />
                </>
            )}
        </div>
    );
}

// 简单的错误边界封装
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) return <div>工作台加载出错，请刷新重试。</div>;
        return this.props.children;
    }
}

export default function WrappedMultiDocWorkbench(props) {
    return (
        <ErrorBoundary>
            <MultiDocWorkbench {...props} />
        </ErrorBoundary>
    );
}
