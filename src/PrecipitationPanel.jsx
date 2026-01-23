import React, { useState } from 'react';
import { Play, Square, Circle, ChevronRight, ChevronDown, Clock, Move } from 'lucide-react';

/**
 * 沉淀面板 (Precipitation Panel)
 * 用于展示沉淀记录列表、执行复现 (Replay) 以及控制录制状态。
 */const UI_TEXT = { t1: "沉淀记录", t2: "条记录", t3: "自动沉淀 (开始录制)", t4: "录制中...", t5: "结束沉淀", t6: "暂无沉淀记录", t7: "点击上方按钮开始录制您的操作流", t8: "步骤", t9: "输入来源:", t10: "本地文件系统 (File System)", t11: "动作执行:", t12: "解析上传 (Upload & Parse)", t13: "输出目标:", t14: "文档列表 (", t15: "记录位置:", t16: "列表末尾 (Append)", t17: "文件名:", t18: "操作对象:", t19: "上下文:", t20: "输入数据:", t21: "点击操作", t22: "输入内容", t23: "执行处理", t24: "文档上传", t25: "通用操作", t26: "无具体输入", t27: "通用上下文", t28: "未知文件", t29: "来源面板 (Sources Panel)", t30: "修改了面板/标题", t31: "切换了工作台模式", t32: "执行了业务功能", t33: "未命名步骤", t34: "未知组件" };
