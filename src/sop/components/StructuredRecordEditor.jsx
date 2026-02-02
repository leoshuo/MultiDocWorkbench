/**
 * StructuredRecordEditor - 结构化记录编辑器
 * 将大模型记录内容拆解为可编辑的字段
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';

// 定义字段分组和顺序
// 【更新】包含 AI 生成的字段名称
const FIELD_GROUPS = {
  core: {
    title: '核心信息',
    color: '#3b82f6',
    bg: '#eff6ff',
    // 【沉淀名称】是整个沉淀的名称
    // 注意：操作名称、操作类型移到指令与指导分组
    fields: ['沉淀名称', '操作概述', '描述', '文档选择器']
  },
  instruction: {
    title: '指令与指导',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    // 【修改】操作名称、操作类型移到此分组
    fields: ['操作名称', '操作类型', '指令', 'Prompt内容', 'AI指导', 'AI执行指导', '特殊要求', '数据处理需求', 'Replay 执行要点', '输出格式', '计算公式']
  },
  input: {
    title: '输入来源',
    color: '#06b6d4',
    bg: '#ecfeff',
    // 【修复】来源文档、文档名称移到此分组
    // 【新增】原文 - 完整记录选中的原文信息
    fields: ['来源文档', '文档名称', '输入来源', '上下文摘要', '灵活匹配关键词', '选中内容', '原文']
  },
  feature: {
    title: '内容特征',
    color: '#f59e0b',
    bg: '#fffbeb',
    // 【新增】具体内容字段
    fields: ['具体内容', '内容开头', '内容结尾', '前文上下文', '后文上下文', '内容特征', '加粗内容', '原始选中（含标记）', '效验要求']
  },
  destination: {
    title: '目标位置',
    color: '#ec4899',
    bg: '#fdf2f8',
    // 【修复】包含目标标题相关字段
    fields: ['目标位置', '目标标题', '目标标题ID', '多摘要目标']
  },
  result: {
    title: '执行结果',
    color: '#10b981',
    bg: '#f0fdf4',
    // 【修复】包含更多执行结果相关字段
    fields: ['执行结果', '执行详情', '输出摘要', '写入内容', '写入位置', '执行状态', '处理结果', '输出内容']
  },
  extra: {
    title: '其他信息',
    color: '#64748b',
    bg: '#f8fafc',
    // 其他未分类的字段会自动归入此分组
    // 【新增】灵活名称上传 - 用于 add_doc 类型，支持关键词+语义搜索匹配文档
    fields: ['灵活名称上传', '完整脚本记录', '原始回放参数', '备注', '其他']
  }
};

// 字段是否应该用多行文本框
// 【更新】包含 AI 生成的字段名称
const MULTILINE_FIELDS = [
  '描述', '操作概述', '指令', 'Prompt内容', 'AI指导', 'AI执行指导', '特殊要求', '数据处理需求', 
  'Replay 执行要点', '上下文摘要', '完整脚本记录', '原始回放参数', '前文上下文', '后文上下文', 
  '选中内容', '写入内容', '输入来源', '目标位置', '多摘要目标', '加粗内容', '原始选中（含标记）',
  // 【新增】执行结果相关
  '执行结果', '执行详情', '处理结果', '输出内容', '写入位置',
  // 【新增】具体内容、原文
  '具体内容', '原文'
];

/**
 * 解析大模型记录文本为结构化数据
 * @param {string} content - 原始文本内容
 * @returns {Array} 步骤数组，每个步骤包含 title 和 fields 对象
 */
