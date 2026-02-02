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
  User,
  ArrowDownToLine,
  Move } from
'lucide-react';
import './style.css';

/**
 * Sources Panel - 左侧来源管理
 */const UI_TEXT = { t1: "来源", t2: "上传文件", t3: "清除全部", t4: "暂无来源", t5: "点击右上角 + 添加文档", t6: "新对话", t7: "开始与您的文档对话", t8: "您可以询问关于来源内容的任何问题", t9: "总结核心观点", t10: "提取关键数据", t11: "保存到 Studio", t12: "输入您的问题...", t13: "按 Enter 发送，Shift + Enter 换行", t14: "新建笔记", t15: "Studio 暂无笔记", t16: "从对话中 Pin 内容或创建新笔记", t17: "无标题", t18: "输入内容...", t19: "总结这些文档的核心观点", t20: "提取关键数据与结论" };
export function SourcesPanel({
  sources = [],
  onUpload,
  onDelete,
  onSelect,
  onClearAll
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="panel-content" style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'  // 【修复】确保父容器不溢出
    }}>
            <div className="panel-header" style={{ 
              padding: '20px 24px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              flexShrink: 0  // 【修复】确保头部不被压缩
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Library className="text-primary" size={20} />
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{UI_TEXT.t1}</h2>
                    <span className="pill muted">{sources.length}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
            className="ghost icon-btn"
            onClick={() => fileInputRef.current?.click()}
            title={UI_TEXT.t2}>

                        <Plus size={20} />
                    </button>
                    <button
            className="ghost icon-btn"
            onClick={() => onClearAll?.()}
            title={UI_TEXT.t3}
            disabled={!sources.length}>

                        <Trash2 size={18} />
                    </button>
                </div>
                <input
          type="file"
          multiple
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={onUpload}
          accept=".txt,.md,.pdf,.docx" />

            </div>

            {/* 【修复】添加滚动容器，确保文档列表可滚动 */}
            <div style={{ 
              flex: 1, 
              padding: '0 16px 20px', 
              overflowY: 'auto', 
              overflowX: 'hidden',
              minHeight: 0,
              maxHeight: 'calc(100% - 60px)'  // 减去头部高度
            }}>
                {sources.length === 0 ?
        <div className="empty-state">
                        <Library size={48} opacity={0.1} />
                        <p>{UI_TEXT.t4}<br /><span className="sub">{UI_TEXT.t5}</span></p>
                    </div> :

        <div className="list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {sources.map((source) =>
          <div
            key={source.id}
            className={`list-item ${source.selected ? 'active' : ''}`}
            onClick={() => onSelect(source.id)}
            style={{ flexShrink: 0 }}>
            
                                <div className="icon-box">
                                    <FileText size={16} />
                                </div>
                                <div className="content">
                                    <div className="title">{source.name}</div>
                                    <div className="meta">{source.type} · {source.size}</div>
                                </div>
                                <button
              className="ghost icon-btn small delete-btn"
              onClick={(e) => {e.stopPropagation();onDelete(source.id);}}>
              
                                    <Trash2 size={14} />
                                </button>
                            </div>
          )}
                    </div>
        }
            </div>
        </div>);

}

/**
 * Chat Panel - 中间对话区域
 */