export function PrecipitationPanel({
  isRecording,
  onStartRecording,
  onStopRecording,
  records = [],
  onReplay
}) {
  const [expandedRecordId, setExpandedRecordId] = useState(null);

  const toggleRecord = (id) => {
    setExpandedRecordId(expandedRecordId === id ? null : id);
  };

  return (
    <div className="precipitation-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
            {/* Header / Controls */}
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>{UI_TEXT.t1}</h3>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {records.length}{UI_TEXT.t2}
          </div>
                </div>

                {/* Recording Control */}
                {!isRecording ?
        <button
          onClick={onStartRecording}
          style={{
            width: '100%',
            padding: '10px',
            background: '#ea4335',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontWeight: 500,
            boxShadow: '0 2px 4px rgba(234, 67, 53, 0.2)'
          }}>
          
                        <Circle size={16} fill="currentColor" />{UI_TEXT.t3}

        </button> :

        <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#ea4335',
            fontSize: '14px',
            fontWeight: 500,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px'
          }}>
                            <div className="recording-dot" style={{ width: '8px', height: '8px', background: '#ea4335', borderRadius: '50%' }} />{UI_TEXT.t4}

          </div>
                        <button
            onClick={onStopRecording}
            style={{
              padding: '10px 16px',
              background: '#fff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: 500
            }}>
            
                            <Square size={16} fill="currentColor" />{UI_TEXT.t5}

          </button>
                    </div>
        }
            </div>

            {/* Records List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                {records.length === 0 ?
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center' }}>
                        <Clock size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 500 }}>{UI_TEXT.t6}</p>
                        <p style={{ margin: 0, fontSize: '12px' }}>{UI_TEXT.t7}</p>
                    </div> :

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {records.map((record) =>
          <div key={record.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', overflow: 'hidden' }}>
                                {/* Record Header */}
                                <div
              onClick={() => toggleRecord(record.id)}
              style={{
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                background: expandedRecordId === record.id ? '#f8fafc' : '#fff',
                borderBottom: expandedRecordId === record.id ? '1px solid #e2e8f0' : 'none'
              }}>
              
                                    <div style={{ color: '#64748b' }}>
                                        {expandedRecordId === record.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{record.title}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{new Date(record.createdAt).toLocaleString()} · {record.sections?.length || 0}{UI_TEXT.t8}</div>
                                    </div>
                                    <button
                onClick={(e) => {e.stopPropagation();onReplay(record);}}
                style={{
                  padding: '6px 12px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}>
                
                                        <Play size={12} fill="currentColor" /> Replay
                                    </button>
                                </div>

                                {/* Detailed Sections View */}
                                <div style={{ padding: '12px', background: '#f8fafc' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {record.sections.map((section, idx) => {
                  // --- 中文语义化处理 ---
                  const actionMap = {
                    'button_click': UI_TEXT.t21,
                    'input': UI_TEXT.t22,
                    'process': UI_TEXT.t23,
                    'upload_file': UI_TEXT.t24
                  };
                  const actionName = actionMap[section.action?.type] || UI_TEXT.t25;

                  // 优化输入/输出显示
                  let inputDesc = UI_TEXT.t26;
                  let contextDesc = UI_TEXT.t27;

                  // Custom renders based on Type
                  if (section.action?.type === 'upload_file') {
                    inputDesc = section.meta?.reproducibility?.fileNames?.join(', ') || section.input?.contentPreview || UI_TEXT.t28;
                    contextDesc = UI_TEXT.t29;
                  } else if (section.input?.contentPreview && section.input.contentPreview !== 'User clicked button') {
                    inputDesc = section.input.contentPreview;

                    if (section.buttonKind === 'title') contextDesc = UI_TEXT.t30;else
                    if (section.buttonKind === 'switch') contextDesc = UI_TEXT.t31;else
                    contextDesc = UI_TEXT.t32;
                  } else {
                    if (section.buttonKind === 'title') contextDesc = UI_TEXT.t30;else
                    if (section.buttonKind === 'switch') contextDesc = UI_TEXT.t31;else
                    contextDesc = UI_TEXT.t32;
                  }

                  return (
                    <div key={section.id} style={{ display: 'flex', gap: '12px', padding: '12px', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                                                    {/* Step Number */}
                                                    <div style={{
                        width: '24px', height: '24px',
                        background: section.action?.type === 'upload_file' ? '#10b981' : '#3b82f6',
                        color: 'white',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 600, flexShrink: 0, marginTop: '2px'
                      }}>
                                                        {idx + 1}
                                                    </div>

                                                    {/* Content */}
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {section.buttonLabel || UI_TEXT.t33}
                                                            <span style={{
                            fontSize: '11px', fontWeight: 400,
                            padding: '2px 6px', borderRadius: '4px',
                            background: '#f1f5f9', color: '#64748b'
                          }}>
                                                                {actionName}
                                                            </span>
                                                        </div>

                                                        {/* 详情描述 */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: '12px', color: '#475569' }}>

                                                            {/* 上传文件特化显示 */}
                                                            {section.action?.type === 'upload_file' ?
                          <>
                                                                    <div style={{ color: '#94a3b8' }}>{UI_TEXT.t9}</div>
                                                                    <div>{UI_TEXT.t10}</div>

                                                                    <div style={{ color: '#94a3b8' }}>{UI_TEXT.t11}</div>
                                                                    <div>{UI_TEXT.t12}</div>

                                                                    <div style={{ color: '#94a3b8' }}>{UI_TEXT.t13}</div>
                                                                    <div>{UI_TEXT.t14}{section.output?.targetLocation || 'List'})</div>

                                                                    <div style={{ color: '#94a3b8' }}>{UI_TEXT.t15}</div>
                                                                    <div>{UI_TEXT.t16}</div>

                                                                    <div style={{ color: '#94a3b8' }}>{UI_TEXT.t17}</div>
                                                                    <div style={{ fontFamily: 'monospace', color: '#0f172a' }}>{inputDesc}</div>
                                                                </> :

                          <>
                                                                    <div style={{ color: '#94a3b8' }}>{UI_TEXT.t18}</div>
                                                                    <div>{section.buttonLabel || UI_TEXT.t34} (ID: {section.buttonId})</div>

                                                                    <div style={{ color: '#94a3b8' }}>{UI_TEXT.t19}</div>
                                                                    <div style={{ color: '#334155' }}>{contextDesc}</div>

                                                                    {inputDesc !== UI_TEXT.t26 &&
                            <>
                                                                            <div style={{ color: '#94a3b8' }}>{UI_TEXT.t20}</div>
                                                                            <div style={{ fontFamily: 'monospace', background: '#f8fafc', padding: '2px 4px', borderRadius: '2px' }}>
                                                                                {inputDesc.length > 50 ? inputDesc.slice(0, 50) + '...' : inputDesc}
                                                                            </div>
                                                                        </>
                            }
                                                                </>
                          }
                                                        </div>
                                                    </div>
                                                </div>);

                })}
                                    </div>
                                </div>
                            </div>
          )}
                    </div>
        }
            </div>

            <style>{`
                @keyframes pulse-red {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                .recording-dot {
                    animation: pulse-red 1.5s infinite;
                }
            `}</style>
        </div>);

}
