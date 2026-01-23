import React, { useState } from 'react';

import { Settings, Sparkles } from 'lucide-react';



/**
 * 按钮样式编辑器组件
 */const UI_TEXT = { t1: "按钮编辑器", t2: "样式", t3: "逻辑", t4: "按钮文本", t5: "字体大小 (px)", t6: "文本对齐", t7: "← 左对齐", t8: "↔ 居中", t9: "右对齐 →", t10: "文字颜色", t11: "背景颜色", t12: "字体粗细", t13: "正常 (400)", t14: "中等 (500)", t15: "半粗 (600)", t16: "粗 (700)", t17: "特粗 (800)", t18: "边框颜色", t19: "边框宽度 (px)", t20: "圆角 (px)", t21: "删除", t22: "取消", t23: "应用", t24: "预览效果:", t25: "当前配置", t26: "类型:", t27: "提示词:", t28: "用自然语言描述按钮逻辑", t29: "例如：这个按钮应该生成文档的三句话摘要", t30: "AI 建议", t31: "手动配置", t32: "动作类型", t33: "大纲抽取", t34: "执行指令", t35: "最终生成", t36: "上传文件", t37: "自定义", t38: "AI 提示词 (可选)", t39: "给AI的指令，例如：生成一个三句话的文档摘要", t40: "保存配置", t41: "未定义", t42: "生成中...", t43: "让AI生成配置", t44: "已生成配置" };