export const parseRecordContent = (content) => {
  if (!content) return [];
  
  try {
    const steps = [];
    
    // 【修复】先检查是否有步骤标记，提取步骤之前的全局字段（如沉淀名称、操作概述）
    const firstStepMatch = content.match(/===\s*步骤\s*\d+[：:]/);
    let globalFields = {};
    let contentForSteps = content;
    
    if (firstStepMatch) {
      // 提取步骤之前的全局内容
      const beforeSteps = content.substring(0, firstStepMatch.index);
      if (beforeSteps.trim()) {
        // 解析全局字段
        const globalFieldRegex = /【([^】]+)】([\s\S]*?)(?=\n【|$)/g;
        let globalMatch;
        while ((globalMatch = globalFieldRegex.exec(beforeSteps)) !== null) {
          const fieldName = (globalMatch[1] || '').trim();
          let fieldValue = (globalMatch[2] || '').trim();
          if (fieldValue.startsWith('\n')) fieldValue = fieldValue.substring(1);
          if (fieldName) {
            globalFields[fieldName] = fieldValue;
          }
        }
        console.log('[parseRecordContent] 解析到全局字段:', Object.keys(globalFields));
      }
      // 只处理步骤部分
      contentForSteps = content.substring(firstStepMatch.index);
    }
    
    // 按步骤分割（使用捕获组保留步骤号和标题）
    // 匹配格式：=== 步骤 N: 标题 === 或 === 步骤 N：标题 ===
    const stepPattern = /===\s*步骤\s*(\d+)[：:]\s*([^=]*?)\s*===/g;
    const stepMatches = [...contentForSteps.matchAll(stepPattern)];
    
    if (stepMatches.length === 0) {
      // 没有步骤标记，整体解析
      const fields = { ...globalFields };
      const fieldRegex = /【([^】]+)】([\s\S]*?)(?=\n【|$)/g;
      let match;
      while ((match = fieldRegex.exec(contentForSteps)) !== null) {
        const fieldName = (match[1] || '').trim();
        let fieldValue = (match[2] || '').trim();
        if (fieldValue.startsWith('\n')) fieldValue = fieldValue.substring(1);
        if (fieldName) fields[fieldName] = fieldValue;
      }
      if (Object.keys(fields).length > 0) {
        steps.push({ title: '当前步骤', fields });
      } else {
        steps.push({ title: '当前步骤', fields: { '原始内容': content } });
      }
      return steps;
    }
    
    // 解析每个步骤的内容
    stepMatches.forEach((stepMatch, idx) => {
      const stepNum = stepMatch[1];
      const stepTitle = (stepMatch[2] || `步骤 ${stepNum}`).trim();
      const stepStartIndex = stepMatch.index + stepMatch[0].length;
      
      // 找到下一个步骤的开始位置，或者内容结束
      const nextStepMatch = stepMatches[idx + 1];
      const stepEndIndex = nextStepMatch ? nextStepMatch.index : contentForSteps.length;
      
      // 提取步骤内容
      const stepContent = contentForSteps.substring(stepStartIndex, stepEndIndex).trim();
      
      // 解析字段
      const fields = {};
      const fieldRegex = /【([^】]+)】([\s\S]*?)(?=\n【|$)/g;
      let match;
      
      while ((match = fieldRegex.exec(stepContent)) !== null) {
        const fieldName = (match[1] || '').trim();
        let fieldValue = (match[2] || '').trim();
        if (fieldValue.startsWith('\n')) fieldValue = fieldValue.substring(1);
        if (fieldName) fields[fieldName] = fieldValue;
      }
      
      // 【调试】打印解析结果
      console.log('[parseRecordContent] 解析步骤:', {
        stepNum,
        stepTitle,
        stepContentLength: stepContent.length,
        parsedFieldCount: Object.keys(fields).length,
        parsedFieldNames: Object.keys(fields),
        hasExecutionResult: '执行结果' in fields
      });
      
      // 如果没有解析到字段，说明是非结构化内容
      if (Object.keys(fields).length === 0 && stepContent) {
        fields['原始内容'] = stepContent;
      }
      
      steps.push({
        title: stepTitle,
        fields
      });
    });
    
    // 【已移至上面】没有步骤标记的情况已在前面处理
    
    return steps;
  } catch (error) {
    console.error('[parseRecordContent] 解析失败:', error);
    // 解析失败时返回原始内容作为单步骤
    return [{ title: '当前步骤', fields: { '原始内容': content || '' } }];
  }
};

/**
 * 将结构化数据转换回文本格式（用于多步骤）
 * @param {Array} steps - 步骤数组
 * @param {number} startIndex - 起始索引（可选，默认 0）
 * @returns {string} 格式化的文本
 */
export const serializeToContent = (steps, startIndex = 0) => {
  return steps.map((step, idx) => {
    const lines = [`=== 步骤 ${startIndex + idx + 1}: ${step.title} ===`];
    
    Object.entries(step.fields).forEach(([key, value]) => {
      if (value && value.trim()) {
        // 多行内容前加换行
        if (value.includes('\n') || MULTILINE_FIELDS.includes(key)) {
          lines.push(`【${key}】\n${value}`);
        } else {
          lines.push(`【${key}】${value}`);
        }
      }
    });
    
    return lines.join('\n');
  }).join('\n\n---\n\n');
};

/**
 * 【新增】将单个步骤序列化为纯字段文本（不带步骤标记）
 * @param {Object} step - 单个步骤对象
 * @returns {string} 格式化的字段文本
 */
const serializeSingleStepFields = (step) => {
  if (!step || !step.fields) return '';
  
  const lines = [];
  Object.entries(step.fields).forEach(([key, value]) => {
    if (value && value.trim()) {
      // 多行内容前加换行
      if (value.includes('\n') || MULTILINE_FIELDS.includes(key)) {
        lines.push(`【${key}】\n${value}`);
      } else {
        lines.push(`【${key}】${value}`);
      }
    }
  });
  
  return lines.join('\n');
};

/**
 * 获取字段所属分组
 */
const getFieldGroup = (fieldName) => {
  for (const [groupKey, group] of Object.entries(FIELD_GROUPS)) {
    if (group.fields.includes(fieldName)) {
      return { key: groupKey, ...group };
    }
  }
  return { key: 'extra', ...FIELD_GROUPS.extra };
};