export function ChatPanel({
  messages = [],
  onSendMessage,
  thinking = false,
  appButtons = [],
  onAppButtonClick,
  onClearMessages
}) {
  const [input, setInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true); // 跟随模式
  const scrollRef = useRef(null);

  useEffect(() => {
    // 只有在跟随模式下才自动滚动
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking, autoScroll]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  // 手动滚动到底部
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  return (
    <div className="panel-content" style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 顶部固定区域 */}
      <div style={{ flexShrink: 0 }}>
        <div className="panel-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <MessageSquare size={20} className="text-primary" />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{UI_TEXT.t6}</h2>
          </div>
        </div>

        {appButtons.length > 0 &&
          <div className="chat-app-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {appButtons.map((btn) =>
                <button
                  key={btn.id}
                  type="button"
                  className="ghost chat-app-btn"
                  onClick={() => onAppButtonClick?.(btn)}>
                  {btn.label}
                </button>
              )}
            </div>
            {onClearMessages && (
              <button
                type="button"
                className="ghost"
                onClick={onClearMessages}
                title="清除对话记录"
                style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trash2 size={14} />
                清除对话记录
              </button>
            )}
          </div>
        }
      </div>

      {/* 中间滚动区域 */}
      <div className="chat-area scroll-y" ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {messages.length === 0 &&
          <div className="empty-state">
            <Sparkles size={48} opacity={0.1} />
            <p>{UI_TEXT.t7}<br /><span className="sub">{UI_TEXT.t8}</span></p>
            <div className="suggestions">
              <button className="suggestion-pill" onClick={() => onSendMessage(UI_TEXT.t19)}>{UI_TEXT.t9}</button>
              <button className="suggestion-pill" onClick={() => onSendMessage(UI_TEXT.t20)}>{UI_TEXT.t10}</button>
            </div>
          </div>
        }

        {messages.map((msg, idx) =>
          <div key={`${msg.id || 'msg'}_${idx}`} className={`message ${msg.role}`}>
            <div className="avatar">
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="bubble">
              {msg.content}
              {msg.citations && msg.citations.length > 0 &&
                <div className="citations">
                  {msg.citations.map((cit, cidx) =>
                    <span key={cidx} className="citation-chip">{cit}</span>
                  )}
                </div>
              }
            </div>
            {msg.role === 'assistant' &&
              <div className="msg-actions">
                <button className="ghost icon-btn xsmall" title={UI_TEXT.t11}>
                  <Pin size={14} />
                </button>
              </div>
            }
          </div>
        )}

        {thinking &&
          <div className="message assistant thinking">
            <div className="avatar"><Bot size={16} /></div>
            <div className="bubble">
              <span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
            </div>
          </div>
        }
      </div>

      {/* 底部固定输入区域 */}
      <div className="input-area" style={{ flexShrink: 0, padding: '20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-panel, #fff)' }}>
        <div className="input-box" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
          <textarea
            className="chat-input"
            rows={1}
            placeholder={UI_TEXT.t12}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            style={{ flex: 1 }}
          />
          <button
            className={`send-btn ${input.trim() ? 'active' : ''}`}
            onClick={handleSend}
            disabled={!input.trim()}>
            <Send size={18} />
          </button>
          {/* 跟随/自由切换按钮 */}
          <button
            type="button"
            className={`ghost icon-btn ${autoScroll ? 'active' : ''}`}
            onClick={() => {
              setAutoScroll(!autoScroll);
              if (!autoScroll) scrollToBottom(); // 切换到跟随时滚动到底部
            }}
            title={autoScroll ? '跟随模式（点击切换为自由）' : '自由模式（点击切换为跟随）'}
            style={{ 
              padding: '8px',
              borderRadius: '8px',
              background: autoScroll ? 'var(--primary, #3b82f6)' : 'transparent',
              color: autoScroll ? '#fff' : 'var(--text-secondary)',
              border: autoScroll ? 'none' : '1px solid var(--border-light)'
            }}>
            {autoScroll ? <ArrowDownToLine size={18} /> : <Move size={18} />}
          </button>
        </div>
        <div className="input-hint" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{UI_TEXT.t13}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.7 }}>
            {autoScroll ? '📍 跟随' : '🔓 自由'}
          </span>
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
          title={UI_TEXT.t14}>
          
                    <Plus size={20} />
                </button>
            </div>

            <div className="scroll-y" style={{ flex: 1, padding: '0 16px 20px' }}>
                {notes.length === 0 ?
        <div className="empty-state">
                        <FileText size={48} opacity={0.1} />
                        <p>{UI_TEXT.t15}<br /><span className="sub">{UI_TEXT.t16}</span></p>
                    </div> :

        <div className="notes-grid">
                        {notes.map((note) =>
          <div key={note.id} className="note-card">
                                <div className="note-header">
                                    <input
                className="note-title-input"
                defaultValue={note.title}
                placeholder={UI_TEXT.t17} />
              
                                    <button
                className="ghost icon-btn xsmall"
                onClick={() => onDeleteNote(note.id)}>
                
                                        <X size={14} />
                                    </button>
                                </div>
                                <textarea
              className="note-content-input"
              defaultValue={note.content}
              placeholder={UI_TEXT.t18} />
            
                            </div>
          )}
                    </div>
        }
            </div>
        </div>);

}