export function StyleEditor({ button, onStyleChange, onDelete, onClose, onLogicChange }) {

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

  const [activeTab, setActiveTab] = useState('style'); // 'style' or 'logic'



  const handleChange = (key, value) => {

    const updated = { ...localStyle, [key]: value };

    setLocalStyle(updated);

  };



  const handleApply = () => {

    const { label, ...style } = localStyle;

    onStyleChange({ style, label }); // 传递完整更新对象

    // Logic updates are handled separately in the Logic tab

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

        padding: '0',

        borderRadius: '12px',

        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',

        zIndex: 10000,

        minWidth: '320px',

        maxWidth: '400px',

        border: '1px solid #e2e8f0',

        display: 'flex',

        flexDirection: 'column',

        maxHeight: '90vh'

      }}

      onClick={(e) => e.stopPropagation()}>

      
            
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0' }}>
                
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>{UI_TEXT.t1}</h3>
                
        <button

          onClick={onClose}

          style={{

            background: 'transparent',

            border: 'none',

            fontSize: '20px',

            cursor: 'pointer',

            color: '#64748b',

            padding: '4px 8px'

          }}>

          
                    ×
                

        </button>
            
      </div>

            

      {/* Tabs */}
            
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
                
        <button

          onClick={() => setActiveTab('style')}

          style={{

            flex: 1,

            padding: '12px 16px',

            background: 'transparent',

            border: 'none',

            borderBottom: `2px solid ${activeTab === 'style' ? '#3b82f6' : 'transparent'}`,

            cursor: 'pointer',

            fontSize: '14px',

            fontWeight: activeTab === 'style' ? 600 : 400,

            color: activeTab === 'style' ? '#3b82f6' : '#64748b',

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'center',

            gap: '6px'

          }}>

          
                    
          <Settings size={16} />{UI_TEXT.t2}

        </button>
                
        <button

          onClick={() => setActiveTab('logic')}

          style={{

            flex: 1,

            padding: '12px 16px',

            background: 'transparent',

            border: 'none',

            borderBottom: `2px solid ${activeTab === 'logic' ? '#3b82f6' : 'transparent'}`,

            cursor: 'pointer',

            fontSize: '14px',

            fontWeight: activeTab === 'logic' ? 600 : 400,

            color: activeTab === 'logic' ? '#3b82f6' : '#64748b',

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'center',

            gap: '6px'

          }}>

          
                    
          <Sparkles size={16} />{UI_TEXT.t3}

        </button>
            
      </div>

            

      {/* Content Area */}
            
      <div style={{ overflowY: 'auto', flex: 1 }}>
                
        {activeTab === 'style' ?

        <div style={{ padding: '24px' }}>
                        
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            
            {/* 按钮文本 */}
                            
            <div>
                                
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>{UI_TEXT.t4}



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

                }} />

              
                            
            </div>

                            

            {/* 字体大小 */}
                            
            <div>
                                
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>{UI_TEXT.t5}



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

                }} />

              
                            
            </div>

                            

            {/* 文本对齐 */}
                            
            <div>
                                
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>{UI_TEXT.t6}



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

                  }}>{UI_TEXT.t7}





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

                  }}>{UI_TEXT.t8}





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

                  }}>{UI_TEXT.t9}





                </button>
                                
              </div>
                            
            </div>

                            

            {/* 文字颜色 */}
                            
            <div>
                                
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>{UI_TEXT.t10}



              </label>
                                
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    
                <input

                  type="color"

                  value={localStyle.color}

                  onChange={(e) => handleChange('color', e.target.value)}

                  style={{ width: '50px', height: '36px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }} />

                
                                    
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

                  }} />

                
                                
              </div>
                            
            </div>

                            

            {/* 背景颜色 */}
                            
            <div>
                                
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>{UI_TEXT.t11}



              </label>
                                
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    
                <input

                  type="color"

                  value={localStyle.backgroundColor === 'transparent' ? '#ffffff' : localStyle.backgroundColor}

                  onChange={(e) => handleChange('backgroundColor', e.target.value)}

                  style={{ width: '50px', height: '36px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }} />

                
                                    
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

                  }} />

                
                                
              </div>
                            
            </div>

                            

            {/* 字体粗细 */}
                            
            <div>
                                
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>{UI_TEXT.t12}



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

                }}>

                
                                    
                <option value="300">ϸ (300)</option>
                                    
                <option value="400">{UI_TEXT.t13}</option>
                                    
                <option value="500">{UI_TEXT.t14}</option>
                                    
                <option value="600">{UI_TEXT.t15}</option>
                                    
                <option value="700">{UI_TEXT.t16}</option>
                                    
                <option value="800">{UI_TEXT.t17}</option>
                                
              </select>
                            
            </div>

                            

            {/* 边框颜色 */}
                            
            <div>
                                
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>{UI_TEXT.t18}



              </label>
                                
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    
                <input

                  type="color"

                  value={localStyle.borderColor === 'transparent' ? '#ffffff' : localStyle.borderColor}

                  onChange={(e) => handleChange('borderColor', e.target.value)}

                  style={{ width: '50px', height: '36px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }} />

                
                                    
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

                  }} />

                
                                
              </div>
                            
            </div>

                            

            {/* 边框宽度 */}
                            
            <div>
                                
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>{UI_TEXT.t19}



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

                }} />

              
                            
            </div>

                            

            {/* 圆角 */}
                            
            <div>
                                
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>{UI_TEXT.t20}



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

                }} />

              
                            
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

              }}>{UI_TEXT.t21}





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

                }}>{UI_TEXT.t22}





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

                }}>{UI_TEXT.t23}





              </button>
                            
            </div>
                        
          </div>

                        

          {/* 预览 */}
                        
          <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 500 }}>{UI_TEXT.t24}</div>
                            
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

              }}>

              
                                
              {button.label}
                            
            </button>
                        
          </div>
                    
        </div> :



        <LogicTab

          button={button}

          onLogicChange={onLogicChange}

          onClose={onClose} />



        }
            
      </div>
        
    </div>);



}



// Logic Tab Component