/**
 * 【新增】灵活名称上传字段组件
 * 用于在"其他信息"组中显示灵活上传输入区域
 * @param {string} currentValue - 当前已有的灵活匹配关键词
 * @param {Function} onValueChange - 值变化回调
 * @param {string} matchResult - 匹配结果描述
 */
const FlexUploadField = ({ 
  disabled, 
  flexUploadLoading, 
  onFlexUpload, 
  groupColor, 
  groupBg,
  currentValue = '',
  onValueChange,  // 点击执行匹配时的回调
  matchResult = ''
}) => {
  const [keywords, setKeywords] = useState(currentValue);
  
  // 当外部值变化时同步
  React.useEffect(() => {
    if (currentValue !== keywords) {
      setKeywords(currentValue);
    }
  }, [currentValue]);
  
  // 【修改】只更新本地状态，不实时通知父组件
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setKeywords(newValue);
    // 【移除】不再实时通知父组件，只有点击"执行匹配"才触发
  };
  
  // 【新增】执行匹配时，同时保存输入值
  const handleExecuteMatch = () => {
    if (keywords.trim()) {
      // 先保存输入的值
      if (onValueChange) {
        onValueChange(keywords.trim());
      }
      // 然后执行匹配
      onFlexUpload?.(keywords.trim());
    }
  };
  
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '4px' 
      }}>
        <label style={{ 
          fontSize: '12px', 
          fontWeight: 600, 
          color: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: '#fff',
            padding: '1px 6px',
            borderRadius: '3px',
            fontSize: '10px'
          }}>
            🔍 灵活名称上传
          </span>
        </label>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>
          输入关键词匹配文档
        </span>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          value={keywords}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder="输入关键词描述，用于灵活匹配文档名称..."
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '12px',
            border: '1px solid #93c5fd',
            borderRadius: '6px',
            background: '#eff6ff',
            color: '#374151'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && keywords.trim()) {
              handleExecuteMatch();
            }
          }}
        />
        <button
          type="button"
          onClick={handleExecuteMatch}
          disabled={disabled || flexUploadLoading || !keywords.trim()}
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 500,
            border: 'none',
            borderRadius: '6px',
            background: (disabled || flexUploadLoading || !keywords.trim())
              ? '#d1d5db'
              : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: '#fff',
            cursor: (disabled || flexUploadLoading || !keywords.trim()) ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: (disabled || flexUploadLoading || !keywords.trim()) 
              ? 'none' 
              : '0 2px 4px rgba(59, 130, 246, 0.3)'
          }}
          title="基于关键词匹配目标文件夹中的文档"
        >
          {flexUploadLoading ? '⏳ 匹配中...' : '🔍 执行匹配'}
        </button>
      </div>
      {/* 显示匹配结果 */}
      {matchResult && (
        <div style={{ 
          fontSize: '11px', 
          color: '#059669', 
          marginTop: '6px',
          padding: '6px 10px',
          background: '#ecfdf5',
          borderRadius: '4px',
          border: '1px solid #a7f3d0'
        }}>
          <span style={{ fontWeight: 500 }}>✅ 匹配规则：</span>
          <span>{matchResult}</span>
        </div>
      )}
      <div style={{ 
        fontSize: '10px', 
        color: '#64748b', 
        marginTop: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span>💡</span>
        <span>例如输入"2024年10月报告"，系统将在目标文件夹中查找匹配的文档</span>
      </div>
    </div>
  );
};

/**
 * 结构化记录编辑器组件
 * @param {Object} props
 * @param {string} props.content - 记录内容
 * @param {Function} props.onChange - 内容变化回调
 * @param {boolean} props.disabled - 是否禁用编辑
 * @param {string} props.placeholder - 空状态提示
 * @param {Object} props.fieldValidation - 字段校验配置 { stepIndex_fieldName: true/false }
 * @param {Function} props.onFieldValidationChange - 字段校验配置变化回调
 * @param {Array} props.sections - 【可选】原始 sections 数组，用于确定步骤数量和标题
 * @param {number} props.activeStepIndex - 【新增】外部控制的当前步骤索引，-1 表示显示全部
 * @param {Function} props.onFlexUpload - 【新增】灵活上传回调，参数为 (keywords)
 * @param {boolean} props.flexUploadLoading - 【新增】灵活上传加载状态
 */
