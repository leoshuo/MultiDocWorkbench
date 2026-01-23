/**
 * App 的模块化组件
 * 将大型 App.jsx 拆分成独立的可拖动面板
 */

import { useRef } from 'react';
import {
  FileText,
  Upload,
  FolderOpen,
  X,
  Trash2,
  Eye,
  List,
  Terminal,
  Play,
  Settings
} from 'lucide-react';

/**
 * 输入表单面板（仅表单部分）
 */
export function InputFormPanelContent({
  uploadInputRef,
  handleCreateDoc,
  handleFilePick,
  replayDirName,
  pickReplayDirectory,
  clearReplayDirectory,
  replayDirHandle,
}) {
  return (
    <form className="card fixed input-form" onSubmit={(e) => e.preventDefault()} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}></div>

      <input
        type="file"
        accept=".txt,.md,.pdf,.docx"
        multiple
        ref={uploadInputRef}
        style={{ display: 'none' }}
        onChange={(e) => void handleFilePick(e)}
      />

      <div className="file-row" style={{ justifyContent: 'space-between', marginTop: '12px', padding: '8px', background: 'var(--surface-bg)', borderRadius: '8px' }}>
        <div className="hint" style={{ flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {replayDirName ? (
            <span style={{ color: 'var(--primary-accent)', fontWeight: 500 }}>{replayDirName}</span>
          ) : (
            <span>未选择回放目录</span>
          )}
        </div>
        <div className="actions" style={{ gap: 4 }}>
          <button
            className="ghost icon-btn"
            type="button"
            title="选择目录"
            onClick={() => void pickReplayDirectory()}
          >
            <FolderOpen size={14} />
          </button>
          <button
            className="ghost icon-btn"
            type="button"
            title="清除目录"
            onClick={() => void clearReplayDirectory()}
            disabled={!replayDirHandle}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </form>
  );
}

/**
 * 文档列表面板
 */
export function DocumentListPanelContent({
  docs,
  selectedDocId,
  setSelectedDocId,
  deleteDoc,
  // New props for Replay Dir and Upload handling
  uploadInputRef,
  handleFilePick,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="list" style={{ flex: 1, overflowY: 'auto' }}>
        {docs.length === 0 && (
          <div className="hint" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
            <FileText size={32} opacity={0.2} />
            <span>暂无文档</span>
          </div>
        )}
        {docs.map((d) => (
          <div
            key={d.id}
            className={`list-item ${selectedDocId === d.id ? 'active' : ''}`}
            onClick={() => setSelectedDocId(d.id)}
          >
            <div style={{ fontWeight: 500 }}>{d.name}</div>
            <div className="meta" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{d.id.slice(0, 8)}...</div>
            <div className="section-actions" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="ghost icon-btn"
                title="删除"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteDoc(d.id);
                }}
                style={{ width: '24px', height: '24px', padding: '4px' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <input
        type="file"
        accept=".txt,.md,.pdf,.docx"
        multiple
        ref={uploadInputRef}
        style={{ display: 'none' }}
        onChange={(e) => void handleFilePick(e)}
      />

    </div>

  );
}

/**
 * 回放目录面板内容
 */
export function ReplayDirectoryPanelContent({
  replayDirName,
  pickReplayDirectory,
  clearReplayDirectory,
  replayDirHandle,
}) {
  return (
    <div className="file-row" style={{ height: '100%', padding: '8px', background: 'var(--surface-bg)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
      <div className="hint" style={{ flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
        {replayDirName ? (
          <span style={{ color: 'var(--primary-accent)', fontWeight: 500, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{replayDirName}</span>
        ) : (
          <span style={{ color: 'var(--text-secondary)' }}>未选择回放目录</span>
        )}
      </div>
      <div className="actions" style={{ gap: 4, display: 'flex' }}>
        <button
          className="ghost icon-btn"
          type="button"
          title="选择目录"
          onClick={() => void pickReplayDirectory()}
        >
          <FolderOpen size={14} />
        </button>
        <button
          className="ghost icon-btn"
          type="button"
          title="清除目录"
          onClick={() => void clearReplayDirectory()}
          disabled={!replayDirHandle}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

/**
 * 原始输入面板（保留用于向后兼容）
 */
export function InputPanelContent({
  docs,
  selectedDocId,
  setSelectedDocId,
  uploadInputRef,
  handleCreateDoc,
  handleFilePick,
  deleteDoc,
  replayDirName,
  pickReplayDirectory,
  clearReplayDirectory,
  replayDirHandle,
}) {
  return (
    <>
      <form className="card fixed input-form" onSubmit={handleCreateDoc}>
        <div className="card-head" style={{ marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>输入素材</h3>
        </div>

        <label className="form-row">
          <input name="name" placeholder="文档名称 (如：产品需求文档)" style={{ fontWeight: 500 }} />
        </label>
        <label className="form-row">
          <textarea
            name="content"
            rows={4}
            placeholder="粘贴文本，或点击下方上传文件..."
          ></textarea>
        </label>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button type="submit" className="primary" style={{ flex: 1 }}>
            <FileText size={16} /> 保存文本
          </button>
          <div style={{ position: 'relative' }}>
            <input
              type="file"
              accept=".txt,.md,.docx"
              multiple
              ref={uploadInputRef}
              style={{ display: 'none' }}
              onChange={(e) => void handleFilePick(e)}
            />
            <button
              type="button"
              className="ghost"
              onClick={() => uploadInputRef.current?.click()}
              title="上传文件"
            >
              <Upload size={18} />
            </button>
          </div>
        </div>

        <div className="file-row" style={{ justifyContent: 'space-between', marginTop: '12px', padding: '8px', background: 'var(--surface-bg)', borderRadius: '8px' }}>
          <div className="hint" style={{ flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {replayDirName ? (
              <span style={{ color: 'var(--primary-accent)', fontWeight: 500 }}>{replayDirName}</span>
            ) : (
              <span>未选择回放目录</span>
            )}
          </div>
          <div className="actions" style={{ gap: 4 }}>
            <button
              className="ghost icon-btn"
              type="button"
              title="选择目录"
              onClick={() => void pickReplayDirectory()}
            >
              <FolderOpen size={14} />
            </button>
            <button
              className="ghost icon-btn"
              type="button"
              title="清除目录"
              onClick={() => void clearReplayDirectory()}
              disabled={!replayDirHandle}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </form>

      <div className="card fixed input-list">
        <div className="card-head">
          <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>文档列表</h3>
          <span className="pill muted" style={{ fontSize: '12px' }}>{docs.length}</span>
        </div>
        <div className="list">
          {docs.length === 0 && (
            <div className="hint" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
              <FileText size={32} opacity={0.2} />
              <span>暂无文档</span>
            </div>
          )}
          {docs.map((d) => (
            <div
              key={d.id}
              className={`list-item ${selectedDocId === d.id ? 'active' : ''}`}
              onClick={() => setSelectedDocId(d.id)}
            >
              <div style={{ fontWeight: 500 }}>{d.name}</div>
              <div className="meta" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{d.id.slice(0, 8)}...</div>
              <div className="section-actions" style={{ justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="ghost icon-btn"
                  title="删除"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDoc(d.id);
                  }}
                  style={{ width: '24px', height: '24px', padding: '4px' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * 内容预览面板
 */
export function ContentPreviewPanelContent({
  selectedDoc,
  processingTab,
  setProcessingTab,
}) {
  return (
    <>
      <div className="card-head">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Eye size={18} className="text-secondary" />
          <span style={{ fontWeight: 600 }}>内容预览</span>
        </div>
      </div>
      {!selectedDoc ? (
        <div className="hint" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
          <Eye size={48} opacity={0.1} />
          <span>选择左侧文档以预览</span>
        </div>
      ) : (
        <div className="preview full">
          <h4 style={{ marginTop: 0 }}>{selectedDoc.name}</h4>
          <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '16px' }}>
            {selectedDoc.content}
          </p>
        </div>
      )}

    </>
  );
}

export function ProcessingPanelContent({
  scene,
  template,
  processingTab,
  setProcessingTab,
  llmButtons,
  logs,
  loading
}) {
  if (!scene) {
    return (
      <div className="hint" style={{ padding: '20px', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ opacity: 0.5 }}>请先加载或创建场景</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px' }}>
      {/* Tab buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          className={`ghost ${processingTab === 'outline' ? 'active' : ''}`}
          onClick={() => setProcessingTab('outline')}
        >
          <List size={16} /> 大纲模式
        </button>
        <button
          className={`ghost ${processingTab === 'records' ? 'active' : ''}`}
          onClick={() => setProcessingTab('records')}
        >
          <Terminal size={16} /> 操作记录
        </button>
        <button
          className={`ghost ${processingTab === 'config' ? 'active' : ''}`}
          onClick={() => setProcessingTab('config')}
        >
          <Settings size={16} /> 个性化按钮
        </button>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {processingTab === 'outline' && (
          <OutlineView template={template} loading={loading} />
        )}
        {processingTab === 'records' && (
          <RecordsView logs={logs} />
        )}
        {processingTab === 'config' && (
          <ConfigView llmButtons={llmButtons} />
        )}
      </div>
    </div>
  );
}

function OutlineView({ template, loading }) {
  if (loading) {
    return (
      <div className="hint" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ marginBottom: '12px' }}>正在生成大纲...</div>
      </div>
    );
  }

  if (!template || !template.sections || template.sections.length === 0) {
    return (
      <div className="hint" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ marginBottom: '12px' }}>请点击"全文大纲抽取"生成大纲</div>
      </div>
    );
  }

  return (
    <div className="outline-tree" style={{ padding: '8px' }}>
      {template.sections.map((section, idx) => (
        <div
          key={section.id || idx}
          style={{
            paddingLeft: `${(section.level - 1) * 24}px`,
            marginBottom: '16px',
            borderLeft: section.level > 1 ? '2px solid var(--border-color)' : 'none',
            paddingTop: '4px'
          }}
        >
          <div style={{
            fontWeight: section.level === 1 ? 600 : section.level === 2 ? 500 : 400,
            fontSize: section.level === 1 ? '15px' : section.level === 2 ? '14px' : '13px',
            color: section.level === 1 ? 'var(--text-primary)' : section.level === 2 ? 'var(--text-secondary)' : 'var(--text-tertiary)',
            marginBottom: '4px'
          }}>
            {section.level === 1 && '# '}
            {section.level === 2 && '## '}
            {section.level === 3 && '### '}
            {section.title}
          </div>
          {section.summary && (
            <div className="hint" style={{
              fontSize: '12px',
              marginTop: '4px',
              paddingLeft: '12px',
              fontStyle: 'italic',
              opacity: 0.7
            }}>
              {section.summary}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RecordsView({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="hint" style={{ textAlign: 'center', padding: '40px' }}>
        暂无操作记录
      </div>
    );
  }

  return (
    <div className="logs-list" style={{ padding: '8px' }}>
      {logs.map((log, idx) => (
        <div key={log.id || idx} style={{
          marginBottom: '12px',
          padding: '12px',
          background: 'var(--surface-bg)',
          borderRadius: '6px',
          borderLeft: '3px solid var(--primary-accent)'
        }}>
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>
            {log.title || log.action || '操作记录'}
          </div>
          <div className="hint" style={{ fontSize: '11px', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
            {log.content || log.description || ''}
          </div>
          {log.timestamp && (
            <div className="hint" style={{ fontSize: '10px', marginTop: '8px', opacity: 0.6 }}>
              {new Date(log.timestamp).toLocaleString()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ConfigView({ llmButtons }) {
  if (!llmButtons || llmButtons.length === 0) {
    return (
      <div className="hint" style={{ textAlign: 'center', padding: '40px' }}>
        暂无个性化按钮配置
      </div>
    );
  }

  return (
    <div className="config-list" style={{ padding: '8px' }}>
      {llmButtons.map((btn, idx) => (
        <div key={btn.id || idx} style={{
          marginBottom: '12px',
          padding: '12px',
          background: 'var(--surface-bg)',
          borderRadius: '6px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ fontWeight: 500 }}>{btn.label || '未命名按钮'}</div>
            <div className={`pill ${btn.enabled ? 'filled' : 'muted'}`} style={{ fontSize: '11px' }}>
              {btn.enabled ? '启用' : '禁用'}
            </div>
          </div>
          <div className="hint" style={{ fontSize: '12px', marginTop: '4px' }}>
            类型: {btn.kind || 'custom'}
          </div>
          {btn.prompt && (
            <div className="hint" style={{ fontSize: '11px', marginTop: '6px', opacity: 0.7, fontStyle: 'italic' }}>
              提示词: {btn.prompt.slice(0, 60)}{btn.prompt.length > 60 ? '...' : ''}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * 操作调度面板
 */
export function OperationsPanelContent({
  scene,
  onDispatch,
  children,
}) {
  return (
    <>
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={18} />
          <span style={{ fontWeight: 600 }}>指令调度</span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!scene ? (
          <div className="hint" style={{ padding: '20px', textAlign: 'center' }}>
            等待场景加载...
          </div>
        ) : (
          <>
            <label className="form-row">
              <span style={{ fontWeight: 400, fontSize: '13px', color: 'var(--text-secondary)' }}>输入自然语言指令，AI 将自动处理选中文档</span>
              <textarea
                rows={6}
                placeholder="例如：总结这就文档的核心观点，并列出3个待办事项..."
                style={{ minHeight: '120px', resize: 'vertical' }}
              />
            </label>
            <button
              type="button"
              className="primary"
              onClick={() => onDispatch?.()}
              style={{ alignSelf: 'flex-start' }}
            >
              <Play size={16} /> 执行指令
            </button>
            {children}
          </>
        )}
      </div>
    </>
  );
}
