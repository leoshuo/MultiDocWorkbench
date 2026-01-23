import { Trash2, RefreshCw, X, Save, RotateCcw, LogOut, Archive } from 'lucide-react';const UI_TEXT = { t1: "编辑控制台", t2: "收起", t3: "取消", t4: "重置", t5: "控制台是空的", t6: "恢复", t7: "删除", t8: "已删除面板 (", t9: "清空回收站", t10: "未命名按钮", t11: "确定要永久删除这个按钮吗？此操作无法撤销。", t12: "确定要清空回收站吗？所有按钮将永久丢失。" };

export function EditConsole({
  deletedButtons,
  deletedBlocks = [],
  onRestore,
  onPermanentDelete,
  onRestoreBlock,
  onPermanentDeleteBlock,
  onClearAll,
  onClose,
  onSave,
  onCancel,
  onReset
}) {
  const BLOCK_NAME_MAP = {
    'input-form-panel': '输入素材面板',
    'document-list-panel': '文档列表面板',
    'preview-textarea': '预览文本框区域',
    'preview-toolbar': '预览工具栏',
    'processing-panel': '文档处理面板',
    'operations-panel': '操作调度面板'
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '300px',
        height: '100vh',
        backgroundColor: '#fff',
        boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid #e2e8f0',
        transition: 'transform 0.3s ease-in-out'
      }}>
      
            {/* Header */}
            <div style={{
        padding: '16px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc'
      }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>{UI_TEXT.t1}

          </h3>
                    <span style={{
            backgroundColor: '#e2e8f0',
            padding: '2px 6px',
            borderRadius: '99px',
            fontSize: '12px',
            color: '#64748b',
            fontWeight: 600
          }}>
                        {deletedButtons.length + deletedBlocks.length}
                    </span>
                </div>
                <button
          onClick={onClose}
          className="ghost small"
          style={{ padding: '4px' }}
          title={UI_TEXT.t2}>
          
                    <X size={20} />
                </button>
            </div>

            {/* Console Actions */}
            <div style={{
        padding: '16px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        gap: '8px',
        flexDirection: 'column'
      }}>
                {/* Save button moved to main layout */}
                {/* <button
             onClick={onSave}
             className="primary full-width"
             style={{ justifyContent: 'center', gap: '8px' }}
          >
             <Save size={16} /> 完成并保存
          </button> */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
            onClick={onCancel}
            className="secondary"
            style={{ flex: 1, justifyContent: 'center', gap: '8px' }}>
            
                        <LogOut size={16} />{UI_TEXT.t3}
          </button>
                    <button
            onClick={onReset}
            className="ghost danger-text"
            style={{ flex: 1, justifyContent: 'center', gap: '8px', border: '1px solid #fee2e2' }}>
            
                        <RotateCcw size={16} />{UI_TEXT.t4}
          </button>
                </div>
            </div>

            {/* List */}
            <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
                {deletedButtons.length === 0 && deletedBlocks.length === 0 ?
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#94a3b8',
          gap: '12px'
        }}>
                        <Archive size={48} strokeWidth={1} />
                        <p>{UI_TEXT.t5}</p>
                    </div> :

        deletedButtons.map((btn) =>
        <div
          key={btn.id}
          style={{
            padding: '12px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'all 0.2s'
          }}>
          
                            <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
                                <span style={{
              fontWeight: 500,
              color: '#334155',
              fontSize: '14px'
            }}>
                        {btn.label || UI_TEXT.t10}
                                </span>
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                    {new Date(btn.deletedAt || Date.now()).toLocaleTimeString()}
                                </span>
                            </div>

                            <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '4px'
          }}>
                                <button
              onClick={() => onRestore(btn.id)}
              className="secondary small"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              
                                    <RefreshCw size={14} />{UI_TEXT.t6}
            </button>
                                <button
              onClick={() => {
                          if (confirm(UI_TEXT.t11)) {
                  onPermanentDelete(btn.id);
                }
              }}
              className="danger small"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              
                                    <Trash2 size={14} />{UI_TEXT.t7}
            </button>
                            </div>
                        </div>
        )
        }

                {/* Deleted Blocks Section */}
                {
        deletedBlocks.length > 0 &&
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: deletedButtons.length > 0 ? '8px' : '0' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{UI_TEXT.t8}
            {deletedBlocks.length})
                            </div>
                            {deletedBlocks.map((blockId) =>
          <div
            key={blockId}
            style={{
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
            
                                    <div style={{ fontWeight: 500, color: '#334155', fontSize: '14px' }}>
                                        {BLOCK_NAME_MAP[blockId] || blockId}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <button
                onClick={() => onRestoreBlock(blockId)}
                className="secondary small"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                
                                            <RefreshCw size={14} />{UI_TEXT.t6}
              </button>
                                    </div>
                                </div>
          )}
                        </div>

        }
            </div>

            {/* Footer */}
            {
      deletedButtons.length > 0 &&
      <div style={{
        padding: '16px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc'
      }}>
                        <button
          onClick={() => {
          if (confirm(UI_TEXT.t12)) {
              onClearAll();
            }
          }}
          className="danger full-width"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
          
                            <Trash2 size={16} />{UI_TEXT.t9}
        </button>
                    </div>

      }
        </div>);

}
