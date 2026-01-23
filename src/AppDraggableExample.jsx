/**
 * App.jsx - 模块化版本（参考实现）
 * 
 * 这个文件展示如何将原有的大型 App.jsx 转换为模块化的可拖动面板版本
 * 
 * 使用步骤：
 * 1. 在现有 App.jsx 顶部添加导入
 * 2. 在 return 语句中根据布局模式条件渲染
 * 3. 逐步迁移状态和事件处理
 */

import { useState, useRef, useEffect } from 'react';
import './style.css';
import './fonts.css';
import './draggable-panel.css';

// 新增导入
import { DraggablePanel, DraggablePanelManager } from './DraggablePanel';
import {
  InputPanelContent,
  ContentPreviewPanelContent,
  ProcessingPanelContent,
  OperationsPanelContent } from
'./PanelComponents';
import {
  getLayoutMode,
  setLayoutMode,
  toggleLayoutMode,
  resetPanelPositions,
  applyPreset } from
'./layoutManager';

/**
 * 这是一个示例，展示如何集成可拖动面板
 * 实际应用中需要从现有 App.jsx 中提取相应的逻辑
 */const UI_TEXT = { t1: "极简版 · MVP", t2: "Agentic任务处理专家", t3: "🖱️ 切换为自由拖动", t4: "重置布局", t5: "📌 切换为固定布局", t6: "默认布局", t7: "堆栈布局", t8: "重置所有位置", t9: "原始输入", t10: "内容预览", t11: "文档处理", t12: "操作调度", t13: "显示输入面板", t14: "显示预览面板", t15: "显示处理面板", t16: "显示操作面板" };