function LogicTab({ button, onLogicChange, onClose }) {

  const [naturalLanguage, setNaturalLanguage] = useState('');

  const [aiSuggestion, setAiSuggestion] = useState(null);

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState(null);



  const [draftKind, setDraftKind] = useState(button?.kind || 'custom');

  const [draftPrompt, setDraftPrompt] = useState(button?.prompt || '');



  const handleAskAI = async () => {

    if (!naturalLanguage.trim()) {

      setError('请输入自然语言描述');

      return;

    }



    setIsLoading(true);

    setError(null);



    try {

      const response = await fetch('/api/multi/button-logic', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          buttonId: button?.id,

          naturalLanguage: naturalLanguage.trim(),

          currentConfig: { label: button?.label, kind: button?.kind, prompt: button?.prompt }

        })

      });



      if (!response.ok) {

        const errorData = await response.json();

        throw new Error(errorData.error || '请求失败');

      }



      const data = await response.json();

      const suggestion = data.suggestion;



      setAiSuggestion(suggestion);

      if (suggestion.kind) setDraftKind(suggestion.kind);

      if (suggestion.prompt) setDraftPrompt(suggestion.prompt);

    } catch (err) {

      setError(err.message || '生成逻辑失败');

    } finally {

      setIsLoading(false);

    }

  };



  const handleSave = () => {

    onLogicChange({ kind: draftKind, prompt: draftPrompt });

    onClose();

  };



  return (

    <div style={{ padding: '24px' }}>
            
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
        <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px' }}>
                    
          <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#666' }}>{UI_TEXT.t25}</h4>
                    
          <div style={{ fontSize: '12px', display: 'grid', gap: '4px' }}>
                        
            <div><strong>{UI_TEXT.t26}</strong> {button?.kind || UI_TEXT.t41}</div>
                        
            {button?.prompt && <div><strong>{UI_TEXT.t27}</strong> {button.prompt.substring(0, 50)}{button.prompt.length > 50 ? '...' : ''}</div>}
                    
          </div>
                
        </div>

                

        <div>
                    
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>{UI_TEXT.t28}</label>
                    
          <textarea

            rows={3}

            value={naturalLanguage}

            onChange={(e) => setNaturalLanguage(e.target.value)}

            placeholder={UI_TEXT.t29}

            style={{ width: '100%', fontSize: '13px', resize: 'vertical', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />

          
                    
          <button

            className="primary small"

            onClick={handleAskAI}

            disabled={isLoading || !naturalLanguage.trim()}

            style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>

            
                        
            <Sparkles size={14} />
                        
            {isLoading ? UI_TEXT.t42 : UI_TEXT.t43}
                    
          </button>
                    
          {error && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>{error}</div>}
                
        </div>

                

        {aiSuggestion &&

        <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '6px', border: '1px solid #7dd3fc' }}>
                        
          <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#0369a1' }}>{UI_TEXT.t30}</h4>
                        
          <div style={{ fontSize: '12px', color: '#0c4a6e' }}>{aiSuggestion.explanation || UI_TEXT.t44}</div>
                    
        </div>

        }

                

        <div style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
                    
          <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 500 }}>{UI_TEXT.t31}</h4>

                    

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        
            <div>
                            
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>{UI_TEXT.t32}</label>
                            
              <select

                value={draftKind}

                onChange={(e) => setDraftKind(e.target.value)}

                style={{ width: '100%', fontSize: '13px', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white' }}>

                
                                
                <option value="outline_extract">{UI_TEXT.t33}</option>
                                
                <option value="dispatch">{UI_TEXT.t34}</option>
                                
                <option value="final_generate">{UI_TEXT.t35}</option>
                                
                <option value="upload_file">{UI_TEXT.t36}</option>
                                
                <option value="custom">{UI_TEXT.t37}</option>
                            
              </select>
                        
            </div>

                        

            <div>
                            
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>{UI_TEXT.t38}</label>
                            
              <textarea

                rows={3}

                value={draftPrompt}

                onChange={(e) => setDraftPrompt(e.target.value)}

                placeholder={UI_TEXT.t39}

                style={{ width: '100%', fontSize: '13px', resize: 'vertical', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />

              
                        
            </div>

                        

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                            
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

                }}>{UI_TEXT.t22}





              </button>
                            
              <button

                className="primary"

                onClick={handleSave}

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

                }}>{UI_TEXT.t40}





              </button>
                        
            </div>
                    
          </div>
                
        </div>
            
      </div>
        
    </div>);



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

      }} />);





}