export const StructuredRecordEditor = ({
  content,
  onChange,
  disabled = false,
  placeholder = '暂无记录内容',
  fieldValidation = {},
  onFieldValidationChange,
  sections = null,  // 【新增】原始 sections 数组
  activeStepIndex: externalActiveStepIndex = 0,  // 【新增】外部控制的步骤索引
  onFlexUpload = null,  // 【新增】灵活上传回调
  flexUploadLoading = false,  // 【新增】灵活上传加载状态
  forcedViewMode = null  // 【新增】外部强制切换视图模式
}) => {
  // 解析内容为结构化数据
  const [parsedSteps, setParsedSteps] = useState([]);
  // 【修改】使用外部传入的步骤索引，如果为 -1 则显示第一个步骤
  const activeStepIndex = externalActiveStepIndex >= 0 ? externalActiveStepIndex : 0;
  const [viewMode, setViewMode] = useState('structured'); // 'structured' | 'raw'
  // 【修改】默认所有分组都不展开
  const [expandedGroups, setExpandedGroups] = useState({
    core: false,
    instruction: false,
    input: false,
    feature: false,
    destination: false,
    result: false,
    extra: false
  });
  
  // 【新增】当有灵活上传功能时，自动展开"其他信息"组
  useEffect(() => {
    if (onFlexUpload) {
      setExpandedGroups(prev => ({ ...prev, extra: true }));
    }
  }, [onFlexUpload]);

  // 【新增】外部强制切换视图模式
  useEffect(() => {
    if (forcedViewMode === 'structured' || forcedViewMode === 'raw') {
      setViewMode(forcedViewMode);
    }
  }, [forcedViewMode]);
  
  // 当外部 content 或 sections 变化时重新解析（带防抖，避免频繁解析）
  useEffect(() => {
    // 对于短内容直接解析，长内容添加防抖
    const contentLength = (content || '').length;
    const debounceMs = contentLength > 5000 ? 300 : 0;
    
    const timer = setTimeout(() => {
      // 【关键修改】如果提供了 sections 数组，使用它来确定步骤数量和标题
      if (sections && Array.isArray(sections) && sections.length > 0) {
        // 从 content 中解析字段内容
        const parsedFromContent = parseRecordContent(content);
        
        // 【调试】打印解析结果
        console.log('[StructuredRecordEditor] 解析结果:', {
          sectionsCount: sections.length,
          parsedCount: parsedFromContent.length,
          parsedFields: parsedFromContent.map(p => ({ title: p.title, fieldCount: Object.keys(p.fields || {}).length, fieldNames: Object.keys(p.fields || {}) }))
        });
        
        // 基于 sections 创建步骤，确保步骤数量与原始录制一致
        const steps = sections.map((section, idx) => {
          const action = section.action || '操作';
          
          // 【修复】多种匹配策略
          let matchedParsed = null;
          
          // 策略1：如果只有一个 section 且只有一个解析结果，直接使用
          if (sections.length === 1 && parsedFromContent.length >= 1) {
            // 合并所有解析结果的字段（因为可能整体被解析为一个步骤）
            matchedParsed = { fields: {} };
            parsedFromContent.forEach(p => {
              Object.assign(matchedParsed.fields, p.fields || {});
            });
          }
          // 策略2：按索引匹配
          else if (parsedFromContent[idx]) {
            matchedParsed = parsedFromContent[idx];
          }
          // 策略3：按标题匹配
          else {
            matchedParsed = parsedFromContent.find(p => 
              p.title.includes(action) || action.includes(p.title)
            );
          }
          
          return {
            title: action,
            fields: matchedParsed?.fields || {}
          };
        });
        
        setParsedSteps(steps);
        if (steps.length > 0 && activeStepIndex >= steps.length) {
          setActiveStepIndex(0);
        }
      } else {
        // 没有提供 sections，使用传统的文本解析
        const steps = parseRecordContent(content);
        setParsedSteps(steps);
        if (steps.length > 0 && activeStepIndex >= steps.length) {
          setActiveStepIndex(0);
        }
      }
    }, debounceMs);
    
    return () => clearTimeout(timer);
  }, [content, sections]);
  
  // 更新字段值
  const updateField = useCallback((stepIndex, fieldName, value) => {
    setParsedSteps(prev => {
      const next = [...prev];
      if (next[stepIndex]) {
        next[stepIndex] = {
          ...next[stepIndex],
          fields: {
            ...next[stepIndex].fields,
            [fieldName]: value
          }
        };
      }
      // 序列化并通知外部
      const newContent = serializeToContent(next);
      onChange?.(newContent);
      return next;
    });
  }, [onChange]);
  
  // 更新步骤标题
  const updateStepTitle = useCallback((stepIndex, newTitle) => {
    setParsedSteps(prev => {
      const next = [...prev];
      if (next[stepIndex]) {
        next[stepIndex] = { ...next[stepIndex], title: newTitle };
      }
      const newContent = serializeToContent(next);
      onChange?.(newContent);
      return next;
    });
  }, [onChange]);
  
  // 添加新字段（添加空字段不触发 onChange，等待用户输入后再同步）
  const addField = useCallback((stepIndex, fieldName) => {
    setParsedSteps(prev => {
      const next = [...prev];
      if (next[stepIndex] && next[stepIndex].fields[fieldName] === undefined) {
        next[stepIndex] = {
          ...next[stepIndex],
          fields: {
            ...next[stepIndex].fields,
            [fieldName]: ''
          }
        };
      }
      return next;
    });
  }, []);
  
  // 删除字段
  const removeField = useCallback((stepIndex, fieldName) => {
    setParsedSteps(prev => {
      const next = [...prev];
      if (next[stepIndex] && next[stepIndex].fields[fieldName] !== undefined) {
        const newFields = { ...next[stepIndex].fields };
        delete newFields[fieldName];
        next[stepIndex] = { ...next[stepIndex], fields: newFields };
      }
      const newContent = serializeToContent(next);
      onChange?.(newContent);
      return next;
    });
  }, [onChange]);
  
  // 切换分组展开状态
  const toggleGroup = useCallback((groupKey) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }, []);
  
  // 按分组整理当前步骤的字段
  const groupedFields = useMemo(() => {
    if (!parsedSteps[activeStepIndex]) return {};
    
    const currentFields = parsedSteps[activeStepIndex].fields;
    const grouped = {};
    
    // 初始化所有分组
    Object.keys(FIELD_GROUPS).forEach(key => {
      grouped[key] = [];
    });
    
    // 分配字段到分组
    Object.entries(currentFields).forEach(([fieldName, value]) => {
      const group = getFieldGroup(fieldName);
      if (!grouped[group.key]) grouped[group.key] = [];
      grouped[group.key].push({ name: fieldName, value });
    });
    
    // 【调试】打印分组结果
    const nonEmptyGroups = Object.entries(grouped).filter(([k, v]) => v.length > 0);
    if (nonEmptyGroups.length > 0) {
      console.log('[StructuredRecordEditor] 字段分组:', 
        nonEmptyGroups.map(([k, v]) => `${k}(${v.length}项: ${v.map(f => f.name).join(', ')})`).join(', ')
      );
    }
    
    return grouped;
  }, [parsedSteps, activeStepIndex]);
  
  // 【已禁用】不再自动展开分组，按用户要求默认收起
  // useEffect(() => {
  //   if (Object.keys(groupedFields).length === 0) return;
  //   const groupsWithFields = Object.entries(groupedFields)
  //     .filter(([key, fields]) => fields.length > 0)
  //     .map(([key]) => key);
  //   if (groupsWithFields.length > 0) {
  //     setExpandedGroups(prev => {
  //       const next = { ...prev };
  //       groupsWithFields.forEach(key => {
  //         next[key] = true;
  //       });
  //       return next;
  //     });
  //   }
  // }, [groupedFields]);
  
  // 空状态
  if (parsedSteps.length === 0) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: '#94a3b8',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px dashed #e2e8f0'
      }}>
        {placeholder}
      </div>
    );
  }
  
  const currentStep = parsedSteps[activeStepIndex];
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 视图模式切换 - 置顶固定 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '8px',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: '-12px',  // 抵消父容器的 padding
        zIndex: 20,
        background: '#fafbff',  // 与父容器背景一致
        paddingTop: '12px',
        marginTop: '-12px',
        marginLeft: '-12px',
        marginRight: '-12px',
        paddingLeft: '12px',
        paddingRight: '12px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setViewMode('structured')}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              background: viewMode === 'structured' 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : '#f1f5f9',
              color: viewMode === 'structured' ? '#fff' : '#64748b'
            }}
          >
            🔧 结构化编辑
          </button>
          <button
            type="button"
            onClick={() => setViewMode('raw')}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              background: viewMode === 'raw' 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : '#f1f5f9',
              color: viewMode === 'raw' ? '#fff' : '#64748b'
            }}
          >
            📝 原始文本
          </button>
        </div>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          {viewMode === 'structured' ? '可视化编辑各字段' : '直接编辑原始文本'}
        </span>
      </div>
      
      {/* 原始文本模式 - 【修复】只显示当前步骤的原始文本（不带步骤标记） */}
      {viewMode === 'raw' && (
        <div>
          <div style={{ 
            marginBottom: '8px', 
            fontSize: '12px', 
            color: '#6b7280',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>当前显示：步骤 {activeStepIndex + 1} 的原始文本</span>
            <span style={{ color: '#94a3b8' }}>直接编辑原始文本</span>
          </div>
          <textarea
            value={(() => {
              // 【修改】使用纯字段序列化，不带"=== 步骤 N: ==="标记
              const step = parsedSteps[activeStepIndex];
              if (!step) return '';
              return serializeSingleStepFields(step);
            })()}
            onChange={(e) => {
              // 更新当前步骤的原始文本
              const newFieldsContent = e.target.value;
              // 重新解析字段内容（不带步骤标记的格式）
              const fields = {};
              const fieldRegex = /【([^】]+)】([\s\S]*?)(?=\n【|$)/g;
              let match;
              while ((match = fieldRegex.exec(newFieldsContent)) !== null) {
                const fieldName = (match[1] || '').trim();
                let fieldValue = (match[2] || '').trim();
                if (fieldValue.startsWith('\n')) fieldValue = fieldValue.substring(1);
                if (fieldName) fields[fieldName] = fieldValue;
              }
              
              setParsedSteps(prev => {
                const next = [...prev];
                if (next[activeStepIndex]) {
                  next[activeStepIndex] = {
                    ...next[activeStepIndex],
                    fields
                  };
                }
                const fullContent = serializeToContent(next);
                onChange?.(fullContent);
                return next;
              });
            }}
            disabled={disabled}
            placeholder={placeholder}
            style={{
              width: '100%',
              minHeight: '250px',
              padding: '12px',
              fontSize: '12px',
              fontFamily: 'Consolas, Monaco, monospace',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              resize: 'vertical',
              lineHeight: '1.6',
              background: '#fff'
            }}
          />
        </div>
      )}
      
      {/* 结构化模式 */}
      {viewMode === 'structured' && (
        <>
      {/* 【删除】步骤切换按钮已移至上层组件，由外部 activeStepIndex 控制 */}
      
      {/* 当前步骤标题 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '6px',
        color: '#fff'
      }}>
        <span style={{ fontWeight: 600 }}>步骤 {activeStepIndex + 1}:</span>
        <input
          type="text"
          value={currentStep?.title || ''}
          onChange={(e) => updateStepTitle(activeStepIndex, e.target.value)}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: '14px',
            fontWeight: 500,
            border: 'none',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.9)',
            color: '#374151'
          }}
        />
      </div>
      
      {/* 按分组显示字段 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Object.entries(FIELD_GROUPS).map(([groupKey, group]) => {
          const fields = groupedFields[groupKey] || [];
          const isExpanded = expandedGroups[groupKey];
          // 【新增】对于"其他信息"组，当有灵活上传功能时，即使没有字段也显示
          const showFlexUploadInExtra = groupKey === 'extra' && onFlexUpload && !fields.some(f => f.name === '灵活名称上传');
          const hasFields = fields.length > 0 || showFlexUploadInExtra;
          
          return (
            <div 
              key={groupKey}
              style={{
                border: `1px solid ${hasFields ? group.color + '40' : '#e2e8f0'}`,
                borderRadius: '6px',
                overflow: 'hidden',
                opacity: hasFields ? 1 : 0.6
              }}
            >
              {/* 分组标题 */}
              <div
                onClick={() => toggleGroup(groupKey)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 12px',
                  background: hasFields ? group.bg : '#f8fafc',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: group.color, fontSize: '12px' }}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span style={{ 
                    fontWeight: 500, 
                    fontSize: '13px', 
                    color: hasFields ? group.color : '#94a3b8' 
                  }}>
                    {group.title}
                  </span>
                  {(fields.length > 0 || showFlexUploadInExtra) && (
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#94a3b8',
                      background: '#fff',
                      padding: '1px 6px',
                      borderRadius: '10px'
                    }}>
                      {showFlexUploadInExtra ? (fields.length + 1) : fields.length} 项
                    </span>
                  )}
                </div>
              </div>
              
              {/* 分组内容 */}
              {isExpanded && hasFields && (
                <div style={{ padding: '8px 12px', background: '#fff' }}>
                  {fields.map(({ name, value }) => {
                    // 构建字段校验的 key
                    const validationKey = `${activeStepIndex}_${name}`;
                    const isValidationRequired = fieldValidation[validationKey] === true;
                    
                    return (
                    <div key={name} style={{ marginBottom: '10px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: '4px' 
                      }}>
                        <label style={{ 
                          fontSize: '12px', 
                          fontWeight: 600, 
                          color: group.color,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{
                            background: group.color,
                            color: '#fff',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            fontSize: '10px'
                          }}>
                            {name}
                          </span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* 校验开关 */}
                          <label 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              cursor: disabled ? 'not-allowed' : 'pointer',
                              fontSize: '10px',
                              color: isValidationRequired ? '#f59e0b' : '#94a3b8',
                              background: isValidationRequired ? '#fef3c7' : 'transparent',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              border: `1px solid ${isValidationRequired ? '#fcd34d' : '#e5e7eb'}`
                            }}
                            title={isValidationRequired ? '校验：此字段必须存在才能 Replay 成功' : '不校验：此字段不影响 Replay 结果'}
                          >
                            <input
                              type="checkbox"
                              checked={isValidationRequired}
                              disabled={disabled}
                              onChange={(e) => {
                                onFieldValidationChange?.({
                                  ...fieldValidation,
                                  [validationKey]: e.target.checked
                                });
                              }}
                              style={{ 
                                width: '12px', 
                                height: '12px',
                                cursor: disabled ? 'not-allowed' : 'pointer'
                              }}
                            />
                            {isValidationRequired ? '🔒校验' : '🔓不校验'}
                          </label>
                          <button
                            type="button"
                            onClick={() => removeField(activeStepIndex, name)}
                            disabled={disabled}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#94a3b8',
                              fontSize: '11px',
                              padding: '2px 4px'
                            }}
                            title="删除此字段"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      {/* 【新增】灵活名称上传字段 - 特殊渲染，带执行按钮 */}
                      {name === '灵活名称上传' ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateField(activeStepIndex, name, e.target.value)}
                            disabled={disabled}
                            placeholder="输入关键词描述，用于灵活匹配文档名称..."
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              fontSize: '12px',
                              border: `1px solid ${group.color}30`,
                              borderRadius: '4px',
                              background: group.bg,
                              color: '#374151'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => onFlexUpload?.(value)}
                            disabled={disabled || flexUploadLoading || !value?.trim()}
                            style={{
                              padding: '6px 12px',
                              fontSize: '11px',
                              fontWeight: 500,
                              border: 'none',
                              borderRadius: '4px',
                              background: (disabled || flexUploadLoading || !value?.trim())
                                ? '#d1d5db'
                                : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: '#fff',
                              cursor: (disabled || flexUploadLoading || !value?.trim()) ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                            title="基于关键词匹配目标文件夹中的文档"
                          >
                            {flexUploadLoading ? '⏳ 匹配中...' : '🔍 执行匹配'}
                          </button>
                        </div>
                      ) : MULTILINE_FIELDS.includes(name) || value.length > 100 ? (
                        <textarea
                          value={value}
                          onChange={(e) => updateField(activeStepIndex, name, e.target.value)}
                          disabled={disabled}
                          style={{
                            width: '100%',
                            minHeight: '60px',
                            padding: '8px 10px',
                            fontSize: '12px',
                            border: `1px solid ${group.color}30`,
                            borderRadius: '4px',
                            background: group.bg,
                            color: '#374151',
                            resize: 'vertical',
                            fontFamily: name.includes('脚本') || name.includes('参数') 
                              ? 'Consolas, Monaco, monospace' 
                              : 'inherit',
                            lineHeight: '1.5'
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => updateField(activeStepIndex, name, e.target.value)}
                          disabled={disabled}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            fontSize: '12px',
                            border: `1px solid ${group.color}30`,
                            borderRadius: '4px',
                            background: group.bg,
                            color: '#374151'
                          }}
                        />
                      )}
                    </div>
                  );
                  })}
                  
                  {/* 【修复】灵活名称上传 - 仅在字段列表中没有此字段时才显示独立组件 */}
                  {showFlexUploadInExtra && (
                    <FlexUploadField 
                      disabled={disabled}
                      flexUploadLoading={flexUploadLoading}
                      onFlexUpload={(keywords) => {
                        // 执行灵活上传，并在完成后更新字段
                        onFlexUpload(keywords, (matchResult) => {
                          // 更新当前步骤的字段
                          updateField(activeStepIndex, '灵活名称上传', keywords);
                          if (matchResult) {
                            updateField(activeStepIndex, '灵活匹配关键词', matchResult);
                          }
                        });
                      }}
                      onValueChange={(value) => {
                        // 【新增】实时保存输入的关键词
                        updateField(activeStepIndex, '灵活名称上传', value);
                      }}
                      groupColor={group.color}
                      groupBg={group.bg}
                      currentValue={currentStep?.fields?.['灵活名称上传'] || ''}
                      matchResult={currentStep?.fields?.['灵活匹配关键词'] || ''}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* 快速添加字段 - 按分组显示 */}
      <div style={{
        padding: '10px',
        background: '#f8fafc',
        borderRadius: '6px',
        fontSize: '11px'
      }}>
        <div style={{ color: '#64748b', marginBottom: '8px', fontWeight: 500 }}>快速添加字段：</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* 指令与指导 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
            <span style={{ 
              color: FIELD_GROUPS.instruction.color, 
              fontWeight: 500, 
              minWidth: '65px',
              fontSize: '10px'
            }}>
              {FIELD_GROUPS.instruction.title}
            </span>
            {['操作类型', '操作名称', 'AI指导', '特殊要求'].map(fieldName => {
              const hasField = currentStep?.fields?.[fieldName] !== undefined;
              return (
                <button
                  key={fieldName}
                  type="button"
                  onClick={() => !hasField && addField(activeStepIndex, fieldName)}
                  disabled={disabled || hasField}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    border: `1px solid ${hasField ? '#d1d5db' : FIELD_GROUPS.instruction.color}`,
                    borderRadius: '3px',
                    background: hasField ? '#e5e7eb' : FIELD_GROUPS.instruction.bg,
                    color: hasField ? '#9ca3af' : FIELD_GROUPS.instruction.color,
                    cursor: hasField ? 'not-allowed' : 'pointer'
                  }}
                >
                  + {fieldName}
                </button>
              );
            })}
          </div>
          
          {/* 输入来源 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
            <span style={{ 
              color: FIELD_GROUPS.input.color, 
              fontWeight: 500, 
              minWidth: '65px',
              fontSize: '10px'
            }}>
              {FIELD_GROUPS.input.title}
            </span>
            {['来源文档', '选中内容', '原文'].map(fieldName => {
              const hasField = currentStep?.fields?.[fieldName] !== undefined;
              return (
                <button
                  key={fieldName}
                  type="button"
                  onClick={() => !hasField && addField(activeStepIndex, fieldName)}
                  disabled={disabled || hasField}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    border: `1px solid ${hasField ? '#d1d5db' : FIELD_GROUPS.input.color}`,
                    borderRadius: '3px',
                    background: hasField ? '#e5e7eb' : FIELD_GROUPS.input.bg,
                    color: hasField ? '#9ca3af' : FIELD_GROUPS.input.color,
                    cursor: hasField ? 'not-allowed' : 'pointer'
                  }}
                >
                  + {fieldName}
                </button>
              );
            })}
          </div>
          
          {/* 目标位置 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
            <span style={{ 
              color: FIELD_GROUPS.destination.color, 
              fontWeight: 500, 
              minWidth: '65px',
              fontSize: '10px'
            }}>
              {FIELD_GROUPS.destination.title}
            </span>
            {['目标标题', '目标位置'].map(fieldName => {
              const hasField = currentStep?.fields?.[fieldName] !== undefined;
              return (
                <button
                  key={fieldName}
                  type="button"
                  onClick={() => !hasField && addField(activeStepIndex, fieldName)}
                  disabled={disabled || hasField}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    border: `1px solid ${hasField ? '#d1d5db' : FIELD_GROUPS.destination.color}`,
                    borderRadius: '3px',
                    background: hasField ? '#e5e7eb' : FIELD_GROUPS.destination.bg,
                    color: hasField ? '#9ca3af' : FIELD_GROUPS.destination.color,
                    cursor: hasField ? 'not-allowed' : 'pointer'
                  }}
                >
                  + {fieldName}
                </button>
              );
            })}
          </div>
          
          {/* 执行结果 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
            <span style={{ 
              color: FIELD_GROUPS.result.color, 
              fontWeight: 500, 
              minWidth: '65px',
              fontSize: '10px'
            }}>
              {FIELD_GROUPS.result.title}
            </span>
            {['执行结果', '写入内容'].map(fieldName => {
              const hasField = currentStep?.fields?.[fieldName] !== undefined;
              return (
                <button
                  key={fieldName}
                  type="button"
                  onClick={() => !hasField && addField(activeStepIndex, fieldName)}
                  disabled={disabled || hasField}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    border: `1px solid ${hasField ? '#d1d5db' : FIELD_GROUPS.result.color}`,
                    borderRadius: '3px',
                    background: hasField ? '#e5e7eb' : FIELD_GROUPS.result.bg,
                    color: hasField ? '#9ca3af' : FIELD_GROUPS.result.color,
                    cursor: hasField ? 'not-allowed' : 'pointer'
                  }}
                >
                  + {fieldName}
                </button>
              );
            })}
          </div>
          
          {/* 内容特征 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
            <span style={{ 
              color: FIELD_GROUPS.feature.color, 
              fontWeight: 500, 
              minWidth: '65px',
              fontSize: '10px'
            }}>
              {FIELD_GROUPS.feature.title}
            </span>
            {['具体内容', '内容特征', '效验要求'].map(fieldName => {
              const hasField = currentStep?.fields?.[fieldName] !== undefined;
              return (
                <button
                  key={fieldName}
                  type="button"
                  onClick={() => !hasField && addField(activeStepIndex, fieldName)}
                  disabled={disabled || hasField}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    border: `1px solid ${hasField ? '#d1d5db' : FIELD_GROUPS.feature.color}`,
                    borderRadius: '3px',
                    background: hasField ? '#e5e7eb' : FIELD_GROUPS.feature.bg,
                    color: hasField ? '#9ca3af' : FIELD_GROUPS.feature.color,
                    cursor: hasField ? 'not-allowed' : 'pointer'
                  }}
                >
                  + {fieldName}
                </button>
              );
            })}
          </div>
          
          {/* 【新增】其他信息 - 仅当有灵活上传功能时显示 */}
          {onFlexUpload && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
              <span style={{ 
                color: FIELD_GROUPS.extra.color, 
                fontWeight: 500, 
                minWidth: '65px',
                fontSize: '10px'
              }}>
                {FIELD_GROUPS.extra.title}
              </span>
              {['灵活名称上传'].map(fieldName => {
                const hasField = currentStep?.fields?.[fieldName] !== undefined;
                return (
                  <button
                    key={fieldName}
                    type="button"
                    onClick={() => !hasField && addField(activeStepIndex, fieldName)}
                    disabled={disabled || hasField}
                    style={{
                      padding: '2px 6px',
                      fontSize: '10px',
                      border: `1px solid ${hasField ? '#d1d5db' : '#3b82f6'}`,
                      borderRadius: '3px',
                      background: hasField ? '#e5e7eb' : '#eff6ff',
                      color: hasField ? '#9ca3af' : '#3b82f6',
                      cursor: hasField ? 'not-allowed' : 'pointer'
                    }}
                    title="添加灵活名称上传字段，用于关键词匹配目标文件夹中的文档"
                  >
                    + {fieldName} 🔍
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default StructuredRecordEditor;
