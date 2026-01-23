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
  Settings,
  History } from
'lucide-react';

/**
 * 输入表单面板（仅表单部分）
 */const UI_TEXT = { t1: "未选择回放目录", t2: "选择目录", t3: "清除目录", t4: "暂无文档", t5: "删除", t6: "输入素材", t7: "文档名称 (如：产品需求文档)", t8: "粘贴文本，或点击下方上传文件...", t9: "保存文本", t10: "上传文件", t11: "文档列表", t12: "选择左侧文档以预览", t13: "请先加载或创建场景", t14: "大纲配置", t15: "沉淀配置", t16: "应用端按钮配置", t17: "历史大纲", t18: "正在生成大纲...", t19: "请点击\"全文大纲抽取\"生成大纲", t20: "暂无沉淀记录", t21: "暂无个性化按钮配置", t22: "类型:", t23: "提示词:", t24: "指令调度", t25: "等待场景加载...", t26: "输入自然语言指令，AI 将自动处理选中文档", t27: "例如：总结这就文档的核心观点，并列出3个待办事项...", t28: "执行指令", t29: "沉淀记录", t30: "未命名按钮", t31: "启用", t32: "禁用" };
export function InputFormPanelContent({
  uploadInputRef,
  handleCreateDoc,
  handleFilePick,
  replayDirName,
  pickReplayDirectory,
  clearReplayDirectory,
  replayDirHandle
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
        onChange={(e) => void handleFilePick(e)} />
      

      <div className="file-row" style={{ justifyContent: 'space-between', marginTop: '12px', padding: '8px', background: 'var(--surface-bg)', borderRadius: '8px' }}>
        <div className="hint" style={{ flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {replayDirName ?
          <span style={{ color: 'var(--primary-accent)', fontWeight: 500 }}>{replayDirName}</span> :

          <span>{UI_TEXT.t1}</span>
          }
        </div>
        <div className="actions" style={{ gap: 4 }}>
          <button
            className="ghost icon-btn"
            type="button"
            title={UI_TEXT.t2}
            onClick={() => void pickReplayDirectory()}>
            
            <FolderOpen size={14} />
          </button>
          <button
            className="ghost icon-btn"
            type="button"
            title={UI_TEXT.t3}
            onClick={() => void clearReplayDirectory()}
            disabled={!replayDirHandle}>
            
            <X size={14} />
          </button>
        </div>
      </div>
    </form>);

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
  // 目录配置 props
  replayDirConfig,
  setReplayDirConfig,
  saveReplayDirConfig,
  replayDirConfigSaving
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* 服务端目录配置 - 应用端和后管端共用 */}
      <div style={{ 
        padding: '8px 10px', 
        background: '#f8fafc', 
        borderBottom: '1px solid #e2e8f0',
        borderRadius: '6px 6px 0 0',
        flexShrink: 0
      }}>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <FolderOpen size={12} />
          <span>文件目录配置</span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>（应用端/后管端共用）</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="text"
            value={replayDirConfig?.dirPath || ''}
            onChange={(e) => setReplayDirConfig && setReplayDirConfig(prev => ({ ...prev, dirPath: e.target.value }))}
            placeholder="服务端目录路径，如 C:\docs 或 /home/docs"
            style={{
              flex: 1,
              padding: '5px 8px',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontSize: '12px',
              background: '#fff'
            }}
          />
          <button
            className="ghost xsmall"
            type="button"
            onClick={saveReplayDirConfig}
            disabled={replayDirConfigSaving}
            style={{ padding: '4px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
          >
            {replayDirConfigSaving ? '...' : '保存'}
          </button>
        </div>
      </div>

      <div className="list" style={{ flex: 1, overflowY: 'auto' }}>
        {docs.length === 0 &&
        <div className="hint" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
            <FileText size={32} opacity={0.2} />
            <span>{UI_TEXT.t4}</span>
          </div>
        }
        {docs.map((d) =>
        <div
          key={d.id}
          className={`list-item ${selectedDocId === d.id ? 'active' : ''}`}
          onClick={() => setSelectedDocId(d.id)}>
          
            <div style={{ fontWeight: 500 }}>{d.name}</div>

            <div className="section-actions" style={{ justifyContent: 'flex-end' }}>
              <button
              type="button"
              className="ghost icon-btn"
              title={UI_TEXT.t5}
              onClick={(e) => {
                e.stopPropagation();
                deleteDoc(d.id);
              }}
              style={{ width: '24px', height: '24px', padding: '4px' }}>
              
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <input
        type="file"
        accept=".txt,.md,.pdf,.docx"
        multiple
        ref={uploadInputRef}
        style={{ display: 'none' }}
        onChange={(e) => void handleFilePick(e)} />
      

    </div>);


}

/**
 * 回放目录面板内容
 */
export function ReplayDirectoryPanelContent({
  replayDirName,
  pickReplayDirectory,
  clearReplayDirectory,
  replayDirHandle
}) {
  return (
    <div className="file-row" style={{ height: '100%', padding: '0px 4px', background: '#ffffff', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
      <div className="hint" style={{ flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
        {replayDirName ?
        <span style={{ color: 'var(--primary-accent)', fontWeight: 500, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{replayDirName}</span> :

        <span style={{ color: 'var(--text-secondary)' }}>{UI_TEXT.t1}</span>
        }
      </div>
      <div className="actions" style={{ gap: 4, display: 'flex' }}>
        <button
          className="ghost icon-btn"
          type="button"
          title={UI_TEXT.t2}
          onClick={() => void pickReplayDirectory()}>
          
          <FolderOpen size={14} />
        </button>
        <button
          className="ghost icon-btn"
          type="button"
          title={UI_TEXT.t3}
          onClick={() => void clearReplayDirectory()}
          disabled={!replayDirHandle}>
          
          <X size={14} />
        </button>
      </div>
    </div>);

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
  replayDirHandle
}) {
  return (
    <>
      <form className="card fixed input-form" onSubmit={handleCreateDoc}>
        <div className="card-head" style={{ marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>{UI_TEXT.t6}</h3>
        </div>

        <label className="form-row">
          <input name="name" placeholder={UI_TEXT.t7} style={{ fontWeight: 500 }} />
        </label>
        <label className="form-row">
          <textarea
            name="content"
            rows={4}
            placeholder={UI_TEXT.t8}>
          </textarea>
        </label>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button type="submit" className="primary" style={{ flex: 1 }}>
            <FileText size={16} />{UI_TEXT.t9}
          </button>
          <div style={{ position: 'relative' }}>
            <input
              type="file"
              accept=".txt,.md,.docx"
              multiple
              ref={uploadInputRef}
              style={{ display: 'none' }}
              onChange={(e) => void handleFilePick(e)} />
            
            <button
              type="button"
              className="ghost"
              onClick={() => uploadInputRef.current?.click()}
              title={UI_TEXT.t10}>
              
              <Upload size={18} />
            </button>
          </div>
        </div>

        <div className="file-row" style={{ justifyContent: 'space-between', marginTop: '12px', padding: '8px', background: 'var(--surface-bg)', borderRadius: '8px' }}>
          <div className="hint" style={{ flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {replayDirName ?
            <span style={{ color: 'var(--primary-accent)', fontWeight: 500 }}>{replayDirName}</span> :

            <span>{UI_TEXT.t1}</span>
            }
          </div>
          <div className="actions" style={{ gap: 4 }}>
            <button
              className="ghost icon-btn"
              type="button"
              title={UI_TEXT.t2}
              onClick={() => void pickReplayDirectory()}>
              
              <FolderOpen size={14} />
            </button>
            <button
              className="ghost icon-btn"
              type="button"
              title={UI_TEXT.t3}
              onClick={() => void clearReplayDirectory()}
              disabled={!replayDirHandle}>
              
              <X size={14} />
            </button>
          </div>
        </div>
      </form>

      <div className="card fixed input-list">
        <div className="card-head">
          <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>{UI_TEXT.t11}</h3>
          <span className="pill muted" style={{ fontSize: '12px' }}>{docs.length}</span>
        </div>
        <div className="list">
          {docs.length === 0 &&
          <div className="hint" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
              <FileText size={32} opacity={0.2} />
              <span>{UI_TEXT.t4}</span>
            </div>
          }
          {docs.map((d) =>
          <div
            key={d.id}
            className={`list-item ${selectedDocId === d.id ? 'active' : ''}`}
            onClick={() => setSelectedDocId(d.id)}>
            
              <div style={{ fontWeight: 500 }}>{d.name}</div>
              <div className="meta" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{d.id.slice(0, 8)}...</div>
              <div className="section-actions" style={{ justifyContent: 'flex-end' }}>
                <button
                type="button"
                className="ghost icon-btn"
                title={UI_TEXT.t5}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteDoc(d.id);
                }}
                style={{ width: '24px', height: '24px', padding: '4px' }}>
                
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>);

}

/**
 * 内容预览面板
 */
export function ContentPreviewPanelContent({
  selectedDoc,
  processingTab, // not used here anymore?
  setProcessingTab // not used here anymore?

}) {
  return (
    <>

      {!selectedDoc ?
      <div className="hint" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
          <Eye size={48} opacity={0.1} />
          <span>{UI_TEXT.t12}</span>
        </div> :

      <div className="preview full">
          <h4 style={{ marginTop: 0 }}>{selectedDoc.name}</h4>
          <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '16px' }}>
            {selectedDoc.content}
          </p>
        </div>
      }

    </>);

}

export function ProcessingPanelContent({
  scene,
  template,
  processingTab,
  setProcessingTab,
  llmButtons,
  logs,
  loading,
  onOpenHistory
}) {
  if (!scene) {
    return (
      <div className="hint" style={{ padding: '20px', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ opacity: 0.5 }}>{UI_TEXT.t13}</span>
      </div>);

  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px' }}>
      {/* Tab buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          className={`ghost ${processingTab === 'outline' ? 'active' : ''}`}
          onClick={() => setProcessingTab('outline')}>
          
          <List size={16} />{UI_TEXT.t14}
        </button>
        <button
          className={`ghost ${processingTab === 'records' ? 'active' : ''}`}
          onClick={() => setProcessingTab('records')}>
          
          <Terminal size={16} />{UI_TEXT.t15}
        </button>
        <button
          className={`ghost ${processingTab === 'config' ? 'active' : ''}`}
          onClick={() => setProcessingTab('config')}>
          
          <Settings size={16} />{UI_TEXT.t16}
        </button>
      </div>

      {/* 历史大纲入口 */}
      {processingTab === 'outline' &&
      <div style={{ marginBottom: '12px', display: 'flex' }}>
          <button
          className="ghost small"
          style={{ color: 'var(--primary-accent)', borderColor: 'var(--primary-accent)' }}
          onClick={onOpenHistory}>
          
            <History size={14} />{UI_TEXT.t17}
        </button>
        </div>
      }

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {processingTab === 'outline' &&
        <OutlineView template={template} loading={loading} />
        }
        {processingTab === 'records' &&
        <RecordsView logs={logs} />
        }
        {processingTab === 'config' &&
        <ConfigView llmButtons={llmButtons} />
        }
      </div>
    </div>);

}

function OutlineView({ template, loading }) {
  if (loading) {
    return (
      <div className="hint" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ marginBottom: '12px' }}>{UI_TEXT.t18}</div>
      </div>);

  }

  if (!template || !template.sections || template.sections.length === 0) {
    return (
      <div className="hint" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ marginBottom: '12px' }}>{UI_TEXT.t19}</div>
      </div>);

  }

  return (
    <div className="outline-tree" style={{ padding: '8px' }}>
      {template.sections.map((section, idx) =>
      <div
        key={section.id || idx}
        style={{
          paddingLeft: `${(section.level - 1) * 24}px`,
          marginBottom: '16px',
          borderLeft: section.level > 1 ? '2px solid var(--border-color)' : 'none',
          paddingTop: '4px'
        }}>
        
          <div style={{
          fontWeight: section.level === 1 ? 600 : section.level === 2 ? 500 : 400,
          fontSize: section.level === 1 ? '15px' : section.level === 2 ? '14px' : '13px',
          color: section.level === 1 ? 'var(--text-primary)' : section.level === 2 ? 'var(--text-secondary)' : 'var(--text-tertiary)',
          marginBottom: '4px'
        }}>
            {section.level === 1 && '# '}
            {section.level === 2 && '## '}
            {section.level === 3 && '### '}
            {section.level === 4 && '#### '}
            {section.title}
          </div>
          {section.summary &&
        <div className="hint" style={{
          fontSize: '12px',
          marginTop: '4px',
          paddingLeft: '12px',
          fontStyle: 'italic',
          opacity: 0.7
        }}>
              {section.summary}
            </div>
        }
        </div>
      )}
    </div>);

}

function RecordsView({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="hint" style={{ textAlign: 'center', padding: '40px' }}>{UI_TEXT.t20}

      </div>);

  }

  return (
    <div className="logs-list" style={{ padding: '8px' }}>
      {logs.map((log, idx) =>
      <div key={log.id || idx} style={{
        marginBottom: '12px',
        padding: '12px',
        background: 'var(--surface-bg)',
        borderRadius: '6px',
        borderLeft: '3px solid var(--primary-accent)'
      }}>
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>
            {log.title || log.action || UI_TEXT.t29}
          </div>
          <div className="hint" style={{ fontSize: '11px', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
            {log.content || log.description || ''}
          </div>
          {log.timestamp &&
        <div className="hint" style={{ fontSize: '10px', marginTop: '8px', opacity: 0.6 }}>
              {new Date(log.timestamp).toLocaleString()}
            </div>
        }
        </div>
      )}
    </div>);

}

function ConfigView({ llmButtons }) {
  if (!llmButtons || llmButtons.length === 0) {
    return (
      <div className="hint" style={{ textAlign: 'center', padding: '40px' }}>{UI_TEXT.t21}

      </div>);

  }

  return (
    <div className="config-list" style={{ padding: '8px' }}>
      {llmButtons.map((btn, idx) =>
      <div key={btn.id || idx} style={{
        marginBottom: '12px',
        padding: '12px',
        background: 'var(--surface-bg)',
        borderRadius: '6px',
        border: '1px solid var(--border-color)'
      }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ fontWeight: 500 }}>{btn.label || UI_TEXT.t30}</div>
            <div className={`pill ${btn.enabled ? 'filled' : 'muted'}`} style={{ fontSize: '11px' }}>
              {btn.enabled ? UI_TEXT.t31 : UI_TEXT.t32}
            </div>
          </div>
          <div className="hint" style={{ fontSize: '12px', marginTop: '4px' }}>{UI_TEXT.t22}
          {btn.kind || 'custom'}
          </div>
          {btn.prompt &&
        <div className="hint" style={{ fontSize: '11px', marginTop: '6px', opacity: 0.7, fontStyle: 'italic' }}>{UI_TEXT.t23}
          {btn.prompt.slice(0, 60)}{btn.prompt.length > 60 ? '...' : ''}
            </div>
        }
        </div>
      )}
    </div>);

}

/**
 * 操作调度面板
 */
export function OperationsPanelContent({
  scene,
  onDispatch,
  children
}) {
  return (
    <>
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={18} />
          <span style={{ fontWeight: 600 }}>{UI_TEXT.t24}</span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!scene ?
        <div className="hint" style={{ padding: '20px', textAlign: 'center' }}>{UI_TEXT.t25}

        </div> :

        <>
            <label className="form-row">
              <span style={{ fontWeight: 400, fontSize: '13px', color: 'var(--text-secondary)' }}>{UI_TEXT.t26}</span>
              <textarea
              rows={6}
              placeholder={UI_TEXT.t27}
              style={{ minHeight: '120px', resize: 'vertical' }} />
            
            </label>
            <button
            type="button"
            className="primary"
            onClick={() => onDispatch?.()}
            style={{ alignSelf: 'flex-start' }}>
            
              <Play size={16} />{UI_TEXT.t28}
          </button>
            {children}
          </>
        }
      </div>
    </>);

}
