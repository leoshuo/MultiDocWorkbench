import React, { useState, useRef, useEffect } from 'react';
import {
    Library,
    MessageSquare,
    Sparkles,
    Plus,
    Trash2,
    Send,
    Pin,
    MoreVertical,
    Maximize2,
    X,
    FileText,
    Search,
    Bot,
    User
} from 'lucide-react';
import './style.css';

/**
 * Sources Panel - 左侧来源管理
 */
export function SourcesPanel({
    sources = [],
    onUpload,
    onDelete,
    onSelect
}) {
    const fileInputRef = useRef(null);

    return (
        <div className="panel-content" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Library className="text-primary" size={20} />
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>来源</h2>
                    <span className="pill muted">{sources.length}</span>
                </div>
                <button
                    className="ghost icon-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="添加来源"
                >
                    <Plus size={20} />
                </button>
                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={onUpload}
                />
            </div>

            <div className="scroll-y" style={{ flex: 1, padding: '0 16px 20px' }}>
                {sources.length === 0 ? (
                    <div className="empty-state">
                        <Library size={48} opacity={0.1} />
                        <p>暂无来源<br /><span className="sub">点击右上角 + 添加文档</span></p>
                    </div>
                ) : (
                    <div className="list">
                        {sources.map(source => (
                            <div
                                key={source.id}
                                className={`list-item ${source.selected ? 'active' : ''}`}
                                onClick={() => onSelect(source.id)}
                            >
                                <div className="icon-box">
                                    <FileText size={16} />
                                </div>
                                <div className="content">
                                    <div className="title">{source.name}</div>
                                    <div className="meta">{source.type} · {source.size}</div>
                                </div>
                                <button
                                    className="ghost icon-btn small delete-btn"
                                    onClick={(e) => { e.stopPropagation(); onDelete(source.id); }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Chat Panel - 中间对话区域
 */
export function ChatPanel({
    messages = [],
    onSendMessage,
    thinking = false
}) {
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, thinking]);

    const handleSend = () => {
        if (!input.trim()) return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <div className="panel-content" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <MessageSquare size={20} className="text-primary" />
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>新对话</h2>
                </div>
            </div>

            <div className="chat-area scroll-y" ref={scrollRef} style={{ flex: 1, padding: '20px' }}>
                {messages.length === 0 && (
                    <div className="empty-state">
                        <Sparkles size={48} opacity={0.1} />
                        <p>开始与您的文档对话<br /><span className="sub">您可以询问关于来源内容的任何问题</span></p>
                        <div className="suggestions">
                            <button className="suggestion-pill" onClick={() => onSendMessage('总结这些文档的核心观点')}>
                                总结核心观点
                            </button>
                            <button className="suggestion-pill" onClick={() => onSendMessage('提取关键数据与结论')}>
                                提取关键数据
                            </button>
                        </div>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id} className={`message ${msg.role}`}>
                        <div className="avatar">
                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div className="bubble">
                            {msg.content}
                            {msg.citations && msg.citations.length > 0 && (
                                <div className="citations">
                                    {msg.citations.map((cit, idx) => (
                                        <span key={idx} className="citation-chip">{cit}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                        {msg.role === 'assistant' && (
                            <div className="msg-actions">
                                <button className="ghost icon-btn xsmall" title="保存到 Studio">
                                    <Pin size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {thinking && (
                    <div className="message assistant thinking">
                        <div className="avatar"><Bot size={16} /></div>
                        <div className="bubble">
                            <span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="input-area" style={{ padding: '20px', borderTop: '1px solid var(--border-light)' }}>
                <div className="input-box">
                    <textarea
                        className="chat-input"
                        rows={1}
                        placeholder="输入您的问题..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <button
                        className={`send-btn ${input.trim() ? 'active' : ''}`}
                        onClick={handleSend}
                        disabled={!input.trim()}
                    >
                        <Send size={18} />
                    </button>
                </div>
                <div className="input-hint">
                    按 Enter 发送，Shift + Enter 换行
                </div>
            </div>
        </div>
    );
}

/**
 * Studio Panel - 右侧创作区域
 */
export function StudioPanel({
    notes = [],
    onAddNote,
    onDeleteNote
}) {
    return (
        <div className="panel-content" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles className="text-accent" size={20} />
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Studio</h2>
                </div>
                <button
                    className="ghost icon-btn"
                    onClick={onAddNote}
                    title="新建笔记"
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="scroll-y" style={{ flex: 1, padding: '0 16px 20px' }}>
                {notes.length === 0 ? (
                    <div className="empty-state">
                        <FileText size={48} opacity={0.1} />
                        <p>Studio 暂无笔记<br /><span className="sub">从对话中 Pin 内容或创建新笔记</span></p>
                    </div>
                ) : (
                    <div className="notes-grid">
                        {notes.map(note => (
                            <div key={note.id} className="note-card">
                                <div className="note-header">
                                    <input
                                        className="note-title-input"
                                        defaultValue={note.title}
                                        placeholder="无标题"
                                    />
                                    <button
                                        className="ghost icon-btn xsmall"
                                        onClick={() => onDeleteNote(note.id)}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <textarea
                                    className="note-content-input"
                                    defaultValue={note.content}
                                    placeholder="输入内容..."
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
