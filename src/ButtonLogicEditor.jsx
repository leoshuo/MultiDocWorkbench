import { useState } from 'react';
import { Sparkles, Save, X, Loader } from 'lucide-react';

/**
 * ButtonLogicEditor - AI-assisted button logic configuration
 * Supports both global buttons and panel buttons
 */const UI_TEXT = { t1: "按钮逻辑配置", t2: "当前配置", t3: "标签:", t4: "类型:", t5: "提示词:", t6: "用自然语言描述按钮逻辑", t7: "例如：这个按钮应该生成文档的三句话摘要", t8: "AI 建议", t9: "手动配置", t10: "按钮标签", t11: "按钮显示文字", t12: "动作类型", t13: "大纲抽取", t14: "执行指令", t15: "最终生成", t16: "上传文件", t17: "自定义", t18: "AI 提示词 (可选)", t19: "给AI的指令，例如：生成一个三句话的文档摘要", t20: "取消", t21: "保存配置", t22: "未定义", t23: "生成中...", t24: "让AI生成配置", t25: "已生成配置" };
export function ButtonLogicEditor({ button, onSave, onClose }) {
  const [naturalLanguage, setNaturalLanguage] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Draft state for edits
  const [draftLabel, setDraftLabel] = useState(button?.label || '');
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
          currentConfig: {
            label: button?.label,
            kind: button?.kind,
            prompt: button?.prompt
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '请求失败');
      }

      const data = await response.json();
      const suggestion = data.suggestion;

      setAiSuggestion(suggestion);

      // Auto-fill draft fields with AI suggestions
      if (suggestion.label) setDraftLabel(suggestion.label);
      if (suggestion.kind) setDraftKind(suggestion.kind);
      if (suggestion.prompt) setDraftPrompt(suggestion.prompt);

    } catch (err) {
      setError(err.message || '生成逻辑失败');
      console.error('AI generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    onSave({
      label: draftLabel,
      kind: draftKind,
      prompt: draftPrompt
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 10001,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
            <div className="card" style={{
        width: '600px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        overflow: 'hidden'
      }}>
                {/* Header */}
                <div className="card-head" style={{ borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>{UI_TEXT.t1}</h3>
                    <button className="ghost icon-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Current Config */}
                    <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px' }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#666' }}>{UI_TEXT.t2}</h4>
                        <div style={{ fontSize: '12px', display: 'grid', gap: '4px' }}>
                            <div><strong>{UI_TEXT.t3}</strong> {button?.label || UI_TEXT.t22}</div>
                            <div><strong>{UI_TEXT.t4}</strong> {button?.kind || UI_TEXT.t22}</div>
                            {button?.prompt && <div><strong>{UI_TEXT.t5}</strong> {button.prompt}</div>}
                        </div>
                    </div>

                    {/* Natural Language Input */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>{UI_TEXT.t6}

            </label>
                        <textarea
              rows={3}
              value={naturalLanguage}
              onChange={(e) => setNaturalLanguage(e.target.value)}
              placeholder={UI_TEXT.t7}
              style={{ width: '100%', fontSize: '13px', resize: 'vertical' }} />
            
                        <button
              className="primary small"
              onClick={handleAskAI}
              disabled={isLoading || !naturalLanguage.trim()}
              style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              
                            {isLoading ? <Loader size={14} /> : <Sparkles size={14} />}
                            {isLoading ? UI_TEXT.t23 : UI_TEXT.t24}
                        </button>
                        {error && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>{error}</div>}
                    </div>

                    {/* AI Suggestion Preview */}
                    {aiSuggestion &&
          <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '6px', border: '1px solid #7dd3fc' }}>
                            <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#0369a1' }}>{UI_TEXT.t8}</h4>
                            <div style={{ fontSize: '12px', color: '#0c4a6e', marginBottom: '8px' }}>
                                {aiSuggestion.explanation || UI_TEXT.t25}
                            </div>
                        </div>
          }

                    {/* Manual Config */}
                    <div style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 500 }}>{UI_TEXT.t9}</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>{UI_TEXT.t10}</label>
                                <input
                  type="text"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  placeholder={UI_TEXT.t11}
                  style={{ width: '100%', fontSize: '13px' }} />
                
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>{UI_TEXT.t12}</label>
                                <select
                  value={draftKind}
                  onChange={(e) => setDraftKind(e.target.value)}
                  style={{ width: '100%', fontSize: '13px' }}>
                  
                                    <option value="outline_extract">{UI_TEXT.t13}</option>
                                    <option value="dispatch">{UI_TEXT.t14}</option>
                                    <option value="final_generate">{UI_TEXT.t15}</option>
                                    <option value="upload_file">{UI_TEXT.t16}</option>
                                    <option value="custom">{UI_TEXT.t17}</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>{UI_TEXT.t18}</label>
                                <textarea
                  rows={3}
                  value={draftPrompt}
                  onChange={(e) => setDraftPrompt(e.target.value)}
                  placeholder={UI_TEXT.t19}
                  style={{ width: '100%', fontSize: '13px', resize: 'vertical' }} />
                
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ borderTop: '1px solid #eee', padding: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="ghost" onClick={onClose}>{UI_TEXT.t20}</button>
                    <button className="primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Save size={14} />{UI_TEXT.t21}
          </button>
                </div>
            </div>
        </div>);

}
