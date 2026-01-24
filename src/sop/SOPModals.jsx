/**
 * SOP工作台弹窗组件
 * 包含历史大纲弹窗等模态组件
 */

import React, { useState } from 'react';
import { X, Save, Edit3 } from 'lucide-react';
import { UI_TEXT } from './SOPConstants';

/**
 * 历史大纲弹窗组件
 */
export const HistoryModal = ({ onClose, onSave, onUse, onDelete, onRename, historyList, loading }) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="card" style={{
        width: '500px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        color: '#333',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.05)',
        position: 'relative'
      }}>
        <button
          className="ghost icon-btn"
          onClick={onClose}
          style={{ color: '#666', width: '28px', height: '28px', position: 'absolute', top: '12px', right: '12px', zIndex: 2 }}>
          <X size={20} />
        </button>

        <div className="card-head" style={{ justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '16px 20px', background: '#fafafa' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111', margin: 0 }}>{UI_TEXT.t111}</h3>
        </div>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee' }}>
          <button 
            style={{ 
              width: '100%', 
              borderRadius: '8px', 
              padding: '10px', 
              background: '#3b82f6', 
              color: '#fff', 
              border: 'none', 
              fontSize: '14px', 
              fontWeight: 500, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px' 
            }} 
            onClick={onSave}
          >
            <Save size={16} />{UI_TEXT.t112}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          {loading ? (
            <div className="hint text-center" style={{ padding: '20px' }}>{UI_TEXT.t113}</div>
          ) : historyList.length === 0 ? (
            <div className="hint text-center" style={{ padding: '40px' }}>{UI_TEXT.t114}</div>
          ) : (
            <HistoryList list={historyList} onUse={onUse} onDelete={onDelete} onRename={onRename} />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 历史列表组件
 */
export const HistoryList = ({ list, onUse, onDelete, onRename }) => {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditValue(item.title || item.docName || UI_TEXT.t136);
  };

  const submitEdit = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div style={{ padding: '0' }}>
      {list.map((item) => (
        <div 
          key={item.id} 
          className="list-item" 
          style={{
            cursor: 'default',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '16px 20px',
            borderBottom: '1px solid #f0f0f0',
            margin: 0,
            borderRadius: 0
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            {editingId === item.id ? (
              <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitEdit()}
                  onBlur={submitEdit}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px'
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>
                  {item.title || item.docName || UI_TEXT.t136}
                </div>
                <button
                  className="ghost icon-btn small"
                  onClick={() => startEdit(item)}
                  style={{ width: '24px', height: '24px', color: '#666', opacity: 0.6 }}
                  title={UI_TEXT.t67}
                >
                  <Edit3 size={14} />
                </button>
              </div>
            )}
            <div className="hint" style={{ fontSize: '12px', color: '#999' }}>
              {new Date(item.timestamp).toLocaleString()}
            </div>
          </div>

          <div className="hint" style={{ fontSize: '12px', color: '#666' }}>
            {UI_TEXT.t115}{item.template?.sections?.length || 0}{UI_TEXT.t116}
          </div>

          <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button 
              onClick={() => onDelete(item.id)} 
              style={{ 
                background: '#f8fafc', 
                color: '#64748b', 
                border: '1px solid #e2e8f0', 
                borderRadius: '6px', 
                padding: '6px 14px', 
                fontSize: '13px', 
                cursor: 'pointer', 
                fontWeight: 500 
              }}
            >
              {UI_TEXT.t25}
            </button>
            <button 
              onClick={() => onUse(item)} 
              style={{ 
                background: '#3b82f6', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '6px', 
                padding: '6px 14px', 
                fontSize: '13px', 
                cursor: 'pointer', 
                fontWeight: 500 
              }}
            >
              {UI_TEXT.t134}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryModal;
