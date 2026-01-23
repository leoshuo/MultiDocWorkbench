import React, { useState } from 'react';

/**
 * 按钮样式编辑器组件
 */
export function StyleEditor({ button, onStyleChange, onDelete, onClose }) {
    const defaultStyle = {
        fontSize: 14,
        color: '#1e293b',
        backgroundColor: 'transparent',
        fontWeight: 500,
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 6,
        ...button.style,
        label: button.label // Initialize with button label
    };

    const [localStyle, setLocalStyle] = useState(defaultStyle);

    const handleChange = (key, value) => {
        const updated = { ...localStyle, [key]: value };
        setLocalStyle(updated);
    };

    const handleApply = () => {
        const { label, ...style } = localStyle;
        onStyleChange({ style, label }); // 传递完整更新对象
        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: '#fff',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                zIndex: 10000,
                minWidth: '320px',
                maxWidth: '400px',
                border: '1px solid #e2e8f0'
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>样式编辑器</h3>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        color: '#64748b',
                        padding: '4px 8px'
                    }}
                >
                    ×
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 按钮文本 */}
                <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                        按钮文本
                    </label>
                    <input
                        type="text"
                        value={localStyle.label || button.label}
                        onChange={(e) => handleChange('label', e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                {/* 字体大小 */}
                <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                        字体大小 (px)
                    </label>
                    <input
                        type="number"
                        value={localStyle.fontSize}
                        onChange={(e) => handleChange('fontSize', parseInt(e.target.value) || 14)}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                {/* 文本对齐 */}
                <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                        文本对齐
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => handleChange('textAlign', 'left')}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                border: `2px solid ${localStyle.textAlign === 'left' ? '#3b82f6' : '#e2e8f0'}`,
                                borderRadius: '6px',
                                background: localStyle.textAlign === 'left' ? 'rgba(59, 130, 246, 0.1)' : '#fff',
                                color: localStyle.textAlign === 'left' ? '#3b82f6' : '#64748b',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                transition: 'all 0.2s'
                            }}
                        >
                            ← 左对齐
                        </button>
                        <button
                            type="button"
                            onClick={() => handleChange('textAlign', 'center')}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                border: `2px solid ${localStyle.textAlign === 'center' ? '#3b82f6' : '#e2e8f0'}`,
                                borderRadius: '6px',
                                background: localStyle.textAlign === 'center' ? 'rgba(59, 130, 246, 0.1)' : '#fff',
                                color: localStyle.textAlign === 'center' ? '#3b82f6' : '#64748b',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                transition: 'all 0.2s'
                            }}
                        >
                            ↔ 居中
                        </button>
                        <button
                            type="button"
                            onClick={() => handleChange('textAlign', 'right')}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                border: `2px solid ${localStyle.textAlign === 'right' ? '#3b82f6' : '#e2e8f0'}`,
                                borderRadius: '6px',
                                background: localStyle.textAlign === 'right' ? 'rgba(59, 130, 246, 0.1)' : '#fff',
                                color: localStyle.textAlign === 'right' ? '#3b82f6' : '#64748b',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                transition: 'all 0.2s'
                            }}
                        >
                            右对齐 →
                        </button>
                    </div>
                </div>

                {/* 文字颜色 */}
                <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                        文字颜色
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="color"
                            value={localStyle.color}
                            onChange={(e) => handleChange('color', e.target.value)}
                            style={{ width: '50px', height: '36px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}
                        />
                        <input
                            type="text"
                            value={localStyle.color}
                            onChange={(e) => handleChange('color', e.target.value)}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                </div>

                {/* 背景颜色 */}
                <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                        背景颜色
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="color"
                            value={localStyle.backgroundColor === 'transparent' ? '#ffffff' : localStyle.backgroundColor}
                            onChange={(e) => handleChange('backgroundColor', e.target.value)}
                            style={{ width: '50px', height: '36px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}
                        />
                        <input
                            type="text"
                            value={localStyle.backgroundColor}
                            onChange={(e) => handleChange('backgroundColor', e.target.value)}
                            placeholder="transparent"
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                </div>

                {/* 字体粗细 */}
                <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                        字体粗细
                    </label>
                    <select
                        value={localStyle.fontWeight}
                        onChange={(e) => handleChange('fontWeight', parseInt(e.target.value))}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            backgroundColor: '#fff'
                        }}
                    >
                        <option value="300">细 (300)</option>
                        <option value="400">正常 (400)</option>
                        <option value="500">中等 (500)</option>
                        <option value="600">半粗 (600)</option>
                        <option value="700">粗 (700)</option>
                        <option value="800">特粗 (800)</option>
                    </select>
                </div>

                {/* 边框颜色 */}
                <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                        边框颜色
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="color"
                            value={localStyle.borderColor === 'transparent' ? '#ffffff' : localStyle.borderColor}
                            onChange={(e) => handleChange('borderColor', e.target.value)}
                            style={{ width: '50px', height: '36px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}
                        />
                        <input
                            type="text"
                            value={localStyle.borderColor}
                            onChange={(e) => handleChange('borderColor', e.target.value)}
                            placeholder="transparent"
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                </div>

                {/* 边框宽度 */}
                <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                        边框宽度 (px)
                    </label>
                    <input
                        type="number"
                        value={localStyle.borderWidth}
                        onChange={(e) => handleChange('borderWidth', parseInt(e.target.value) || 0)}
                        min="0"
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                {/* 圆角 */}
                <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                        圆角 (px)
                    </label>
                    <input
                        type="number"
                        value={localStyle.borderRadius}
                        onChange={(e) => handleChange('borderRadius', parseInt(e.target.value) || 0)}
                        min="0"
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
            </div>

            {/* 按钮组 */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'space-between' }}>
                <button
                    onClick={onDelete}
                    style={{
                        padding: '8px 16px',
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#b91c1c'
                    }}
                >
                    删除
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#64748b'
                        }}
                    >
                        取消
                    </button>
                    <button
                        onClick={handleApply}
                        style={{
                            padding: '8px 16px',
                            background: '#3b82f6',
                            border: '1px solid #3b82f6',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#fff',
                            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        应用
                    </button>
                </div>
            </div>

            {/* 预览 */}
            <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 500 }}>预览效果:</div>
                <button
                    style={{
                        fontSize: `${localStyle.fontSize}px`,
                        color: localStyle.color,
                        backgroundColor: localStyle.backgroundColor,
                        fontWeight: localStyle.fontWeight,
                        border: `${localStyle.borderWidth}px solid ${localStyle.borderColor}`,
                        borderRadius: `${localStyle.borderRadius}px`,
                        padding: '8px 16px',
                        cursor: 'pointer'
                    }}
                >
                    {button.label}
                </button>
            </div>
        </div>
    );
}

// 遮罩层
export function StyleEditorOverlay({ onClose }) {
    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                zIndex: 9999,
                backdropFilter: 'blur(4px)'
            }}
        />
    );
}
