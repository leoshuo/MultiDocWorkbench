import { useState, useRef } from 'react';
import { X, Download, FileText, Edit3, Check, Loader2 } from 'lucide-react';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';const UI_TEXT = { t1: "最终文档预览", t2: "下载 Word", t3: "下载 PDF", t4: "编辑内容", t5: "完成编辑", t6: "暂无内容", t7: "正在使用大模型优化文档内容..." };

const levelLabel = {
  1: '一级标题',
  2: '二级标题',
  3: '三级标题',
  4: '四级标题'
};

const levelHeading = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4
};

export function DocumentPreviewModal({ isOpen, onClose, sections, docName, previewText, isGenerating = false }) {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef(null);

  // 生成初始文档内容
  const generateContent = () => {
    // 如果有直接传入的预览文本，优先使用
    if (previewText) return previewText;
    
    if (!sections || sections.length === 0) return '';
    let result = '';
    sections.forEach((sec) => {
      const level = sec.level || 1;
      const prefix = levelLabel[level] || levelLabel[1];
      result += `${prefix}：${sec.title || '未命名章节'}\n`;
      // 支持 summary 字符串或 summaries 数组
      const summaryText = sec.summary || (Array.isArray(sec.summaries) ? sec.summaries.map(s => s.content || '').filter(Boolean).join('\n') : '');
      if (summaryText) {
        result += `${summaryText}\n`;
      }
      result += '\n';
    });
    return result.trim();
  };

  // 初始化内容（每次打开时重新生成）
  useState(() => {
    if (isOpen) {
      setContent(generateContent());
    }
  });

  // 当sections变化或previewText变化时更新内容
  if (isOpen && !content) {
    const newContent = generateContent();
    if (newContent !== content) {
      setContent(newContent);
    }
  }
  
  // 当previewText变化时重置内容
  if (isOpen && previewText && content !== previewText) {
    setContent(previewText);
  }

  // 下载为Word文档
  const downloadAsWord = async () => {
    try {
      const paragraphs = [];

      // 如果是编辑后的纯文本，按行解析
      if (isEditing || content !== generateContent()) {
        const lines = content.split('\n');
        lines.forEach((line) => {
          if (line.trim()) {
            paragraphs.push(new Paragraph({
              children: [new TextRun(line)]
            }));
          } else {
            paragraphs.push(new Paragraph({}));
          }
        });
      } else {
        // 使用结构化数据生成
        sections.forEach((sec) => {
          const level = sec.level || 1;
          paragraphs.push(new Paragraph({
            text: sec.title || '未命名章节',
            heading: levelHeading[level] || HeadingLevel.HEADING_1
          }));
          if (sec.summary) {
            paragraphs.push(new Paragraph({
              children: [new TextRun(sec.summary)]
            }));
          }
          paragraphs.push(new Paragraph({}));
        });
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${docName || '文档'}.docx`);
    } catch (err) {
      console.error('生成Word失败:', err);
      alert('生成Word文档失败: ' + (err.message || '未知错误'));
    }
  };

  // 下载为PDF（使用html2canvas支持中文）
  const downloadAsPDF = async () => {
    try {
      // 动态导入html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // 创建临时容器
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
                position: fixed;
                left: -9999px;
                top: 0;
                width: 595px;
                padding: 40px;
                background: white;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                font-size: 14px;
                line-height: 1.8;
                color: #333;
            `;

      // 将内容转换为HTML格式
      const lines = content.split('\n');
      let htmlContent = '';
      lines.forEach((line) => {
        const isTitle = line.includes('级标题：');
        if (isTitle) {
          htmlContent += `<p style="font-size: 16px; font-weight: bold; margin: 16px 0 8px; color: #111;">${line}</p>`;
        } else if (line.trim()) {
          htmlContent += `<p style="margin: 8px 0; text-indent: 2em;">${line}</p>`;
        } else {
          htmlContent += '<div style="height: 12px;"></div>';
        }
      });

      tempContainer.innerHTML = htmlContent;
      document.body.appendChild(tempContainer);

      // 使用html2canvas渲染
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      document.body.removeChild(tempContainer);

      // 创建PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210 - 20; // A4宽度减去边距
      const pageHeight = 297 - 20; // A4高度减去边距
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      const imgData = canvas.toDataURL('image/png');

      // 添加第一页
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 如果内容超过一页，添加更多页
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${docName || '文档'}.pdf`);
    } catch (err) {
      console.error('生成PDF失败:', err);
      alert('生成PDF文档失败: ' + (err.message || '未知错误'));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={onClose}>
      
            <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
        }}
        onClick={(e) => e.stopPropagation()}>
        
                {/* 标题栏 */}
                <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0'
        }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={20} color="#3b82f6" />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{UI_TEXT.t1}

            </h3>
                    </div>
                    <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#666'
            }}>
            
                        <X size={20} />
                    </button>
                </div>

                {/* 工具栏 */}
                <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 20px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa'
        }}>
                    <button
            onClick={() => setIsEditing(!isEditing)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: isEditing ? '#3b82f6' : '#fff',
              color: isEditing ? '#fff' : '#333',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}>
            
                        {isEditing ? <Check size={16} /> : <Edit3 size={16} />}
                        {isEditing ? UI_TEXT.t5 : UI_TEXT.t4}
                    </button>
                    <button
            onClick={downloadAsWord}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#fff',
              color: '#333',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}>
            
                        <Download size={16} />{UI_TEXT.t2}

          </button>
                    <button
            onClick={downloadAsPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#fff',
              color: '#333',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}>
            
                        <Download size={16} />{UI_TEXT.t3}

          </button>
                </div>

                {/* 内容区域 */}
                <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
          position: 'relative'
        }}>
                    {/* 加载中提示 */}
                    {isGenerating && (
                      <div style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        right: '20px',
                        padding: '12px 16px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        color: '#fff',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        fontWeight: 500,
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                        zIndex: 10
                      }}>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        {UI_TEXT.t7}
                      </div>
                    )}
                    {isEditing ?
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '400px',
              padding: '16px',
              paddingTop: isGenerating ? '60px' : '16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              lineHeight: '1.8',
              resize: 'none',
              fontFamily: 'inherit'
            }} /> :


          <div style={{
            whiteSpace: 'pre-wrap',
            fontSize: '14px',
            lineHeight: '1.8',
            color: '#333',
            padding: '16px',
            paddingTop: isGenerating ? '60px' : '16px',
            background: '#f8fafc',
            borderRadius: '8px',
            minHeight: '400px'
          }}>
                            {content || UI_TEXT.t6}
                        </div>
          }
                </div>
            </div>
        </div>);

}