export function AppWithDraggablePanels() {
  const [layoutMode, setLayoutModeState] = useState(getLayoutMode);
  const [docs, setDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [scene, setScene] = useState(null);
  const [processingTab, setProcessingTab] = useState('outline');
  const [visiblePanels, setVisiblePanels] = useState({
    input: true,
    preview: true,
    processing: true,
    operations: true
  });

  const uploadInputRef = useRef(null);

  // 处理面板关闭
  const handlePanelClose = (panelId) => {
    setVisiblePanels((prev) => ({
      ...prev,
      [panelId]: false
    }));
  };

  // 处理面板打开
  const handlePanelOpen = (panelId) => {
    setVisiblePanels((prev) => ({
      ...prev,
      [panelId]: true
    }));
  };

  // 切换布局模式
  const handleToggleLayout = () => {
    const newMode = toggleLayoutMode();
    setLayoutModeState(newMode);
  };

  // 处理创建文档
  const handleCreateDoc = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const content = form.content.value.trim();

    if (!name || !content) {
      alert('文档名和内容都不能为空');
      return;
    }

    try {
      // 这里应该调用后端 API
      const doc = {
        id: `doc_${Date.now()}`,
        name,
        content
      };
      setDocs((prev) => [doc, ...prev]);
      form.reset();
    } catch (err) {
      alert('创建文档失败: ' + err.message);
    }
  };

  // 处理文件选择
  const handleFilePick = async (e) => {
    const files = Array.from(e.target.files || []);
    // 这里应该处理文件上传逻辑
    console.log('Selected files:', files);
  };

  // 删除文档
  const deleteDoc = (docId) => {
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    if (selectedDocId === docId) {
      setSelectedDocId(null);
    }
  };

  // 选中的文档
  const selectedDoc = docs.find((d) => d.id === selectedDocId);

  // ========== 固定布局版本 ==========
  if (layoutMode === 'fixed') {
    return (
      <main className="layout">
        <header className="hero">
          <div>
            <p className="eyebrow">{UI_TEXT.t1}</p>
            <h1>{UI_TEXT.t2}</h1>
          </div>
          <div className="actions">
            <button className="ghost" onClick={handleToggleLayout}>{UI_TEXT.t3}

            </button>
            <button className="ghost small" onClick={() => applyPreset('default')}>{UI_TEXT.t4}

            </button>
          </div>
        </header>

        {/* 这里放置原有的网格布局 */}
        {/* ... 原有的面板代码 ... */}
      </main>);

  }

  // ========== 自由拖动布局版本 ==========
  return (
    <main style={{ padding: '20px', background: '#eef2f7', minHeight: '100vh' }}>
      <header className="hero" style={{ marginBottom: '20px' }}>
        <div>
          <p className="eyebrow">{UI_TEXT.t1}</p>
          <h1>{UI_TEXT.t2}</h1>
        </div>
        <div className="actions" style={{ gap: '8px', flexWrap: 'wrap' }}>
          <button className="ghost" onClick={handleToggleLayout}>{UI_TEXT.t5}

          </button>
          <button className="ghost small" onClick={() => applyPreset('default')}>{UI_TEXT.t6}

          </button>
          <button
            className="ghost small"
            onClick={() => applyPreset('stacked')}>{UI_TEXT.t7}


          </button>
          <button className="ghost small" onClick={resetPanelPositions}>{UI_TEXT.t8}

          </button>
        </div>
      </header>

      <DraggablePanelManager>
        {/* 原始输入面板 */}
        {visiblePanels.input &&
        <DraggablePanel
          id="input"
          title={UI_TEXT.t9}
          defaultX={0}
          defaultY={100}
          width={350}
          height={700}
          onClose={() => handlePanelClose('input')}>
          
            <InputPanelContent
            docs={docs}
            selectedDocId={selectedDocId}
            setSelectedDocId={setSelectedDocId}
            uploadInputRef={uploadInputRef}
            handleCreateDoc={handleCreateDoc}
            handleFilePick={handleFilePick}
            deleteDoc={deleteDoc}
            replayDirName=""
            pickReplayDirectory={() => {}}
            clearReplayDirectory={() => {}}
            replayDirHandle={null} />
          
          </DraggablePanel>
        }

        {/* 内容预览面板 */}
        {visiblePanels.preview &&
        <DraggablePanel
          id="preview"
          title={UI_TEXT.t10}
          defaultX={370}
          defaultY={100}
          width={400}
          height={700}
          onClose={() => handlePanelClose('preview')}>
          
            <ContentPreviewPanelContent
            selectedDoc={selectedDoc}
            processingTab={processingTab}
            setProcessingTab={setProcessingTab} />
          
          </DraggablePanel>
        }

        {/* 文档处理面板 */}
        {visiblePanels.processing &&
        <DraggablePanel
          id="processing"
          title={UI_TEXT.t11}
          defaultX={790}
          defaultY={100}
          width={600}
          height={700}
          onClose={() => handlePanelClose('processing')}>
          
            <ProcessingPanelContent scene={scene} processingTab={processingTab} />
          </DraggablePanel>
        }

        {/* 操作调度面板 */}
        {visiblePanels.operations &&
        <DraggablePanel
          id="operations"
          title={UI_TEXT.t12}
          defaultX={370}
          defaultY={820}
          width={1020}
          height={300}
          onClose={() => handlePanelClose('operations')}>
          
            <OperationsPanelContent scene={scene} onDispatch={() => {}} />
          </DraggablePanel>
        }
      </DraggablePanelManager>

      {/* 面板打开/关闭控制 */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          zIndex: 1000
        }}>
        
        {!visiblePanels.input &&
        <button className="ghost" onClick={() => handlePanelOpen('input')}>{UI_TEXT.t13}

        </button>
        }
        {!visiblePanels.preview &&
        <button className="ghost" onClick={() => handlePanelOpen('preview')}>{UI_TEXT.t14}

        </button>
        }
        {!visiblePanels.processing &&
        <button className="ghost" onClick={() => handlePanelOpen('processing')}>{UI_TEXT.t15}

        </button>
        }
        {!visiblePanels.operations &&
        <button className="ghost" onClick={() => handlePanelOpen('operations')}>{UI_TEXT.t16}

        </button>
        }
      </div>
    </main>);

}

export default AppWithDraggablePanels;