import React, { useState, useEffect } from 'react';


import { SourcesPanel, ChatPanel, StudioPanel } from './MultiPanelComponents';


import { EditableButtonsContainer } from './EditableButton';


import { EditableLayoutPanel, LayoutEditContainer } from './EditablePanel';


import { StyleEditor, StyleEditorOverlay } from './StyleEditor';


import { GalleryVerticalEnd, Layout as LayoutIcon, Save, X, RotateCcw, Pencil, MousePointer2, Settings, ChevronLeft, ChevronRight } from 'lucide-react';


import './style.css';


import './fonts.css';

// ========== 从拆分模块导入常量 ==========
import {
  UI_TEXT,
  REPLAY_META_MARKER,
  SHARED_SCENE_KEY,
  DEFAULT_DISPATCH_SYSTEM_PROMPT,
  DEFAULT_APP_BUTTONS,
  PANEL_IDS,
  DEFAULT_PANEL_VISIBILITY,
  DEFAULT_PANEL_POSITIONS,
  LEGACY_PANEL_MAP,
  MOCK_SOURCES,
  MOCK_MESSAGES,
  MOCK_NOTES
} from './multi/MultiConstants';

// ========== 从拆分模块导入工具函数 ==========
import {
  fetchJson,
  extractReplayMeta,
  pickLineByPrefix,
  stripLinePrefix,
  parseSectionContent,
  loadSharedScene,
  isDocxName,
  loadMammoth,
  readFileText,
  htmlToStructuredText,
  parseDocxFileToStructuredText,
  formatDocSize
} from './multi/MultiUtils';


// 模拟数据接口 (用于内容演示)
// UI_TEXT 已迁移


// MOCK_SOURCES 已迁移


// MOCK_MESSAGES 已迁移


// MOCK_NOTES 已迁移


// REPLAY_META_MARKER 已迁移
// DEFAULT_DISPATCH_SYSTEM_PROMPT 已迁移


// extractReplayMeta 已迁移


// pickLineByPrefix 已迁移


// stripLinePrefix 已迁移


// parseSectionContent 已迁移


// SHARED_SCENE_KEY 已迁移


// fetchJson 已迁移


// loadSharedScene 已迁移


// isDocxName 已迁移


// loadMammoth 已迁移


// htmlToStructuredText 已迁移


// readFileText 已迁移


// parseDocxFileToStructuredText 已迁移


// formatDocSize 已迁移


// DEFAULT_APP_BUTTONS 已迁移


// 面板 ID 定义


// PANEL_IDS, DEFAULT_PANEL_VISIBILITY, DEFAULT_PANEL_POSITIONS, LEGACY_PANEL_MAP 已迁移


function MultiDocWorkbench({ onSwitch }) {


  // --- 基础状态 ---


  const [docs, setDocs] = useState([]);


  const [selectedSourceIds, setSelectedSourceIds] = useState({});


  const [messages, setMessages] = useState(MOCK_MESSAGES);


  const [notes, setNotes] = useState(MOCK_NOTES);


  const [thinking, setThinking] = useState(false);


  const [appButtons, setAppButtons] = useState(DEFAULT_APP_BUTTONS);


  const [depositGroups, setDepositGroups] = useState([]);


  const sources = docs.map((doc) => {


    const name = (doc?.name || '').toString();


    const ext = name.includes('.') ? name.split('.').pop().toUpperCase() : 'TXT';


    return {


      id: doc?.id || name,


      name: name || '\u672a\u547d\u540d\u6587\u6863',


      type: ext || 'TXT',


      size: formatDocSize(doc?.content || ''),


      selected: !!selectedSourceIds[doc?.id]


    };


  });


  // --- 沉淀记录状态 ---


  const [isRecordingRecord, setIsRecordingRecord] = useState(false);


  const [precipitationRecords, setPrecipitationRecords] = useState([]);


  const [currentSessionSections, setCurrentSessionSections] = useState([]); // 录制中的 Sections


  // --- 录制控制 ---


  const handleStartRecording = () => {


    setIsRecordingRecord(true);


    setCurrentSessionSections([]); // 重置当前会话


  };


  const handleStopRecording = async () => {


    setIsRecordingRecord(false);


    if (currentSessionSections.length === 0) {


      alert('\u672c\u6b21\u672a\u5f55\u5236\u4efb\u4f55\u64cd\u4f5c');


      return;


    }


    const newRecord = {


      id: `rec_${Date.now()}`,


      title: `沉淀记录 ${new Date().toLocaleString()}`,


      createdAt: Date.now(),


      sections: [...currentSessionSections]


    };


    try {


      const res = await fetch('/api/multi/precipitation/records', {


        method: 'POST',


        headers: { 'Content-Type': 'application/json' },


        body: JSON.stringify(newRecord)


      });


      if (res.ok) {


        setPrecipitationRecords((prev) => [newRecord, ...prev]);


        setCurrentSessionSections([]);


      } else {


        console.error('Save failed');


        alert('保存记录失败');


      }


    } catch (err) {


      console.error('Failed to save record', err);


      alert('保存记录出错');


    }


  };


  const refreshDocs = async () => {


    try {


      const res = await fetch('/api/docs');


      if (!res.ok) throw new Error('load docs failed');


      const data = await res.json();


      if (Array.isArray(data?.docs)) {


        setDocs(data.docs);


        return data.docs;


      }


    } catch (err) {


      console.error('Failed to load docs', err);


    }


    return null;


  };


  useEffect(() => {


    refreshDocs();
    
    // 从服务器缓存加载对话记录
    fetch('/api/chat/cache')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
        }
      })
      .catch(err => console.log('加载对话缓存失败', err));


  }, []);


  useEffect(() => {


    setSelectedSourceIds((prev) => {


      const next = {};


      docs.forEach((doc) => {


        if (prev[doc.id]) next[doc.id] = true;


      });


      return next;


    });


  }, [docs]);

  // 对话记录变化时保存到缓存
  useEffect(() => {
    // 跳过初始的 MOCK_MESSAGES（避免覆盖缓存）
    if (messages.length === 1 && messages[0]?.id === '1') return;
    
    fetch('/api/chat/cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    }).catch(err => console.log('保存对话缓存失败', err));
  }, [messages]);


  // 加载已有记录


  useEffect(() => {


    fetch('/api/multi/precipitation/records').


    then((res) => res.json()).


    then((data) => {


      if (Array.isArray(data)) {


        setPrecipitationRecords(data.sort((a, b) => b.createdAt - a.createdAt));


      }


    }).


    catch((err) => console.error('Failed to load records', err));


  }, []);


  useEffect(() => {


    fetch('/api/multi/precipitation/groups').


    then((res) => res.ok ? res.json() : []).


    then((data) => {


      if (Array.isArray(data)) setDepositGroups(data);


    }).


    catch((err) => console.error('Failed to load deposit groups', err));


  }, []);


  // (Moved handleReplayRecord to above)


  const [isReplaying, setIsReplaying] = useState(false);


  const [replayStatus, setReplayStatus] = useState('');


  const normalizeAppButtons = (payload) => {


    if (!payload || !Array.isArray(payload.buttons)) return DEFAULT_APP_BUTTONS;


    return payload.buttons.


    map((btn, idx) => {


      if (!btn || typeof btn !== 'object') return null;


      const id = typeof btn.id === 'string' && btn.id.trim() ? btn.id.trim() : `app_btn_${idx}`;


      const label = typeof btn.label === 'string' ? btn.label.trim() : '';


      if (!label) return null;


      const groupIds = Array.isArray(btn.groupIds) ? btn.groupIds.filter(Boolean) : [];


      return { id, label, groupIds };


    }).


    filter(Boolean);


  };


  const appendAssistantMessage = (content) => {


    setMessages((prev) => [...prev, { id: `msg_${Date.now()}`, role: 'assistant', content }]);


  };


  // =====================================================
  // 【重要】应用端 Replay 统一调用服务端 API
  // 确保与后管端逻辑完全一致，不存在任何差别
  // =====================================================
  const replaySections = async (sections, title, options = {}) => {
    const { precipitationMode = 'llm' } = options;
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const results = [];

    // 获取 sceneId
    let sceneId = 'main';
    try {
      const sceneRes = await fetch('/api/scene/main');
      if (sceneRes.ok) {
        const sceneData = await sceneRes.json();
        sceneId = sceneData?.scene?.id || 'main';
      }
    } catch (e) {
      console.error('Replay: 获取 scene 失败', e);
    }

    // 获取 replayDirPath
    const replayDirPath = replayDirConfig?.dirPath || '';

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const actionTitle = section.action || section.content?.split('\n')[0]?.substring(0, 20) || `步骤 ${i + 1}`;
      
      setReplayStatus(`${title} [${i + 1}/${sections.length}] ${precipitationMode === 'llm' ? '🤖' : '📜'} Replay: ${actionTitle}`);

      try {
        // 调用统一的服务端 Replay API
        const res = await fetch('/api/replay/execute-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sceneId,
            section,
            mode: precipitationMode,
            replayDirPath
          })
        });

        const result = await res.json();
        
        if (res.ok) {
          results.push({
            sectionIndex: i,
            status: result.status || 'done',
            reason: result.reason || '',
            replayMode: result.replayMode || precipitationMode
          });
          
          // 如果有更新的模板，同步到前端
          if (result.template) {
            // 触发刷新
            await fetch('/api/outline/cache', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ template: result.template })
            });
          }
        } else {
          results.push({
            sectionIndex: i,
            status: 'fail',
            reason: result.error || '服务端执行失败',
            replayMode: 'script'
          });
        }
      } catch (err) {
        console.error(`Replay section ${i} 失败:`, err);
        results.push({
          sectionIndex: i,
          status: 'fail',
          reason: err.message || '网络错误',
          replayMode: 'script'
        });
      }

      // 步骤间延迟
      if (i < sections.length - 1) {
        await delay(300);
      }
    }

    // 刷新文档列表
    try {
      const docsRes = await fetch('/api/docs');
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        if (Array.isArray(docsData?.docs)) {
          setDocs(docsData.docs);
        }
      }
    } catch (e) {
      console.error('Replay: 刷新文档列表失败', e);
    }

    // 统计结果
    const doneCount = results.filter(r => r.status === 'done').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const skippedCount = results.filter(r => r.status === 'pass' || r.status === 'skipped').length;
    const llmDoneCount = results.filter(r => r.status === 'done' && r.replayMode === 'llm').length;
    const scriptDoneCount = results.filter(r => r.status === 'done' && r.replayMode !== 'llm').length;
    const overallMode = llmDoneCount > scriptDoneCount ? 'llm' : 'script';

    return {
      total: sections.length,
      done: doneCount,
      fail: failCount,
      skipped: skippedCount,
      llmDone: llmDoneCount,
      scriptDone: scriptDoneCount,
      results,
      overallStatus: doneCount === sections.length ? 'done' :
                     (doneCount > 0 || skippedCount > 0) ? 'partial_done' : 'fail',
      aiExecuted: llmDoneCount > 0,
      replayMode: overallMode
    };
  };

  // 以下是旧的独立处理逻辑，已废弃，保留注释供参考
  // 所有 Replay 逻辑现在统一由服务端 /api/replay/execute-section 处理
  const _deprecated_replaySections_old = async (sections, title, options = {}) => {
    // options: { precipitationMode: 'llm'|'script', structuredScript: string }
    const { precipitationMode = 'llm', structuredScript = '' } = options;

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // 收集每步执行结果
    const results = [];

    // 首先从服务器获取最新的文档列表，确保前后台数据同步
    let cachedDocs = [];
    try {
      const res = await fetch('/api/docs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.docs)) {
          cachedDocs = data.docs;
          setDocs(data.docs);  // 同步更新组件状态
        }
      }
    } catch (e) {
      console.error('Replay: 初始化文档列表失败', e);
    }
    // 如果服务器获取失败，使用当前状态
    if (!cachedDocs.length && docs.length) cachedDocs = docs;


    const syncDocs = async () => {


      try {
        const res = await fetch('/api/docs');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.docs)) {
            cachedDocs = data.docs;
            setDocs(data.docs);  // 同步更新组件状态
            return cachedDocs;
          }
        }
      } catch (e) {
        console.error('Replay: 同步文档列表失败', e);
      }
      // 如果失败，返回当前缓存
      return cachedDocs;


    };


    const loadDocsSnapshot = async () => {


      if (!cachedDocs.length) return syncDocs();


      return cachedDocs;


    };

    // ========== 逐步执行 Replay（与后管端 SOPWorkbench 保持一致） ==========
    // 获取当前场景（用于大模型执行）
    let currentScene = null;
    try {
      currentScene = await loadSharedScene();
    } catch (e) {
      console.log('获取场景失败', e);
    }
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i] || {};
      const llmScript = section.llmScript || null;  // 大模型记录
      const originalScript = section.originalScript || section;  // 脚本记录（回退用）
      
      // 使用原始脚本记录的内容进行解析
      const contentForParse = originalScript.content || section.content || '';
      const meta = extractReplayMeta(contentForParse) || {};
      const parsed = parseSectionContent(contentForParse);
      const actionTitle = (section.action || llmScript?.title || meta.record || meta.type || `步骤${i + 1}`).toString();
      
      let finalStatus = 'done';
      let finalReason = '';
      let replayMode = precipitationMode === 'llm' ? 'llm' : 'script';
      
      // 记录大模型失败原因（用于最终反馈）
      let llmFailReason = '';
      
      // =====================================================
      // 【重要】应用端直接复用后管端的 Replay 逻辑
      // 不再使用独立的 executeLLMStep 函数，确保与沉淀集 Replay 结果一致
      // 大模型处理逻辑在各个 metaType 分支内完成（如 insert_to_summary）
      // =====================================================
      
      if (precipitationMode === 'llm') {
        setReplayStatus(`${title} [${i + 1}/${sections.length}] 🤖 大模型 Replay: ${actionTitle}`);
      } else {
        setReplayStatus(`${title} [${i + 1}/${sections.length}] 📜 脚本 Replay: ${actionTitle}`);
      }

      // 解析脚本内容
      const inputText = stripLinePrefix(parsed.inputLine, ['输入来源', '输入来源：', '输入：']);
      const execText = stripLinePrefix(parsed.actionLine, ['动作执行', '动作执行：', '动作：']);
      const summaryText = stripLinePrefix(parsed.summaryLine, ['执行摘要', '执行摘要：', '摘要：', '输出摘要：']);
      const locationText = stripLinePrefix(parsed.locationLine, ['记录位置', '记录位置：', '位置：']);
      const metaSummary = meta?.outputs?.summary ? String(meta.outputs.summary) : '';

      let status = 'done';
      let reason = '';
      const metaType = (meta?.type || '').toString();

      // 解析文档名称
      const resolveDocName = () => (
        meta.docName ||
        meta.selectedDocName ||
        (Array.isArray(meta.inputs) ? meta.inputs.find((item) => item?.docName)?.docName : '') ||
        ''
      ).toString();

      await loadDocsSnapshot();

      // 改进的文档匹配逻辑：支持精确匹配和模糊匹配
      const resolveDoc = (name) => {
        if (!name && !meta.docId) return null;
        // 1. 先按 docId 精确匹配
        if (meta.docId) {
          const byId = cachedDocs.find((doc) => doc?.id === meta.docId);
          if (byId) return byId;
        }
        // 2. 按名称精确匹配
        const exactMatch = cachedDocs.find((doc) => doc?.name === name);
        if (exactMatch) return exactMatch;
        // 3. 忽略大小写匹配
        const lowerName = (name || '').toLowerCase().trim();
        const caseInsensitiveMatch = cachedDocs.find((doc) =>
          (doc?.name || '').toLowerCase().trim() === lowerName
        );
        if (caseInsensitiveMatch) return caseInsensitiveMatch;
        // 4. 部分匹配（文档名包含目标名称，或目标名称包含文档名）
        const partialMatch = cachedDocs.find((doc) => {
          const docNameLower = (doc?.name || '').toLowerCase().trim();
          return docNameLower.includes(lowerName) || lowerName.includes(docNameLower);
        });
        return partialMatch || null;
      };

      // ========== 根据 metaType 执行对应操作 ==========
      if (metaType === 'add_doc' || metaType.startsWith('add_doc')) {
        // ========== 添加文档 Replay ==========
        const docName = resolveDocName();
        await syncDocs();
        let doc = resolveDoc(docName);
        // 如果没有找到匹配的文档，且有已加载的文档，尝试使用第一个未关联的文档
        if (!doc && cachedDocs.length > 0) {
          try {
            const scene = await loadSharedScene();
            const linkedDocIds = new Set(scene?.docIds || []);
            const unlinkedDoc = cachedDocs.find(d => !linkedDocIds.has(d.id));
            if (unlinkedDoc) doc = unlinkedDoc;
          } catch (e) {
            console.error('查找未关联文档失败', e);
          }
        }
        if (!doc) {
          status = 'fail';
          reason = docName ? `未找到文件：${docName}，请先在来源面板上传` : '未记录文件名，且无可用文档';
        } else {
          try {
            const scene = await loadSharedScene();
            if (!scene?.id) throw new Error('scene 未初始化');
            const docIds = Array.from(new Set([...(scene.docIds || []), doc.id]));
            await fetchJson(`/api/scene/${scene.id}`, { method: 'PATCH', body: { docIds } });
            await syncDocs();
            status = 'done';
            reason = `已关联文档：${doc.name}`;
          } catch (err) {
            status = 'fail';
            reason = err?.message || '关联文档失败';
          }
        }

      } else if (metaType === 'delete_doc' || metaType === 'remove_doc' || metaType.startsWith('delete_doc') || metaType.startsWith('remove_doc')) {
        // ========== 删除文档 Replay ==========
        const targetName = resolveDocName();
        const targetDoc = resolveDoc(targetName);
        if (!targetDoc) {
          status = 'fail';
          reason = targetName ? `未找到需删除的文件：${targetName}` : '未找到需删除的文件';
        } else {
          try {
            await fetch(`/api/docs/${targetDoc.id}`, { method: 'DELETE' });
            await syncDocs();
            status = 'done';
            reason = `已删除文件：${targetDoc.name}`;
          } catch (err) {
            status = 'fail';
            reason = '删除文件失败';
          }
        }

      } else if (metaType === 'outline_extract' || metaType.startsWith('outline_extract')) {
        // ========== 提取大纲 Replay ==========
        const docName = resolveDocName();
        const doc = resolveDoc(docName);
        if (!doc) {
          status = 'fail';
          reason = docName ? `未找到文档：${docName}` : '未找到文档';
        } else {
          try {
            const scene = await loadSharedScene();
            if (!scene?.id) throw new Error('scene 未初始化');
            const tplRes = await fetchJson('/api/template/auto', {
              method: 'POST',
              body: { text: doc.content || '', prompt: meta?.prompt || '' }
            });
            if (!tplRes?.template?.sections?.length) {
              throw new Error('未生成可用大纲');
            }
            await fetchJson(`/api/scene/${scene.id}/apply-template`, {
              method: 'POST',
              body: { template: tplRes.template }
            });
            // 同步更新服务端大纲缓存
            try {
              await fetchJson('/api/outline/cache', {
                method: 'POST',
                body: { template: tplRes.template }
              });
            } catch (cacheErr) {
              console.error('同步大纲缓存失败', cacheErr);
            }
            // 保存到历史
            try {
              const historyItem = {
                id: `outline_${Date.now()}`,
                template: tplRes.template,
                timestamp: Date.now(),
                docName: doc?.name || docName || '未命名文档',
                title: doc?.name || docName || '未命名文档'
              };
              await fetchJson('/api/multi/outlines', {
                method: 'POST',
                body: historyItem
              });
            } catch (err) {
              console.error('保存大纲历史失败', err);
            }
            status = 'done';
            reason = `🤖 大模型 Replay Done（大纲抽取：${tplRes.template.sections.length}条）`;
            replayMode = 'llm';
          } catch (err) {
            status = 'fail';
            reason = err?.message || '应用大纲失败';
          }
        }

      } else if (metaType === 'insert_to_summary' || metaType.startsWith('insert_to_summary')) {
        // ========== 填入摘要 / 扩写摘要 Replay ==========
        const targetIds = Array.isArray(meta.targetSectionIds) ? meta.targetSectionIds : [];
        const targetTitles = Array.isArray(meta.selectedSectionTitles) ? meta.selectedSectionTitles : [];

        // 获取输入文本：优先使用沉淀记录中的 inputs，否则从当前大纲中获取目标标题的摘要
        const selectionInput = Array.isArray(meta?.inputs) ? meta.inputs.find((x) => x?.kind === 'selection') : null;
        let inputText = (selectionInput?.text || selectionInput?.textExcerpt || meta?.outputs?.insertedExcerpt || '').toString().trim();

        // 如果沉淀记录中没有输入内容，尝试从当前大纲获取目标标题的摘要作为输入
        // 这对于"扩写摘要"类操作很重要，因为输入应该是当前大纲的最新内容
        if (!inputText && (targetIds.length > 0 || targetTitles.length > 0)) {
          try {
            const scene = await loadSharedScene();
            if (scene?.id) {
              const sceneRes = await fetchJson(`/api/scene/${scene.id}`);
              const tpl = sceneRes?.scene?.customTemplate || sceneRes?.scene?.template;
              if (tpl?.sections?.length) {
                // 定位目标标题
                const targetSections = tpl.sections.filter(s => 
                  targetIds.includes(s.id) || targetTitles.some(t => s.title?.includes(t) || t?.includes(s.title))
                );
                // 使用目标标题的现有摘要作为输入
                if (targetSections.length > 0) {
                  const summaries = targetSections
                    .map(s => s.summary || s.hint || '')
                    .filter(s => s.trim())
                    .join('\n\n');
                  if (summaries.trim()) {
                    inputText = summaries;
                    console.log('[insert_to_summary] 使用当前大纲摘要作为输入:', inputText.substring(0, 100));
                  }
                }
              }
            }
          } catch (e) {
            console.error('[insert_to_summary] 获取当前大纲摘要失败:', e);
          }
        }

        if (!targetIds.length && !targetTitles.length) {
          status = 'fail';
          reason = '未记录目标标题';
        } else if (!inputText) {
          status = 'fail';
          reason = '输入内容为空，无法进行处理';
        } else {
          try {
            // ========== 与后管端保持一致：大模型智能处理 ==========
            // 从 llmScript 或 meta 中获取 AI 指导（兼容多种存储位置）
            const aiGuidance = llmScript?.aiGuidance || meta?.aiGuidance || '';
            const specialRequirements = llmScript?.specialRequirements || meta?.specialRequirements || '';
            
            // 跟踪是否成功使用了大模型
            let usedLLM = false;
            
            // 修改：大模型模式下始终尝试 AI 处理，即使没有明确的 aiGuidance
            if (precipitationMode === 'llm') {
              try {
                // 构建智能处理 prompt - 即使没有 aiGuidance 也提供默认的智能处理
                const hasGuidance = !!(aiGuidance || specialRequirements);
                const processPrompt = hasGuidance 
                  ? `你是一个智能数据处理助手。请按照用户的指导要求，对提取的原始内容进行处理。

【原始内容】
${inputText}

【用户的处理指导】
${aiGuidance || '无特殊指导'}

【特殊要求】
${specialRequirements || '无'}

【任务】
严格按照用户的处理指导对原始内容进行处理。例如：
- 如果指导是"剥离职务头衔，只保留姓名"，则需要识别出所有人名，去掉如"副总队长""支队长"等职务，只返回纯净的姓名
- 如果指导是"提取关键信息"，则需要归纳总结
- 如果指导是"格式化输出"，则需要按要求格式化

【重要】
- 必须按照指导要求处理，不能简单复制原始内容
- 如果是提取姓名类任务，确保不遗漏任何人员
- 处理结果应该简洁明了

请直接返回处理后的结果，不要包含任何解释说明。`
                  : `你是一个智能数据处理助手。请对提取的原始内容进行智能处理和清洗。

【原始内容】
${inputText}

【默认处理规则】
1. 如果内容包含人名+职务的格式（如"副总队长 张三"），自动剥离职务头衔，只保留纯净姓名
2. 去除多余的空格、换行和格式字符
3. 如果有多个项目，用适当的分隔符（如顿号、逗号）分隔
4. 保持内容简洁、规范

【重要】
- 进行合理的数据清洗和格式化
- 处理结果应该简洁明了
- 如果原内容已经很规范，可以保持不变

请直接返回处理后的结果，不要包含任何解释说明。`;

                const processResponse = await fetch('/api/ai/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    messages: [{ role: 'user', content: processPrompt }],
                    maxTokens: 2000
                  })
                });
                
                if (processResponse.ok) {
                  const processData = await processResponse.json();
                  if (processData?.content) {
                    inputText = processData.content.trim();  // 使用处理后的内容
                    usedLLM = true;
                  } else {
                    llmFailReason = '大模型返回内容为空';
                  }
                } else {
                  // HTTP 错误
                  const errText = await processResponse.text().catch(() => '');
                  llmFailReason = `API 请求失败 (${processResponse.status}): ${errText || '未知错误'}`;
                  console.error('大模型 API 错误:', llmFailReason);
                }
              } catch (aiErr) {
                llmFailReason = aiErr?.message || '网络错误或服务不可用';
                console.error('大模型处理失败:', aiErr);
              }
              
              // 如果大模型模式但未成功使用大模型，告知用户原因
              if (!usedLLM && llmFailReason) {
                addMessage('system', `⚠️ 大模型未使用：${llmFailReason}，已回退到脚本模式`);
              }
            }

            const scene = await loadSharedScene();
            if (!scene?.id) throw new Error('scene 未初始化');

            const sceneRes = await fetchJson(`/api/scene/${scene.id}`);
            const tpl = sceneRes?.scene?.customTemplate || sceneRes?.scene?.template;
            if (!tpl?.sections?.length) throw new Error('当前无可用大纲');

            const overwrite = meta?.outputs?.overwrite !== false;

            // 定位目标标题：支持 ID 和标题名称双重匹配
            const isTargetSection = (s) => {
              if (targetIds.includes(s.id)) return true;
              if (targetTitles.some(t => s.title === t || s.title?.includes(t) || t?.includes(s.title))) return true;
              return false;
            };

            const nextTemplate = {
              ...tpl,
              sections: (tpl.sections || []).map((s) => {
                if (!isTargetSection(s)) return s;
                const prev = (s.summary || '').toString();
                const summary = overwrite ? inputText : prev.trim() ? `${prev}\n\n${inputText}` : inputText;
                return { ...s, summary };
              })
            };

            await fetchJson(`/api/scene/${scene.id}/apply-template`, {
              method: 'POST',
              body: { template: nextTemplate }
            });

            status = 'done';
            // 详细说明执行结果
            if (precipitationMode === 'llm') {
              if (usedLLM) {
                reason = `🤖 大模型 Replay Done（已写入摘要：${targetIds.length}项）`;
                replayMode = 'llm';
              } else if (llmFailReason) {
                reason = `📜 脚本 Replay Done（大模型回退原因：${llmFailReason}，已写入摘要：${targetIds.length}项）`;
                replayMode = 'script';
              } else {
                reason = `📜 脚本 Replay Done（已写入摘要：${targetIds.length}项）`;
                replayMode = 'script';
              }
            } else {
              reason = `📜 脚本 Replay Done（已写入摘要：${targetIds.length}项）`;
              replayMode = 'script';
            }
          } catch (err) {
            status = 'fail';
            reason = err?.message || '写入摘要失败';
          }
        }

      } else if (metaType === 'outline_clear' || metaType.startsWith('outline_clear')) {
        // ========== 清除大纲 Replay ==========
        try {
          const scene = await loadSharedScene();
          if (!scene?.id) throw new Error('scene 未初始化');
          await fetchJson(`/api/scene/${scene.id}`, { method: 'PATCH', body: { sectionDocLinks: {} } });
          const emptyTemplate = { id: 'template_empty', name: '空模板', sections: [] };
          await fetchJson(`/api/scene/${scene.id}/apply-template`, {
            method: 'POST',
            body: { template: emptyTemplate }
          });
          // 同步更新服务端大纲缓存
          try {
            await fetchJson('/api/outline/cache', {
              method: 'POST',
              body: { template: emptyTemplate }
            });
          } catch (cacheErr) {
            console.error('同步大纲缓存失败', cacheErr);
          }
          status = 'done';
          reason = '📜 脚本 Replay Done（已清除大纲）';
          replayMode = 'script';
        } catch (err) {
          status = 'fail';
          reason = '清除大纲失败';
        }

      } else if (metaType === 'restore_history_outline' || metaType.startsWith('restore_history_outline')) {
        // ========== 恢复历史大纲 Replay ==========
        try {
          const scene = await loadSharedScene();
          if (!scene?.id) throw new Error('scene 未初始化');
          const outlines = await fetchJson('/api/multi/outlines');
          // 尝试多种方式匹配历史大纲
          let target = null;
          if (Array.isArray(outlines) && outlines.length > 0) {
            // 1. 按 outlineId 精确匹配
            if (meta.outlineId) {
              target = outlines.find((item) => item.id === meta.outlineId);
            }
            // 2. 按标题匹配
            if (!target && meta.outlineTitle) {
              target = outlines.find((item) => (item.title || item.docName) === meta.outlineTitle);
            }
            // 3. 如果都没找到，使用最新的历史大纲
            if (!target) {
              target = outlines[0];
            }
          }
          if (!target?.template) throw new Error('未找到对应大纲存档');
          await fetchJson(`/api/scene/${scene.id}/apply-template`, {
            method: 'POST',
            body: { template: target.template }
          });
          // 同步更新服务端大纲缓存
          try {
            await fetchJson('/api/outline/cache', {
              method: 'POST',
              body: { template: target.template }
            });
          } catch (cacheErr) {
            console.error('同步大纲缓存失败', cacheErr);
          }
          status = 'done';
          const outlineName = target.title || target.docName || '未命名存档';
          reason = `📜 脚本 Replay Done（已恢复大纲：${outlineName}）`;
          replayMode = 'script';
        } catch (err) {
          status = 'fail';
          reason = err?.message || '恢复大纲失败';
        }

      } else if (metaType === 'dispatch' || metaType.startsWith('dispatch') || metaType === 'execute_instruction') {
        // ========== 执行指令 Replay ==========
        try {
          const scene = await loadSharedScene();
          if (!scene?.id) throw new Error('scene 未初始化');

          // 获取指令内容（兼容多种字段名）
          let instructions = meta?.instructions || meta?.promptContent || '';
          
          // 如果没有直接的指令字段，尝试从 content 中提取
          if (!instructions) {
            const contentStr = (section?.content || '').toString();
            const promptMatch = /【指令Prompt】([^\n【]+)/.exec(contentStr);
            const processMatch = /执行指令：([^\n]+)/.exec(contentStr);
            instructions = (promptMatch?.[1] || processMatch?.[1] || '').trim();
          }
          
          if (!instructions) {
            throw new Error('未记录指令内容');
          }

          // ========== 与后管端完全一致：将 AI 指导添加到 instructions 中 ==========
          // 从 llmScript 或 meta 中获取 AI 指导（兼容多种存储位置）
          const aiGuidance = llmScript?.aiGuidance || meta?.aiGuidance || '';
          const specialRequirements = llmScript?.specialRequirements || meta?.specialRequirements || '';
          
          // 关键：aiGuidance 追加到 instructions 中，而不是作为 systemPrompt
          if (precipitationMode === 'llm' && (aiGuidance || specialRequirements)) {
            instructions = `${instructions}

【执行指导】
${aiGuidance || '无特殊指导'}

【特殊要求】
${specialRequirements || '无'}`;
          }

          // systemPrompt 使用 meta.prompt（与后管端一致），不使用 aiGuidance
          const systemPrompt = meta?.prompt || DEFAULT_DISPATCH_SYSTEM_PROMPT;

          // 获取输入内容
          const inputKind = (meta?.inputKind || '').toString();
          let docContent = '';
          let outlineSegments = [];
          
          // 根据输入来源类型获取内容
          if (inputKind === 'result' && Array.isArray(meta?.historyInputs) && meta.historyInputs.length) {
            // 从历史结果获取输入
            docContent = meta.historyInputs
              .map((h, idx) => `【片段${idx + 1}：${h?.key || ''}】\n${h?.text || ''}`)
              .join('\n\n');
          } else if (inputKind.startsWith('outline_')) {
            // 从大纲获取输入（与后管端一致）
            const sceneRes = await fetchJson(`/api/scene/${scene.id}`);
            const tpl = sceneRes?.scene?.customTemplate || sceneRes?.scene?.template;
            const selectedIds = Array.isArray(meta?.selectedSectionIds) ? meta.selectedSectionIds : [];
            const selectedTitles = Array.isArray(meta?.selectedSectionTitles) ? meta.selectedSectionTitles : [];
            const targetSectionsDetail = Array.isArray(meta?.targetSectionsDetail) ? meta.targetSectionsDetail : [];
            const llmTargetSectionsDetail = Array.isArray(llmScript?.targetSectionsDetail) ? llmScript.targetSectionsDetail : [];
            const allSections = tpl?.sections || [];
            let picked = [];

            // 方法1：使用 targetSectionsDetail 中的标题定位（先精确匹配，再模糊匹配）
            const detailsToUse = targetSectionsDetail.length > 0 ? targetSectionsDetail : llmTargetSectionsDetail;
            if (detailsToUse.length > 0) {
              picked = detailsToUse.map(detail => {
                // 精确匹配
                let found = allSections.find(s => s.title === detail.title);
                // ID匹配
                if (!found && detail.id) found = allSections.find(s => s.id === detail.id);
                // 模糊匹配（处理"二级标题「xxx」"格式）
                if (!found && detail.title) {
                  const bracketMatch = detail.title.match(/[「『]([^」』]+)[」』]/);
                  const cleanTitle = bracketMatch ? bracketMatch[1] : detail.title;
                  found = allSections.find(s => 
                    s.title === cleanTitle || 
                    s.title?.includes(cleanTitle) || 
                    cleanTitle?.includes(s.title)
                  );
                }
                return found;
              }).filter(Boolean);
            }

            // 方法2：使用 selectedSectionTitles 定位（先精确匹配，再模糊匹配）
            if (picked.length === 0 && selectedTitles.length > 0) {
              // 精确匹配
              picked = selectedTitles.map(title => allSections.find(s => s.title === title)).filter(Boolean);
              
              // 如果精确匹配失败，尝试模糊匹配（处理"二级标题「xxx」"格式）
              if (picked.length === 0) {
                picked = selectedTitles.map(title => {
                  // 提取「」内的标题
                  const bracketMatch = title.match(/[「『]([^」』]+)[」』]/);
                  const cleanTitle = bracketMatch ? bracketMatch[1] : title;
                  // 尝试多种匹配方式
                  return allSections.find(s => 
                    s.title === cleanTitle || 
                    s.title?.includes(cleanTitle) || 
                    cleanTitle?.includes(s.title)
                  );
                }).filter(Boolean);
              }
            }

            // 方法3：使用 selectedSectionIds 定位（兼容旧记录）
            if (picked.length === 0 && selectedIds.length > 0) {
              picked = allSections.filter(s => selectedIds.includes(s.id));
            }

            // 方法4：使用 llmScript 中的 targetTitle 匹配
            if (picked.length === 0 && llmScript?.targetTitle) {
              // 先清理 targetTitle（处理"二级标题「xxx」"格式）
              const bracketMatch = llmScript.targetTitle.match(/[「『]([^」』]+)[」』]/);
              const cleanTargetTitle = bracketMatch ? bracketMatch[1] : llmScript.targetTitle;
              const found = allSections.find(s => 
                s.title === cleanTargetTitle ||
                s.title?.includes(cleanTargetTitle) || 
                cleanTargetTitle?.includes(s.title)
              );
              if (found) picked = [found];
            }

            if (picked.length === 0) {
              console.error('[dispatch replay] 无法定位目标大纲标题', { 
                selectedTitles, 
                selectedIds, 
                targetSectionsDetail,
                llmTargetTitle: llmScript?.targetTitle,
                availableTitles: allSections.map(s => s.title)
              });
              throw new Error('无法定位目标大纲标题，请确保大纲中存在对应标题');
            }

            outlineSegments = picked.map((sec, idx) => ({
              sectionId: sec.id,
              field: 'summary',
              content: inputKind === 'outline_selected_batch'
                ? `标题：${sec.title}\n摘要：${sec.summary || sec.hint || '(内容为空)'}`
                : sec.summary || sec.hint || sec.title || '(内容为空)',
              label: `片段${idx + 1}`
            }));

            docContent = outlineSegments
              .map(seg => `【${seg.label} | ID=${seg.sectionId}】\n${seg.content}`)
              .join('\n\n');
          } else {
            // 默认从文档获取输入
            const docInputs = Array.isArray(meta?.inputs) ? meta.inputs.filter(x => x?.kind === 'doc_resource' || x?.kind === 'doc') : [];
            if (docInputs.length > 0) {
              const docNames = docInputs.map(d => d?.docName || '').filter(Boolean);
              const matchedDocs = cachedDocs.filter(d => docNames.some(n => d.name === n || d.name?.includes(n)));
              docContent = matchedDocs.map(d => d.content || '').join('\n\n');
            } else if (cachedDocs.length > 0) {
              // 如果没有指定文档，使用所有已加载的文档
              docContent = cachedDocs.map(d => `【${d.name}】\n${d.content || ''}`).join('\n\n');
            }
          }

          // 调用 dispatch API（与后管端完全一致的参数）
          // API 返回格式: { summary, detail, edits, usedModel }
          const dispatchRes = await fetchJson('/api/dispatch', {
            method: 'POST',
            body: {
              sceneId: scene.id,
              instructions: instructions,  // aiGuidance 已追加到 instructions 中
              docContent: docContent,
              outlineSegments: outlineSegments.length > 0 ? outlineSegments : undefined,
              systemPrompt: systemPrompt   // 使用 meta.prompt，不使用 aiGuidance
            }
          });

          // 检查是否真的使用了大模型（关键：检查 usedModel 字段）
          const usedLLMForDispatch = dispatchRes?.usedModel !== false;
          
          if (!usedLLMForDispatch) {
            // 未配置 API Key，大模型未使用
            status = 'fail';
            reason = '未配置 QWEN_API_KEY，无法执行大模型 Replay';
            llmFailReason = '未配置 QWEN_API_KEY';
          } else {
            // API 返回格式: { summary, detail, edits, usedModel }
            const detail = (dispatchRes?.detail || '').toString().trim();
            const edits = Array.isArray(dispatchRes?.edits) ? dispatchRes.edits : [];
            const resultSummary = dispatchRes?.summary || detail.substring(0, 100) || '已执行';
            
            status = 'done';
            reason = `🤖 大模型 Replay Done（${resultSummary}）`;
            replayMode = 'llm';
            
            // 如果有编辑操作，应用到大纲（与后管端完全一致的逻辑）
            if (edits.length > 0 || detail) {
              const sceneRes = await fetchJson(`/api/scene/${scene.id}`);
              const tpl = sceneRes?.scene?.customTemplate || sceneRes?.scene?.template;
              if (tpl?.sections) {
                // 构建 sectionId 映射（与后管端完全一致）
                const segmentIdList = outlineSegments.map(seg => seg.sectionId);
                const resolveEditId = (rawId) => {
                  if (!rawId) return null;
                  const str = String(rawId).trim();
                  // 支持 "ID=xxx" 格式
                  const idMatch = str.match(/ID\s*=\s*(.+)/i);
                  if (idMatch) return idMatch[1].trim();
                  // 支持 "片段N: xxx" 格式
                  const labelContentMatch = str.match(/片段\d+\s*[:：]\s*(.+)/);
                  if (labelContentMatch) return labelContentMatch[1].trim();
                  // 支持纯数字索引
                  if (/^\d+$/.test(str)) {
                    const idx = parseInt(str, 10) - 1;
                    if (idx >= 0 && idx < segmentIdList.length) return segmentIdList[idx];
                  }
                  // 支持 "片段N" 格式
                  const labelOnlyMatch = str.match(/片段(\d+)/);
                  if (labelOnlyMatch) {
                    const idx = parseInt(labelOnlyMatch[1], 10) - 1;
                    if (idx >= 0 && idx < segmentIdList.length) return segmentIdList[idx];
                  }
                  return str;
                };
                
                // 获取选中的 section IDs（与后管端一致）
                const selectedIds = Array.isArray(meta?.selectedSectionIds) ? meta.selectedSectionIds : [];
                const targetIds = selectedIds.length > 0 ? selectedIds : segmentIdList;
                
                const nextTemplate = {
                  ...tpl,
                  sections: tpl.sections.map(sec => {
                    // 查找对应的 edit（与后管端完全一致）
                    const found = edits.find(e => {
                      const resolvedId = resolveEditId(e.sectionId);
                      return resolvedId === sec.id || e.sectionId === sec.id;
                    });
                    
                    // 应用 edits（使用 edit.content，与后管端一致）
                    const patched = {
                      ...sec,
                      title: found?.field === 'title' && found.content ? found.content : sec.title,
                      summary: found?.field === 'summary' && found.content ? found.content : sec.summary
                    };
                    
                    // 如果有 detail 且是选中的 section，用 detail 覆盖 summary（与后管端一致）
                    if (detail && targetIds.includes(sec.id)) {
                      return { ...patched, summary: detail };
                    }
                    return patched;
                  })
                };
                await fetchJson(`/api/scene/${scene.id}/apply-template`, {
                  method: 'POST',
                  body: { template: nextTemplate }
                });
                console.log('[dispatch replay] 已应用编辑到大纲:', { editsCount: edits.length, detail: detail?.substring(0, 50), targetIds });
              }
            }
          }
        } catch (err) {
          status = 'fail';
          reason = err?.message || '执行指令失败';
        }

      } else if (metaType === 'add_outline_section' || metaType.startsWith('add_outline_section')) {
        // ========== 新增标题 Replay ==========
        try {
          const scene = await loadSharedScene();
          if (!scene?.id) throw new Error('scene 未初始化');

          const sceneRes = await fetchJson(`/api/scene/${scene.id}`);
          const tpl = sceneRes?.scene?.customTemplate || sceneRes?.scene?.template;
          if (!tpl?.sections) throw new Error('当前无大纲');

          // 获取参考标题（在其后插入）
          const afterSection = meta?.afterSection;
          const afterSectionTitle = afterSection?.title || '';
          
          // 根据标题名称找到插入位置
          let insertIdx = tpl.sections.length; // 默认插入末尾
          if (afterSectionTitle) {
            const foundIdx = tpl.sections.findIndex(s => s.title === afterSectionTitle || s.title?.includes(afterSectionTitle));
            if (foundIdx !== -1) {
              insertIdx = foundIdx + 1;
            }
          }

          // 创建新标题
          const newSection = {
            id: `sec_replay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            title: meta?.newSection?.title || '新标题',
            summary: meta?.newSection?.summary || '',
            hint: meta?.newSection?.hint || '',
            level: meta?.newSection?.level || 1
          };

          // 插入新标题
          const nextSections = [
            ...tpl.sections.slice(0, insertIdx),
            newSection,
            ...tpl.sections.slice(insertIdx)
          ];

          const nextTemplate = { ...tpl, sections: nextSections };
          await fetchJson(`/api/scene/${scene.id}/apply-template`, {
            method: 'POST',
            body: { template: nextTemplate }
          });

          status = 'done';
          reason = `📜 脚本 Replay Done（已在「${afterSectionTitle || '末尾'}」之后新增标题「${newSection.title}」）`;
          replayMode = 'script';
        } catch (err) {
          status = 'fail';
          reason = err?.message || '新增标题失败';
        }

      } else if (metaType === 'delete_outline_section' || metaType.startsWith('delete_outline_section')) {
        // ========== 删除标题 Replay ==========
        try {
          const scene = await loadSharedScene();
          if (!scene?.id) throw new Error('scene 未初始化');

          const sceneRes = await fetchJson(`/api/scene/${scene.id}`);
          const tpl = sceneRes?.scene?.customTemplate || sceneRes?.scene?.template;
          if (!tpl?.sections) throw new Error('当前无大纲');

          // 获取要删除的标题信息
          const targetSection = meta?.targetSection;
          const targetTitle = targetSection?.title || '';
          
          if (!targetTitle) {
            throw new Error('未记录要删除的标题名称');
          }

          // 根据标题名称找到目标标题
          const targetIdx = tpl.sections.findIndex(s => s.title === targetTitle || s.title?.includes(targetTitle));
          if (targetIdx === -1) {
            throw new Error(`未找到标题「${targetTitle}」`);
          }

          const baseLevel = tpl.sections[targetIdx].level || 1;
          const idsToRemove = [tpl.sections[targetIdx].id];

          // 找出下级标题（也需要删除）
          for (let i = targetIdx + 1; i < tpl.sections.length; i++) {
            const lvl = tpl.sections[i].level || 1;
            if (lvl <= baseLevel) break;
            idsToRemove.push(tpl.sections[i].id);
          }

          // 删除标题
          const nextSections = tpl.sections.filter(s => !idsToRemove.includes(s.id));
          const nextTemplate = { ...tpl, sections: nextSections };
          await fetchJson(`/api/scene/${scene.id}/apply-template`, {
            method: 'POST',
            body: { template: nextTemplate }
          });

          status = 'done';
          reason = `📜 脚本 Replay Done（已删除标题「${targetTitle}」，共${idsToRemove.length}条）`;
          replayMode = 'script';
        } catch (err) {
          status = 'fail';
          reason = err?.message || '删除标题失败';
        }

      } else if (metaType === 'copy_full_to_summary' || metaType.startsWith('copy_full_to_summary')) {
        // ========== 复制全文到摘要 Replay ==========
        try {
          const scene = await loadSharedScene();
          if (!scene?.id) throw new Error('scene 未初始化');

          // 1. 找到目标文档
          const docName = resolveDocName();
          let doc = resolveDoc(docName);
          
          // 如果没找到文档，尝试从 replayDir 加载
          if (!doc && replayDirPath) {
            try {
              const uploadRes = await fetchJson('/api/upload-from-dir', {
                method: 'POST',
                body: { dirPath: replayDirPath, fileName: docName }
              });
              if (uploadRes?.doc) {
                await syncDocs();
                doc = uploadRes.doc;
              }
            } catch (e) {
              console.warn('[Replay copy_full_to_summary] 从目录加载文档失败:', e);
            }
          }
          
          if (!doc) {
            throw new Error(docName ? `未找到文档：${docName}` : '未指定文档');
          }

          // 2. 获取当前大纲
          const sceneRes = await fetchJson(`/api/scene/${scene.id}`);
          const tpl = sceneRes?.scene?.customTemplate || sceneRes?.scene?.template;
          if (!tpl?.sections || tpl.sections.length === 0) {
            throw new Error('当前无大纲');
          }

          // 3. 找到目标标题
          const targetTitle = meta?.targetSectionTitle || meta?.targetSection?.title || '';
          let targetSection = null;
          
          if (meta?.sectionId) {
            targetSection = tpl.sections.find(s => s.id === meta.sectionId);
          }
          
          if (!targetSection && targetTitle) {
            // 按标题名称匹配
            targetSection = tpl.sections.find(s => s.title === targetTitle) ||
                           tpl.sections.find(s => s.title?.includes(targetTitle)) ||
                           tpl.sections.find(s => targetTitle.includes(s.title || ''));
          }
          
          if (!targetSection) {
            throw new Error(targetTitle ? `未找到标题「${targetTitle}」` : '未指定目标标题');
          }

          // 4. 获取文档内容
          const content = (doc.content || '').toString().trim();
          if (!content) {
            throw new Error(`文档「${doc.name}」内容为空`);
          }

          // 5. 更新大纲摘要
          const nextSections = tpl.sections.map(s => 
            s.id === targetSection.id ? { ...s, summary: content } : s
          );
          const nextTemplate = { ...tpl, sections: nextSections };
          
          await fetchJson(`/api/scene/${scene.id}/apply-template`, {
            method: 'POST',
            body: { template: nextTemplate }
          });

          status = 'done';
          reason = `📜 脚本 Replay Done（已将「${doc.name}」全文复制到「${targetSection.title}」）`;
          replayMode = 'script';
        } catch (err) {
          status = 'fail';
          reason = err?.message || '复制全文到摘要失败';
        }

      } else if (metaType === 'outline_link_doc' || metaType.startsWith('outline_link_doc')) {
        // ========== 关联文档 Replay ==========
        try {
          const scene = await loadSharedScene();
          if (!scene?.id) throw new Error('scene 未初始化');

          // 1. 找到目标文档
          const docName = resolveDocName();
          let doc = resolveDoc(docName);
          
          // 如果没找到文档，尝试从 replayDir 加载
          if (!doc && replayDirPath) {
            try {
              const uploadRes = await fetchJson('/api/upload-from-dir', {
                method: 'POST',
                body: { dirPath: replayDirPath, fileName: docName }
              });
              if (uploadRes?.doc) {
                await syncDocs();
                doc = uploadRes.doc;
              }
            } catch (e) {
              console.warn('[Replay outline_link_doc] 从目录加载文档失败:', e);
            }
          }
          
          if (!doc) {
            throw new Error(docName ? `未找到文档：${docName}` : '未指定文档');
          }

          // 2. 获取当前大纲
          const sceneRes = await fetchJson(`/api/scene/${scene.id}`);
          const tpl = sceneRes?.scene?.customTemplate || sceneRes?.scene?.template;
          if (!tpl?.sections || tpl.sections.length === 0) {
            throw new Error('当前无大纲');
          }

          // 3. 找到目标标题
          const targetTitle = meta?.targetSectionTitle || meta?.targetSection?.title || '';
          let targetSection = null;
          
          if (meta?.sectionId) {
            targetSection = tpl.sections.find(s => s.id === meta.sectionId);
          }
          
          if (!targetSection && targetTitle) {
            targetSection = tpl.sections.find(s => s.title === targetTitle) ||
                           tpl.sections.find(s => s.title?.includes(targetTitle)) ||
                           tpl.sections.find(s => targetTitle.includes(s.title || ''));
          }
          
          if (!targetSection) {
            throw new Error(targetTitle ? `未找到标题「${targetTitle}」` : '未指定目标标题');
          }

          // 4. 更新关联
          const currentLinks = sceneRes?.scene?.sectionDocLinks || {};
          const sectionLinks = currentLinks[targetSection.id] || [];
          
          if (!sectionLinks.includes(doc.id)) {
            const nextLinks = {
              ...currentLinks,
              [targetSection.id]: [...sectionLinks, doc.id]
            };
            
            await fetchJson(`/api/scene/${scene.id}`, {
              method: 'PATCH',
              body: { sectionDocLinks: nextLinks }
            });
          }

          status = 'done';
          reason = `📜 脚本 Replay Done（已将「${doc.name}」关联到「${targetSection.title}」）`;
          replayMode = 'script';
        } catch (err) {
          status = 'fail';
          reason = err?.message || '关联文档失败';
        }

      } else if (!metaType) {
        status = 'fail';
        reason = '未记录可执行的回放元信息';
      } else {
        status = 'fail';
        reason = `暂不支持执行动作：${metaType}`;
      }

      // ========== AI 智能回退机制 ==========
      // 如果脚本执行失败，尝试用 AI 理解沉淀意图并执行
      if (status === 'fail') {
        try {
          setReplayStatus(`${title} [${i + 1}/${sections.length}] AI 分析中...`);
          
          // 获取当前上下文
          const outlines = await fetchJson('/api/multi/outlines').catch(() => []);
          const currentScene = await loadSharedScene().catch(() => null);
          const currentTemplate = currentScene?.customTemplate || currentScene?.template;
          
          const aiContext = {
            docs: cachedDocs.map(d => ({ id: d.id, name: d.name })),
            outlineSectionsCount: currentTemplate?.sections?.length || 0,
            outlineHistoryCount: Array.isArray(outlines) ? outlines.length : 0,
            outlineHistory: Array.isArray(outlines) ? outlines.slice(0, 5).map(o => ({
              id: o.id,
              title: o.title || o.docName
            })) : []
          };
          
          const aiRes = await fetch('/api/ai/replay-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section, context: aiContext })
          });
          
          if (aiRes.ok) {
            const aiResult = await aiRes.json();
            
            if (aiResult.understood && !aiResult.fallbackToScript && aiResult.confidence >= 0.5) {
              console.log('AI Replay 分析结果:', aiResult);
              
              // 根据 AI 返回的 action 执行相应操作
              const aiAction = aiResult.action;
              const aiParams = aiResult.params || {};
              let aiStatus = 'done';
              let aiReason = aiResult.reason || '';
              
              try {
                if (aiAction === 'add_doc' || aiAction === 'upload_doc') {
                  await syncDocs();
                  let doc = null;
                  if (aiParams.docName) {
                    doc = cachedDocs.find(d => d.name === aiParams.docName) ||
                          cachedDocs.find(d => d.name.toLowerCase().includes(aiParams.docName.toLowerCase()));
                  }
                  if (!doc && aiParams.docId) {
                    doc = cachedDocs.find(d => d.id === aiParams.docId);
                  }
                  if (!doc && cachedDocs.length > 0) {
                    doc = cachedDocs[0];
                  }
                  if (doc) {
                    const scene = await loadSharedScene();
                    if (scene?.id) {
                      const docIds = Array.from(new Set([...(scene.docIds || []), doc.id]));
                      await fetchJson(`/api/scene/${scene.id}`, { method: 'PATCH', body: { docIds } });
                      aiReason = `AI 推断后关联文档：${doc.name}`;
                    }
                  } else {
                    aiStatus = 'fail';
                    aiReason = 'AI: 无可用文档';
                  }
                  
                } else if (aiAction === 'outline_extract') {
                  let doc = null;
                  if (aiParams.docName) {
                    doc = cachedDocs.find(d => d.name === aiParams.docName) ||
                          cachedDocs.find(d => d.name.toLowerCase().includes(aiParams.docName.toLowerCase()));
                  }
                  if (!doc && cachedDocs.length > 0) doc = cachedDocs[0];
                  
                  if (doc) {
                    const scene = await loadSharedScene();
                    if (scene?.id) {
                      const tplRes = await fetchJson('/api/template/auto', {
                        method: 'POST',
                        body: { text: doc.content || '' }
                      });
                      if (tplRes?.template) {
                        await fetchJson(`/api/scene/${scene.id}/apply-template`, {
                          method: 'POST',
                          body: { template: tplRes.template }
                        });
                        await fetchJson('/api/outline/cache', { method: 'POST', body: { template: tplRes.template } });
                        aiReason = `AI 推断后从 ${doc.name} 提取大纲`;
                      }
                    }
                  } else {
                    aiStatus = 'fail';
                    aiReason = 'AI: 无可用文档进行大纲提取';
                  }
                  
                } else if (aiAction === 'restore_history_outline' || aiAction === 'apply_outline') {
                  const outlineList = Array.isArray(outlines) ? outlines : [];
                  let target = null;
                  if (aiParams.outlineId) {
                    target = outlineList.find(o => o.id === aiParams.outlineId);
                  }
                  if (!target && aiParams.outlineTitle) {
                    target = outlineList.find(o => (o.title || o.docName || '').includes(aiParams.outlineTitle));
                  }
                  if (!target && outlineList.length > 0) {
                    target = outlineList[0];
                  }
                  
                  if (target?.template) {
                    const scene = await loadSharedScene();
                    if (scene?.id) {
                      await fetchJson(`/api/scene/${scene.id}/apply-template`, {
                        method: 'POST',
                        body: { template: target.template }
                      });
                      await fetchJson('/api/outline/cache', { method: 'POST', body: { template: target.template } });
                      aiReason = `AI 推断后应用大纲：${target.title || target.docName || '历史大纲'}`;
                    }
                  } else {
                    aiStatus = 'fail';
                    aiReason = 'AI: 无可用历史大纲';
                  }
                  
                } else if (aiAction === 'outline_clear') {
                  const scene = await loadSharedScene();
                  if (scene?.id) {
                    const emptyTemplate = { id: 'template_empty', name: '空模板', sections: [] };
                    await fetchJson(`/api/scene/${scene.id}/apply-template`, {
                      method: 'POST',
                      body: { template: emptyTemplate }
                    });
                    await fetchJson('/api/outline/cache', { method: 'POST', body: { template: emptyTemplate } });
                    aiReason = 'AI 推断后清除大纲';
                  }
                  
                } else if (aiAction === 'insert_to_summary' || aiAction === 'fill_summary') {
                  const scene = await loadSharedScene();
                  const tpl = scene?.customTemplate || scene?.template;
                  if (tpl?.sections?.length > 0) {
                    let targetIds = aiParams.targetSectionIds || [];
                    if (!targetIds.length && aiParams.targetSectionTitle) {
                      const matchedSection = tpl.sections.find(s => 
                        (s.title || '').includes(aiParams.targetSectionTitle)
                      );
                      if (matchedSection) targetIds = [matchedSection.id];
                    }
                    if (!targetIds.length && tpl.sections.length > 0) {
                      // 默认使用第一个章节
                      targetIds = [tpl.sections[0].id];
                    }
                    
                    if (targetIds.length > 0 && aiParams.content) {
                      const nextTemplate = {
                        ...tpl,
                        sections: tpl.sections.map(s => {
                          if (targetIds.includes(s.id)) {
                            return { ...s, summary: aiParams.content };
                          }
                          return s;
                        })
                      };
                      await fetchJson(`/api/scene/${scene.id}/apply-template`, {
                        method: 'POST',
                        body: { template: nextTemplate }
                      });
                      aiReason = `AI 推断后填入摘要`;
                    } else {
                      aiStatus = 'fail';
                      aiReason = 'AI: 缺少目标章节或内容';
                    }
                  } else {
                    aiStatus = 'fail';
                    aiReason = 'AI: 当前无大纲可用';
                  }
                  
                } else if (aiAction === 'dispatch') {
                  if (aiParams.instruction && cachedDocs.length > 0) {
                    const docContents = await Promise.all(
                      cachedDocs.slice(0, 3).map(async d => ({
                        name: d.name,
                        content: d.content || ''
                      }))
                    );
                    await fetchJson('/api/dispatch', {
                      method: 'POST',
                      body: { instruction: aiParams.instruction, documents: docContents }
                    });
                    aiReason = `AI 推断后执行指令`;
                  } else {
                    aiStatus = 'fail';
                    aiReason = 'AI: 缺少指令或文档';
                  }
                  
                } else {
                  aiStatus = 'fail';
                  aiReason = `AI: 未知操作类型 ${aiAction}`;
                }
                
              } catch (aiExecErr) {
                aiStatus = 'fail';
                aiReason = `AI 执行错误: ${aiExecErr.message}`;
              }
              
              // 更新状态为 AI 执行结果
              if (aiStatus === 'done') {
                status = 'done';
                reason = `🤖 ${aiReason}`;
              } else {
                reason = `${reason}\n🤖 AI 回退也失败: ${aiReason}`;
              }
            } else if (aiResult.usedModel) {
              reason = `${reason}\n🤖 AI 分析: ${aiResult.reason || '无法理解意图'}`;
            }
          }
        } catch (aiErr) {
          console.log('AI 回退执行失败', aiErr);
          reason = `${reason}\n🤖 AI 回退不可用`;
        }
      }

      // 判断最终状态
      // 如果大模型模式下脚本也失败，标记为 skipped（而非 fail）
      let finalReplayStatus = status;
      let finalReplayMode = 'script';
      
      // 构建详细的失败原因说明
      let detailedReason = reason;
      
      if (precipitationMode === 'llm' && llmScript && status === 'fail') {
        // 大模型Replay模式下，如果脚本Replay回退也失败，标记为 skipped
        finalReplayStatus = 'skipped';
        detailedReason = `🤖 大模型 Replay 失败：${llmFailReason || '未知原因'}\n📜 脚本 Replay 回退也失败：${reason}`;
        appendAssistantMessage(`❌ **步骤 ${i + 1}** 脚本 Replay 也失败\n📜 脚本失败原因：${reason}\n⏭️ 已跳过此步骤`);
      } else if (precipitationMode === 'llm' && !llmScript && status === 'fail') {
        // 脚本执行失败
        detailedReason = `📜 脚本 Replay 失败：${reason}`;
        appendAssistantMessage(`❌ **步骤 ${i + 1}** 执行失败\n📜 ${reason}`);
      } else if (status === 'done') {
        finalReplayStatus = 'script_done';
        // 脚本执行成功
        if (llmFailReason) {
          // 大模型失败后脚本成功
          detailedReason = `📜 脚本 Replay 成功：${reason}（大模型失败后回退）`;
          appendAssistantMessage(`✅ **步骤 ${i + 1}** 脚本 Replay 成功\n📜 ${reason}`);
        } else if (precipitationMode === 'llm') {
          // 直接脚本执行成功
          detailedReason = `📜 ${reason}`;
          appendAssistantMessage(`✅ **步骤 ${i + 1}** ${reason}`);
        } else {
          // 纯脚本模式
          detailedReason = `📜 ${reason}`;
        }
      } else if (status === 'fail') {
        // 纯脚本模式失败
        detailedReason = `📜 脚本 Replay 失败：${reason}`;
        appendAssistantMessage(`❌ **步骤 ${i + 1}** 脚本 Replay 失败\n📜 失败原因：${reason}`);
      }
      
      // 记录每步执行结果（用于最终统计）
      results.push({
        step: i + 1,
        action: actionTitle,
        status: finalReplayStatus === 'skipped' ? 'skipped' : status,
        reason: detailedReason,
        replayMode: finalReplayMode,
        replayStatus: finalReplayStatus,
        llmFailReason: llmFailReason || null,
        meta: {
          type: metaType,
          docName: resolveDocName(),
          inputText,
          summaryText: summaryText || metaSummary,
          llmAttempted: precipitationMode === 'llm' && !!llmScript,
          scriptFallback: precipitationMode === 'llm' && llmScript && status !== 'done'
        }
      });

      // 更新状态栏进度
      setReplayStatus(`${title} [${i + 1}/${sections.length}] ${actionTitle}`);
      await delay(100);
    }

    // 返回执行结果统计
    const doneCount = results.filter(r => r.status === 'done').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    
    // 统计执行模式
    const llmDoneCount = results.filter(r => r.replayStatus === 'llm_done').length;
    const scriptDoneCount = results.filter(r => r.replayStatus === 'script_done').length;
    
    // 确定整体执行模式
    const overallMode = llmDoneCount > scriptDoneCount ? 'llm' : 'script';
    
    return {
      total: sections.length,
      done: doneCount,
      fail: failCount,
      skipped: skippedCount,
      llmDone: llmDoneCount,
      scriptDone: scriptDoneCount,
      results,
      // 整体状态：
      // - 全部成功 = done
      // - 有成功有跳过 = partial_done（可接受）
      // - 全部跳过 = partial_done（大模型和脚本都不行）
      // - 有失败 = partial_done 或 fail
      overallStatus: doneCount === sections.length ? 'done' :
                     (doneCount > 0 || skippedCount > 0) ? 'partial_done' : 'fail',
      aiExecuted: llmDoneCount > 0,
      replayMode: overallMode
    };
  };


  const replayRecords = async (records, title) => {


    if (isReplaying) return;


    setIsReplaying(true);


    setReplayStatus(`准备复现: ${title}`);


    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


    try {


      for (const record of records) {


        const sections = Array.isArray(record.sections) ? record.sections : [];


        if (sections.length === 0) continue;


        await replaySections(sections, record.name || record.title || title);


      }


      setReplayStatus('复现完成');


    } catch (error) {


      console.error('Replay error', error);


      setReplayStatus('复现出错');


    } finally {


      await delay(1200);


      setIsReplaying(false);


      setReplayStatus('');


    }


  };


  const handleReplayRecord = async (record) => {


    await replayRecords([record], record.title || '沉淀记录');


  };


  // =====================================================
  // 应用端按钮点击处理
  // 应用端收集用户需求，使用大模型智能交互反馈执行结果
  // 1. 从配置目录自动加载文件到文档列表
  // 2. 获取沉淀集中的沉淀记录
  // 3. 执行 Replay 并收集详细结果
  // 4. 调用大模型生成智能反馈（如不可用则使用结构化消息）
  // =====================================================
  const handleAppButtonClick = async (btn) => {
    const groupIds = Array.isArray(btn.groupIds) ? btn.groupIds.filter(Boolean) : [];

    if (!groupIds.length) {
      appendAssistantMessage(`您好！"${btn.label}"目前还没有配置处理流程 😊\n\n请联系管理员在后台"应用端按钮配置"中关联相应的沉淀集，配置完成后即可使用。`);
      return;
    }

    appendAssistantMessage(`好的，收到您的"${btn.label}"请求！正在为您执行相关处理流程，请稍候... ⏳`);
    setIsReplaying(true);
    setReplayStatus(`正在执行: ${btn.label}`);

    // 收集执行结果详情
    const executionDetails = {
      buttonLabel: btn.label,
      groupNames: [],
      groupDetails: [], // 每个沉淀集的详细信息
      loadedDocs: [],
      successSteps: [],
      failedSteps: [],
      totalSteps: 0,
      completedSteps: 0
    };

    try {
      // 1. 首先调用服务端 API 加载配置目录中的文件
      let preloadedDocs = [];  // 保存预加载的文档，供后续 replaySections 使用
      try {
        const configRes = await fetch('/api/multi/replay/config');
        const configData = await configRes.json().catch(() => ({}));
        const dirPath = configData.dirPath;

        if (dirPath) {
          console.log('[Replay] 配置目录:', dirPath);
          const loadRes = await fetch('/api/multi/replay/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupIds, buttonLabel: btn.label })
          });

          if (loadRes.ok) {
            const loadResult = await loadRes.json();
            console.log('[Replay] 服务端加载结果:', loadResult);

            if (Array.isArray(loadResult.docsLoaded) && loadResult.docsLoaded.length > 0) {
              const loadedDocs = [];
              for (const docData of loadResult.docsLoaded) {
                try {
                  const createRes = await fetch('/api/docs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: docData.name, content: docData.content })
                  });
                  if (createRes.ok) {
                    const { doc, overwritten } = await createRes.json();
                    if (doc) {
                      loadedDocs.push(doc);
                      preloadedDocs.push(doc);  // 记录预加载的文档
                      executionDetails.loadedDocs.push(doc.name);
                      const actionText = overwritten ? '已覆盖' : '已加载';
                      executionDetails.successSteps.push({ type: '文档加载', name: `${actionText}：${doc.name}`, status: 'success' });
                      console.log(`[Replay] ${actionText}文档:`, doc.name, doc.id);
                    }
                  } else {
                    console.error('[Replay] 创建文档失败:', docData.name, await createRes.text());
                    executionDetails.failedSteps.push({ type: '文档加载', name: docData.name, status: 'fail', reason: '上传失败' });
                  }
                } catch (e) {
                  console.error('[Replay] 创建文档异常:', docData.name, e);
                  executionDetails.failedSteps.push({ type: '文档加载', name: docData.name, status: 'fail', reason: e.message });
                }
              }

              if (loadedDocs.length > 0) {
                // 更新文档列表：覆盖同名文档，添加新文档
                setDocs(prev => {
                  const docMap = new Map(prev.map(d => [d.id, d]));
                  loadedDocs.forEach(d => docMap.set(d.id, d));  // 覆盖或添加
                  return Array.from(docMap.values());
                });

                const scene = await loadSharedScene();
                if (scene?.id) {
                  const docIds = Array.from(new Set([...loadedDocs.map(d => d.id), ...(scene.docIds || [])]));
                  await fetchJson(`/api/scene/${scene.id}`, { method: 'PATCH', body: { docIds } });
                  console.log('[Replay] 已关联文档到场景:', docIds.length, '个');
                }
              }
            }
          } else {
            console.error('[Replay] 服务端加载失败:', loadRes.status, await loadRes.text());
          }
        } else {
          console.log('[Replay] 未配置目录路径，跳过自动加载文件');
        }
      } catch (e) {
        console.error('[Replay] 加载配置目录文件失败:', e);
      }
      
      // 显示预加载结果
      if (preloadedDocs.length > 0) {
        appendAssistantMessage(`📂 已从配置目录自动加载 ${preloadedDocs.length} 个文档：\n${preloadedDocs.map(d => `  • ${d.name}`).join('\n')}`);
      }

      // 2. 获取沉淀记录和沉淀集
      const recordsRes = await fetch('/api/multi/precipitation/records');
      const recordsData = await recordsRes.json().catch(() => []);
      // API 直接返回数组，或者返回 { records: [...] } 格式
      const allRecords = Array.isArray(recordsData) ? recordsData : 
                         (Array.isArray(recordsData?.records) ? recordsData.records : []);

      const groupsRes = await fetch('/api/multi/precipitation/groups');
      const groupsData = await groupsRes.json().catch(() => []);
      // API 直接返回数组，或者返回 { groups: [...] } 格式
      const allGroups = Array.isArray(groupsData) ? groupsData : 
                        (Array.isArray(groupsData?.groups) ? groupsData.groups : []);

      // 找到目标沉淀集和记录
      const targetGroups = allGroups.filter(g => groupIds.includes(g.id));
      
      if (targetGroups.length === 0) {
        appendAssistantMessage(`⚠️ 未找到关联的沉淀集，请在后台检查按钮配置`);
        return;
      }

      // =====================================================
      // 3. 按沉淀集逐个执行，实时报告进度
      // =====================================================
      
      // 统计总数
      let totalRecords = 0;
      let totalSections = 0;
      for (const group of targetGroups) {
        const groupRecordIds = group.depositIds || group.recordIds || [];
        const groupRecords = allRecords.filter(r => groupRecordIds.includes(r.id));
        totalRecords += groupRecords.length;
        totalSections += groupRecords.reduce((sum, r) => sum + (r.sections?.length || 0), 0);
      }
      executionDetails.totalSteps = totalSections;

      // 显示执行计划
      const groupNamesStr = targetGroups.map(g => `「${g.name || '未命名沉淀集'}」`).join('、');
      appendAssistantMessage(`📋 **开始执行「${btn.label}」**\n\n涉及沉淀集：${groupNamesStr}\n共 ${totalRecords} 个沉淀，${totalSections} 个步骤\n\n---`);

      // 按沉淀集逐个执行
      let groupIndex = 0;
      for (const group of targetGroups) {
        groupIndex++;
        const groupName = group.name || '未命名沉淀集';
        const groupRecordIds = group.depositIds || group.recordIds || [];
        const groupRecords = allRecords.filter(r => groupRecordIds.includes(r.id));
        
        executionDetails.groupNames.push(groupName);
        
        // 显示当前沉淀集
        appendAssistantMessage(`\n📂 **沉淀集 ${groupIndex}/${targetGroups.length}：「${groupName}」**（${groupRecords.length} 个沉淀）`);
        setReplayStatus(`执行沉淀集: ${groupName}`);
        
        // 记录沉淀集详情
        const groupDetail = {
          name: groupName,
          recordCount: groupRecords.length,
          records: []
        };
        
        // 逐个执行该沉淀集中的沉淀
        let recordIndex = 0;
        for (const record of groupRecords) {
          recordIndex++;
          const recordName = record.name || record.title || '未命名沉淀';
          const sections = Array.isArray(record.sections) ? record.sections : [];
          const precipitationMode = record.precipitationMode || 'llm';
          const structuredScript = record.structuredScript || '';
          const modeIcon = precipitationMode === 'llm' ? '🤖' : '📜';
          const modeName = precipitationMode === 'llm' ? '大模型Replay' : '脚本Replay';
          
          // 显示当前执行的沉淀
          setReplayStatus(`${groupName} > ${recordName} [${recordIndex}/${groupRecords.length}]`);
          
          // 执行所有 sections 并收集结果
          const replayResult = await replaySections(sections, recordName, { 
            precipitationMode, 
            structuredScript 
          });
          
          // 生成执行报告
          let recordReport = `\n  ${modeIcon} **沉淀 ${recordIndex}：「${recordName}」** (${modeName})\n`;
          
          // 记录执行结果
          const recordDetail = {
            title: recordName,
            sectionCount: sections.length,
            mode: precipitationMode,
            results: []
          };
          
          if (replayResult) {
            executionDetails.completedSteps += replayResult.done;
            const executionMode = replayResult.replayMode || 'script';
            
            // 统计结果
            const doneCount = replayResult.results.filter(r => r.status === 'done').length;
            const failCount = replayResult.results.filter(r => r.status === 'fail').length;
            const skipCount = replayResult.results.filter(r => r.status === 'skipped').length;
            
            // 生成状态摘要
            if (failCount === 0 && skipCount === 0) {
              recordReport += `     ✅ 全部完成（${doneCount}/${sections.length} 步骤）\n`;
            } else if (doneCount > 0) {
              recordReport += `     ⚠️ 部分完成（✅${doneCount} ❌${failCount} ⏭️${skipCount}）\n`;
            } else {
              recordReport += `     ❌ 执行失败（${failCount + skipCount}/${sections.length} 步骤失败）\n`;
            }
            
            // 记录成功的步骤
            replayResult.results.filter(r => r.status === 'done').forEach(r => {
              executionDetails.successSteps.push({
                type: r.action,
                record: recordName,
                group: groupName,
                status: 'success',
                detail: r.reason,
                replayMode: r.replayMode || executionMode,
                replayStatus: r.replayStatus || (r.replayMode === 'llm' ? 'llm_done' : 'script_done')
              });
              recordDetail.results.push({ action: r.action, status: 'done', reason: r.reason });
            });
            
            // 记录失败或跳过的步骤，并添加到报告
            replayResult.results.filter(r => r.status === 'fail' || r.status === 'skipped').forEach(r => {
              const statusIcon = r.status === 'skipped' ? '⏭️' : '❌';
              recordReport += `     ${statusIcon} ${r.action}: ${r.reason}\n`;
              executionDetails.failedSteps.push({
                type: r.action,
                record: recordName,
                group: groupName,
                status: r.status === 'skipped' ? 'skipped' : (precipitationMode === 'llm' ? 'partial_fail' : 'fail'),
                reason: r.reason,
                replayMode: r.replayMode || executionMode,
                replayStatus: r.replayStatus || r.status
              });
              recordDetail.results.push({ action: r.action, status: r.status, reason: r.reason });
            });
          } else {
            // 如果没有返回结果
            recordReport += `     ✅ 已执行（${sections.length} 步骤）\n`;
            executionDetails.completedSteps += sections.length;
            sections.forEach(s => {
              const meta = extractReplayMeta(s.content || '') || {};
              executionDetails.successSteps.push({
                type: s.action || meta.type || '操作',
                record: recordName,
                group: groupName,
                status: 'success',
                replayMode: 'script',
                replayStatus: 'script_done'
              });
              recordDetail.results.push({ action: s.action, status: 'done' });
            });
          }
          
          groupDetail.records.push(recordDetail);
          
          // 输出单个沉淀的执行报告
          appendAssistantMessage(recordReport);
        }
        
        executionDetails.groupDetails.push(groupDetail);
      }

      // =====================================================
      // 4. 生成最终汇总报告
      // =====================================================
      const summaryReport = generateExecutionSummary(executionDetails, btn.label);
      appendAssistantMessage(summaryReport);

      // 刷新文档列表
      try {
        const docsRes = await fetch('/api/docs');
        if (docsRes.ok) {
          const data = await docsRes.json();
          if (Array.isArray(data?.docs)) setDocs(data.docs);
        }
      } catch (e) {
        console.error('刷新文档列表失败', e);
      }

      // 同步大纲缓存
      try {
        const scene = await loadSharedScene();
        if (scene?.customTemplate || scene?.template) {
          await fetch('/api/outline/cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ template: scene.customTemplate || scene.template })
          });
        }
      } catch (e) {
        console.error('同步大纲缓存失败', e);
      }

    } catch (error) {
      console.error('Replay 执行失败:', error);
      appendAssistantMessage(`\n❌ **执行出错**\n\n「${btn.label}」执行过程中遇到问题：${error.message || '未知错误'}\n\n💡 建议您稍后重试，或联系管理员检查系统配置。`);
    } finally {
      setIsReplaying(false);
      setReplayStatus('');
    }
  };

  // 生成执行汇总报告
  const generateExecutionSummary = (details, buttonLabel) => {
    const { groupNames, groupDetails, loadedDocs, successSteps, failedSteps, totalSteps, completedSteps } = details;
    
    const lines = [];
    lines.push('\n---');
    lines.push(`\n📊 **「${buttonLabel}」执行汇总**\n`);
    
    // 总体统计
    const successCount = successSteps.length;
    const failCount = failedSteps.length;
    const skipCount = failedSteps.filter(f => f.status === 'skipped').length;
    const realFailCount = failCount - skipCount;
    
    // 状态判断
    let statusIcon, statusText;
    if (failCount === 0) {
      statusIcon = '✅';
      statusText = '全部完成';
    } else if (successCount > 0) {
      statusIcon = '⚠️';
      statusText = '部分完成';
    } else {
      statusIcon = '❌';
      statusText = '执行失败';
    }
    
    lines.push(`**执行状态：${statusIcon} ${statusText}**\n`);
    
    // 统计数据
    lines.push(`📁 沉淀集：${groupNames.length} 个（${groupNames.join('、')}）`);
    lines.push(`📄 加载文档：${loadedDocs.length} 个`);
    lines.push(`🔢 总步骤：${totalSteps} 步`);
    lines.push(`   - ✅ 成功：${successCount} 步`);
    if (realFailCount > 0) lines.push(`   - ❌ 失败：${realFailCount} 步`);
    if (skipCount > 0) lines.push(`   - ⏭️ 跳过：${skipCount} 步`);
    
    // 按沉淀集统计
    if (groupDetails.length > 0) {
      lines.push('\n**各沉淀集执行情况：**');
      groupDetails.forEach((g, i) => {
        const gSuccess = g.records.reduce((sum, r) => 
          sum + r.results.filter(res => res.status === 'done').length, 0);
        const gTotal = g.records.reduce((sum, r) => sum + r.results.length, 0);
        const gIcon = gSuccess === gTotal ? '✅' : (gSuccess > 0 ? '⚠️' : '❌');
        lines.push(`  ${i + 1}. 「${g.name}」：${gIcon} ${gSuccess}/${gTotal} 步`);
      });
    }
    
    // 失败项建议
    if (failCount > 0) {
      lines.push('\n**💡 建议：**');
      const failTypes = [...new Set(failedSteps.map(f => f.type))];
      if (failedSteps.some(f => f.reason?.includes('未找到文件'))) {
        lines.push('  - 部分文件未找到，请确认已在来源面板上传相关文档');
      }
      if (failedSteps.some(f => f.reason?.includes('大模型') || f.replayMode === 'llm')) {
        lines.push('  - 大模型执行失败的步骤可尝试切换为脚本Replay模式');
      }
      lines.push('  - 您可以在后台"沉淀配置"中查看详细设置');
    }
    
    // 结束语
    if (failCount === 0) {
      lines.push('\n还有其他需要处理的吗？ 😊');
    } else if (successCount > 0) {
      lines.push('\n如需帮助，请告诉我具体问题 🙋');
    }
    
    return lines.join('\n');
  };

  // 生成 AI 智能反馈
  const generateAIFeedback = async (details) => {
    const { buttonLabel, groupNames, groupDetails, loadedDocs, successSteps, failedSteps, totalSteps, completedSteps, error } = details;
    
    // 构建执行结果摘要
    const summary = {
      task: buttonLabel,
      groups: groupNames.join('、') || '无',
      docsLoaded: loadedDocs.length,
      totalSteps,
      completed: completedSteps,
      failed: failedSteps.length,
      success: successSteps.length,
      hasError: !!error
    };

    // 尝试调用大模型生成智能反馈
    try {
      const prompt = `你是一个专业的文档处理智能助手，正在与用户进行对话式交互。用户刚刚点击了"${buttonLabel}"按钮，系统已执行完相关的自动化处理流程。

【执行结果】
- 任务名称：${buttonLabel}
- 关联沉淀集：${summary.groups}
- 加载文档：${summary.docsLoaded} 个
- 执行步骤：共 ${summary.totalSteps} 步，成功 ${summary.completed} 步${summary.failed > 0 ? `，失败 ${summary.failed} 步` : ''}
${error ? `- 系统错误：${error}` : ''}

${groupDetails.length > 0 ? `【沉淀集详情】\n${groupDetails.map(g => `「${g.name}」包含以下处理流程：\n${g.records.map(r => `  - ${r.title}（${r.sectionCount}个操作步骤）`).join('\n')}`).join('\n\n')}` : ''}

${failedSteps.length > 0 ? `【失败项详情】\n${failedSteps.map(f => `- ${f.type}${f.record ? `（来自"${f.record}"）` : ''}：${f.reason}`).join('\n')}` : ''}

${successSteps.length > 0 ? `【成功执行的操作】\n${[...new Set(successSteps.map(s => s.type))].map(type => `- ${type}`).join('\n')}` : ''}

请以对话的方式向用户反馈执行结果，要求：
1. 开头用一句话总结执行情况（成功/部分成功/失败）
2. 清晰说明已完成了哪些具体工作
3. 如有失败项，用通俗易懂的语言解释原因，并给出下一步建议
4. 如全部成功，询问用户是否还有其他需求
5. 语气要像一个专业但友善的助手，不要太机械
6. 适当使用emoji增加亲和力，但不要过度

直接输出反馈内容，不要用markdown代码块包裹。`;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 600
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.content) {
          return data.content;
        }
      }
    } catch (e) {
      console.log('AI 反馈生成失败，使用结构化消息', e);
    }

    // 回退到结构化消息
    return generateStructuredFeedback(details);
  };

  // 生成结构化反馈（无 AI 时的回退方案）
  const generateStructuredFeedback = (details) => {
    const { buttonLabel, groupNames, groupDetails, loadedDocs, successSteps, failedSteps, completedSteps, error } = details;
    const lines = [];
    
    // 根据执行结果选择不同的开场白
    if (error) {
      lines.push(`抱歉，在执行"${buttonLabel}"时遇到了一些问题 😔`);
      lines.push('');
      lines.push(`错误信息：${error}`);
      lines.push('');
      lines.push('建议您稍后重试，或联系管理员检查系统配置。');
    } else if (failedSteps.length === 0 && (completedSteps > 0 || loadedDocs.length > 0)) {
      lines.push(`好的！"${buttonLabel}"已经全部完成 🎉`);
    } else if (failedSteps.length > 0 && completedSteps > 0) {
      lines.push(`"${buttonLabel}"已部分完成，有 ${failedSteps.length} 个步骤需要您关注 ⚠️`);
    } else if (failedSteps.length > 0) {
      lines.push(`"${buttonLabel}"执行遇到问题，我来帮您分析一下 🔍`);
    } else if (groupNames.length === 0 || groupNames.join('') === '') {
      lines.push(`"${buttonLabel}"目前还没有配置处理流程`);
      lines.push('');
      lines.push('💡 请联系管理员在后台"应用端按钮配置"中关联相应的沉淀集。');
      return lines.join('\n');
    } else {
      lines.push(`"${buttonLabel}"执行完毕 ✓`);
    }
    
    // 显示涉及的沉淀集
    if (groupNames.length > 0 && groupNames.join('') !== '') {
      lines.push('');
      lines.push(`📋 本次执行涉及沉淀集：${groupNames.join('、')}`);
    }
    
    // 显示沉淀集详情（更友好的格式）
    if (groupDetails.length > 0 && groupDetails.some(g => g.records.length > 0)) {
      lines.push('');
      lines.push('📂 执行的处理流程：');
      groupDetails.forEach(g => {
        if (g.records.length > 0) {
          lines.push(`  「${g.name}」`);
          g.records.forEach(r => {
            const stepText = r.sectionCount > 1 ? `${r.sectionCount}个步骤` : '1个步骤';
            lines.push(`    → ${r.title}（${stepText}）`);
          });
        }
      });
    }
    
    // 成功项（区分执行模式）
    if (successSteps.length > 0) {
      lines.push('');
      lines.push('✅ 已完成的操作：');
      const grouped = {};
      successSteps.forEach(s => {
        const key = s.type || '操作';
        const mode = s.replayStatus === 'llm_done' ? '🤖' : '📜';  // 大模型Replay vs 脚本Replay
        const groupKey = `${key}|${mode}`;
        if (!grouped[groupKey]) grouped[groupKey] = { type: key, mode, count: 0, modeLabel: s.replayStatus === 'llm_done' ? '大模型Replay' : '脚本Replay' };
        grouped[groupKey].count++;
      });
      Object.values(grouped).forEach(({ type, mode, count, modeLabel }) => {
        const countText = count > 1 ? ` × ${count}项` : '';
        lines.push(`  ${mode} ${type}${countText} [${modeLabel}]`);
      });
    }
    
    // 失败项（详细说明，区分执行模式）
    if (failedSteps.length > 0) {
      lines.push('');
      lines.push('❌ 需要关注的问题：');
      failedSteps.forEach(f => {
        const from = f.record ? `（来自"${f.record}"）` : '';
        const modeIcon = f.replayMode === 'llm' ? '🤖' : '📜';
        const statusText = f.status === 'skipped' ? '已跳过' : '失败';
        lines.push(`  ${modeIcon} ${f.type}${from} - ${statusText}`);
        lines.push(`    原因：${f.reason}`);
        // 如果大模型Replay执行失败，提示可以尝试脚本Replay
        if (f.replayMode === 'llm' && f.status !== 'skipped') {
          lines.push(`    💡 提示：可在后台将此沉淀切换为"📜 脚本Replay"模式重试`);
        }
      });
      lines.push('');
      lines.push('💡 建议：');
      // 根据失败原因给出具体建议
      const hasDocError = failedSteps.some(f => f.reason?.includes('文档') || f.reason?.includes('文件'));
      const hasOutlineError = failedSteps.some(f => f.reason?.includes('大纲'));
      const hasLLMFail = failedSteps.some(f => f.replayMode === 'llm' && f.status !== 'skipped');
      if (hasDocError) {
        lines.push('  - 请检查文档是否已正确上传');
      }
      if (hasOutlineError) {
        lines.push('  - 请检查历史大纲是否存在');
      }
      if (hasLLMFail) {
        lines.push('  - 🤖 大模型Replay失败的步骤可尝试切换为📜 脚本Replay模式重试');
      }
      lines.push('  - 您也可以在后台"沉淀配置"中查看详细设置');
    }
    
    // 结尾
    if (!error && failedSteps.length === 0) {
      lines.push('');
      if (loadedDocs.length > 0) {
        lines.push(`📄 已加载 ${loadedDocs.length} 个文档到来源列表。`);
        lines.push('');
      }
      lines.push('还有什么我可以帮您的吗？');
    }
    
    return lines.join('\n');
  };


  const [isEditingLayout, setIsEditingLayout] = useState(false);


  const [showHiddenSidebar, setShowHiddenSidebar] = useState(false);


  const [layoutSize, setLayoutSize] = useState({ width: 1680, height: 1050 });


  // 标题配置


  const [headerTitles, setHeaderTitles] = useState(() => {


    try {


      const saved = localStorage.getItem('multidoc_header_titles');


      if (saved) return JSON.parse(saved);


    } catch (e) {}


    return {


      title: { text: '多文档处理工作台', style: { fontSize: '24px', fontWeight: 400, color: '#202124', textAlign: 'left' }, position: { left: 0, top: 0 }, width: 300, height: 40 },


      eyebrow: { text: 'KNOWLEDGE STUDIO', style: { fontSize: '11px', letterSpacing: '1px', color: '#5f6368', textTransform: 'uppercase', textAlign: 'left' }, position: { left: 0, top: 0 }, width: 200, height: 30 }


    };


  });


  const [draggingHeaderTitle, setDraggingHeaderTitle] = useState(null);


  const [resizingHeaderTitle, setResizingHeaderTitle] = useState(null);


  const [editingHeaderTitle, setEditingHeaderTitle] = useState(null);


  // 自动保存标题


  useEffect(() => {


    if (headerTitles) {


      localStorage.setItem('multidoc_header_titles', JSON.stringify(headerTitles));


    }


  }, [headerTitles]);


  useEffect(() => {


    if (isEditingLayout) {


      setShowHiddenSidebar(true);


    } else {


      setShowHiddenSidebar(false);


    }


  }, [isEditingLayout]);


  const [panelPositions, setPanelPositions] = useState(DEFAULT_PANEL_POSITIONS);


  const [panelTitles, setPanelTitles] = useState({


    [PANEL_IDS.SOURCES]: '来源',


    [PANEL_IDS.CHAT]: '对话',


    [PANEL_IDS.STUDIO]: 'Studio'


  });


  const [panelVisibility, setPanelVisibility] = useState(DEFAULT_PANEL_VISIBILITY);


  const [buttonPositions, setButtonPositions] = useState({}); // { panelId: [buttonConfig] }


  const [editingButton, setEditingButton] = useState(null); // { panelId, buttonId, button }


  // 备份用于取消


  const [originalConfig, setOriginalConfig] = useState(null); // Includes buttons and panels


  const normalizePanelVisibility = (raw) => {


    const base = { ...DEFAULT_PANEL_VISIBILITY };


    if (raw && typeof raw === 'object') {


      Object.keys(base).forEach((key) => {


        base[key] = raw[key] !== false;


      });


    }


    return base;


  };


  const normalizePanelPositions = (raw) => {
    const next = { ...DEFAULT_PANEL_POSITIONS };
    if (!raw || typeof raw !== 'object') return next;

    const applyPosition = (targetKey, pos) => {
      if (!pos || typeof pos !== 'object') return false;
      const left = Number(pos.left);
      const top = Number(pos.top);
      const width = Number(pos.width);
      const height = Number(pos.height);
      if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height)) return false;
      if (width <= 0 || height <= 0) return false;
      next[targetKey] = { left, top, width, height };
      return true;
    };

    // 优先使用标准键名 (sources-panel, chat-panel, studio-panel)
    Object.values(PANEL_IDS).forEach((panelKey) => {
      if (raw[panelKey]) {
        applyPosition(panelKey, raw[panelKey]);
      }
    });

    // 如果标准键名没有数据，尝试使用旧版键名
    Object.entries(LEGACY_PANEL_MAP).forEach(([panelKey, legacyNames]) => {
      // panelKey = 'sources-panel', legacyNames = ['来源', '来源列表', '资源']
      if (next[panelKey] && next[panelKey] !== DEFAULT_PANEL_POSITIONS[panelKey]) {
        // 已经从标准键名加载了，跳过旧版
        return;
      }
      // 尝试从旧版键名加载
      if (Array.isArray(legacyNames)) {
        for (const legacyKey of legacyNames) {
          if (raw[legacyKey] && applyPosition(panelKey, raw[legacyKey])) {
            break; // 找到一个就停止
          }
        }
      }
    });

    return next;
  };


  const hidePanel = (panelId) => {


    setPanelVisibility((prev) => ({ ...prev, [panelId]: false }));


  };


  const showPanel = (panelId) => {


    setPanelVisibility((prev) => ({ ...prev, [panelId]: true }));


  };


  // --- 按钮配置 ---


  useEffect(() => {


    // 加载按钮配置


    fetch('/api/multi/buttons').


    then((res) => res.ok ? res.json() : {}).


    then((data) => setButtonPositions(data)).


    catch((err) => console.error('Failed to load buttons:', err));


    fetch('/api/multi/app-buttons').


    then((res) => res.ok ? res.json() : null).


    then((data) => {


      const normalized = normalizeAppButtons(data);


      if (normalized.length) setAppButtons(normalized);


    }).


    catch((err) => console.error('Failed to load app buttons:', err));


    // 优先从 localStorage 加载布局配置（本地优先）
    let hasLocalConfig = false;
    try {
      const storedLayout = localStorage.getItem('multidoc_layout_config');
      if (storedLayout) {
        const parsed = JSON.parse(storedLayout);
        console.log('[MultiDoc] Loaded layout from localStorage:', parsed);
        if (parsed.layoutSize) setLayoutSize(parsed.layoutSize);
        if (parsed.panelPositions) {
          setPanelPositions(normalizePanelPositions(parsed.panelPositions));
          hasLocalConfig = true;
        }
        if (parsed.panelTitles) setPanelTitles(parsed.panelTitles);
        if (parsed.panelVisibility) setPanelVisibility(normalizePanelVisibility(parsed.panelVisibility));
        if (parsed.headerTitles) setHeaderTitles(prev => ({ ...prev, ...parsed.headerTitles }));
      }
    } catch (e) {
      console.error('[MultiDoc] Failed to load layout from localStorage:', e);
    }

    // 只有当 localStorage 没有配置时，才从服务端加载
    if (!hasLocalConfig) {
      fetch('/api/multi/layout').
        then((res) => res.ok ? res.json() : null).
        then((data) => {
          console.log('[MultiDoc] Loaded layout from server (fallback):', data);
          if (!data) {
            console.log('[MultiDoc] No layout data from server, using defaults');
            return;
          }
          if (data.layoutSize) setLayoutSize(data.layoutSize);
          if (data.panelPositions) {
            console.log('[MultiDoc] Applying panel positions from server:', data.panelPositions);
            setPanelPositions(normalizePanelPositions(data.panelPositions));
            // 同步到 localStorage
            localStorage.setItem('multidoc_layout_config', JSON.stringify(data));
          } else if (data['doc-classify']) {
            setPanelPositions(normalizePanelPositions(data));
          }
          if (data.panelTitles) setPanelTitles(data.panelTitles);
          if (data.panelVisibility) setPanelVisibility(normalizePanelVisibility(data.panelVisibility));
          if (data.headerTitles) setHeaderTitles(prev => ({ ...prev, ...data.headerTitles }));
        }).
        catch((err) => console.error('[MultiDoc] Failed to load layout from server:', err));
    } else {
      console.log('[MultiDoc] Using localStorage config, skipping server fetch');
    }


    fetch('/api/multi/panels').


    then((res) => res.ok ? res.json() : null).


    then((data) => {


      if (data) setPanelVisibility(normalizePanelVisibility(data));


    }).


    catch((err) => console.error('Failed to load panel visibility:', err));


  }, []);


  // --- 编辑逻辑处理 ---


  // 保存配置


  const saveConfiguration = async () => {


    try {


      // 保存按钮


      await fetch('/api/multi/buttons', {


        method: 'POST',


        headers: { 'Content-Type': 'application/json' },


        body: JSON.stringify(buttonPositions)


      });


      // 保存布局


      const layoutConfig = {


        layoutSize,


        panelPositions,


        panelTitles,


        panelVisibility,


        headerTitles


      };


      localStorage.setItem('multidoc_layout_config', JSON.stringify(layoutConfig));
      localStorage.setItem('multidoc_header_titles', JSON.stringify(headerTitles));


      const layoutRes = await fetch('/api/multi/layout', {


        method: 'POST',


        headers: { 'Content-Type': 'application/json' },


        body: JSON.stringify(layoutConfig)


      });


      if (!layoutRes.ok) {
        console.error('[MultiDoc] Failed to save layout to server');
      } else {
        console.log('[MultiDoc] Layout saved to server successfully');
      }


      const panelsRes = await fetch('/api/multi/panels', {


        method: 'POST',


        headers: { 'Content-Type': 'application/json' },


        body: JSON.stringify(panelVisibility)


      });


      if (!panelsRes.ok) {
        console.error('[MultiDoc] Failed to save panels to server');
      }

      console.log('[MultiDoc] Configuration saved');


    } catch (err) {


      console.error('Failed to save configuration:', err);


      alert('\u4fdd\u5b58\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u6216\u670d\u52a1\u7aef');


    }


  };


  // 切换编辑模式


  const handleToggleEdit = () => {


    if (!isEditingLayout) {


      setOriginalConfig({


        buttons: JSON.parse(JSON.stringify(buttonPositions)),


        panels: JSON.parse(JSON.stringify(panelPositions)),


        titles: JSON.parse(JSON.stringify(panelTitles)),


        visibility: JSON.parse(JSON.stringify(panelVisibility)),


        size: { ...layoutSize }


      });


      setIsEditingLayout(true);


    } else {


      handleSaveEdit();


    }


  };


  const handleSaveEdit = async () => {


    await saveConfiguration();


    setIsEditingLayout(false);


    setEditingButton(null);


    setOriginalConfig(null);


  };


  const handleCancelEdit = () => {


    if (originalConfig) {


      setButtonPositions(originalConfig.buttons);


      setPanelPositions(originalConfig.panels);


      setPanelTitles(originalConfig.titles);


      if (originalConfig.visibility) {


        setPanelVisibility(normalizePanelVisibility(originalConfig.visibility));


      }


      setLayoutSize(originalConfig.size);


    }


    setIsEditingLayout(false);


    setEditingButton(null);


    setOriginalConfig(null);


  };


  const handleResetLayout = async () => {


    if (confirm('\u786e\u5b9a\u8981\u91cd\u7f6e\u5f53\u524d\u7f16\u8f91\u7684\u66f4\u6539\u5417\uff1f\u8fd9\u5c06\u6062\u590d\u5230\u4e0a\u6b21\u4fdd\u5b58\u7684\u72b6\u6001\u3002\u5982\u679c\u4ece\u672a\u4fdd\u5b58\u8fc7\uff0c\u5c06\u6062\u590d\u9ed8\u8ba4\u8bbe\u7f6e\u3002')) {


      try {


        // 优先恢复已保存配置


        const savedConfigStr = localStorage.getItem('multidoc_layout_config');


        const savedHeaderTitlesStr = localStorage.getItem('multidoc_header_titles');


        if (savedConfigStr) {


          const savedConfig = JSON.parse(savedConfigStr);


          if (savedConfig.layoutSize) setLayoutSize(savedConfig.layoutSize);


          if (savedConfig.panelPositions) setPanelPositions(normalizePanelPositions(savedConfig.panelPositions));


          if (savedConfig.panelTitles) setPanelTitles(savedConfig.panelTitles);


          if (savedConfig.panelVisibility) {


            setPanelVisibility(normalizePanelVisibility(savedConfig.panelVisibility));


          }


          // 按钮位置通常存储在后端，这里重新获取


          const res = await fetch('/api/multi/buttons');


          if (res.ok) {


            const buttons = await res.json();


            setButtonPositions(buttons);


          }


          // headerTitles 优先从 savedConfig 获取（服务端保存），其次从独立存储获取
          if (savedConfig.headerTitles) {
            setHeaderTitles(prev => ({ ...prev, ...savedConfig.headerTitles }));
          } else if (savedHeaderTitlesStr) {
            setHeaderTitles(JSON.parse(savedHeaderTitlesStr));
          }


        } else {


          // 使用默认配置 (Factory Default)


          const res = await fetch('/api/multi/buttons/reset', { method: 'POST' });


          if (res.ok) {


            const defaultButtons = await res.json();


            setButtonPositions(defaultButtons);


          }


          localStorage.removeItem('multidoc_layout_config');


          setPanelPositions(DEFAULT_PANEL_POSITIONS);


          setPanelTitles({


            [PANEL_IDS.SOURCES]: '来源',


            [PANEL_IDS.CHAT]: '对话',


            [PANEL_IDS.STUDIO]: 'Studio'


          });


          setPanelVisibility(DEFAULT_PANEL_VISIBILITY);


          setHeaderTitles({


            title: { text: '多文档处理工作台', style: { fontSize: '24px', fontWeight: 400, color: '#202124', textAlign: 'left' }, position: { left: 0, top: 0 }, width: 300, height: 40 },


            eyebrow: { text: 'KNOWLEDGE STUDIO', style: { fontSize: '11px', letterSpacing: '1px', color: '#5f6368', textTransform: 'uppercase', textAlign: 'left' }, position: { left: 0, top: 0 }, width: 200, height: 30 }


          });


          localStorage.removeItem('multidoc_header_titles');


          setLayoutSize({ width: 1680, height: 1050 });


        }


        setEditingButton(null);


        // 清理编辑态


        // 关闭编辑模式


        setIsEditingLayout(false);


        setOriginalConfig(null);


      } catch (err) {


        console.error('Reset failed', err);


        alert('重置失败');


      }


    }


  };


  // 标题拖拽


  const handleHeaderTitleMouseDown = (e, titleKey) => {


    if (!isEditingLayout) return;


    e.preventDefault();e.stopPropagation();


    const startX = e.clientX;const startY = e.clientY;


    const startPos = headerTitles[titleKey].position || { left: 0, top: 0 };


    setDraggingHeaderTitle({ titleKey, startX, startY, startPos });


  };


  useEffect(() => {


    if (!draggingHeaderTitle) return;


    const handleMouseMove = (e) => {


      const deltaX = e.clientX - draggingHeaderTitle.startX;


      const deltaY = e.clientY - draggingHeaderTitle.startY;


      setHeaderTitles((prev) => ({


        ...prev,


        [draggingHeaderTitle.titleKey]: { ...prev[draggingHeaderTitle.titleKey], position: { left: draggingHeaderTitle.startPos.left + deltaX, top: draggingHeaderTitle.startPos.top + deltaY } }


      }));


    };


    const handleMouseUp = () => setDraggingHeaderTitle(null);


    document.addEventListener('mousemove', handleMouseMove);


    document.addEventListener('mouseup', handleMouseUp);


    return () => {document.removeEventListener('mousemove', handleMouseMove);document.removeEventListener('mouseup', handleMouseUp);};


  }, [draggingHeaderTitle]);


  // 标题缩放


  const handleHeaderTitleResizeMouseDown = (e, titleKey, direction) => {


    if (!isEditingLayout) return;


    e.preventDefault();e.stopPropagation();


    const startX = e.clientX;const startY = e.clientY;


    const startSize = { width: headerTitles[titleKey].width || 200, height: headerTitles[titleKey].height || 30 };


    setResizingHeaderTitle({ titleKey, startX, startY, startSize, direction });


  };


  useEffect(() => {


    if (!resizingHeaderTitle) return;


    const handleMouseMove = (e) => {


      const deltaX = e.clientX - resizingHeaderTitle.startX;


      const deltaY = e.clientY - resizingHeaderTitle.startY;


      setHeaderTitles((prev) => {


        const newWidth = Math.max(50, resizingHeaderTitle.startSize.width + deltaX);


        const newHeight = Math.max(20, resizingHeaderTitle.startSize.height + deltaY);


        return { ...prev, [resizingHeaderTitle.titleKey]: { ...prev[resizingHeaderTitle.titleKey], width: newWidth, height: newHeight } };


      });


    };


    const handleMouseUp = () => setResizingHeaderTitle(null);


    document.addEventListener('mousemove', handleMouseMove);


    document.addEventListener('mouseup', handleMouseUp);


    return () => {document.removeEventListener('mousemove', handleMouseMove);document.removeEventListener('mouseup', handleMouseUp);};


  }, [resizingHeaderTitle]);


  // 鎸夐挳鎷栨嫿涓庣缉鏀?


  const handleButtonMouseDown = (e, panelId, buttonId, type) => {


    if (!isEditingLayout) return;


    e.stopPropagation();


    const btnList = buttonPositions[panelId] || [];


    const btnIndex = btnList.findIndex((b) => b.id === buttonId);


    if (btnIndex === -1) return;


    const btn = btnList[btnIndex];


    const startX = e.clientX;


    const startY = e.clientY;


    const startLeft = btn.left;


    const startTop = btn.top;


    const startW = btn.width;


    const startH = btn.height;


    const handleMove = (moveEvent) => {


      const deltaX = moveEvent.clientX - startX;


      const deltaY = moveEvent.clientY - startY;


      const newBtn = { ...btn };


      if (type === 'move') {


        newBtn.left = startLeft + deltaX;


        newBtn.top = startTop + deltaY;


      } else if (type === 'resize-e') {


        newBtn.width = Math.max(20, startW + deltaX);


      } else if (type === 'resize-s') {


        newBtn.height = Math.max(20, startH + deltaY);


      } else if (type === 'resize-se') {


        newBtn.width = Math.max(20, startW + deltaX);


        newBtn.height = Math.max(20, startH + deltaY);


      }


      setButtonPositions((prev) => {


        const newList = [...(prev[panelId] || [])];


        newList[btnIndex] = newBtn;


        return { ...prev, [panelId]: newList };


      });


    };


    const handleUp = () => {


      document.removeEventListener('mousemove', handleMove);


      document.removeEventListener('mouseup', handleUp);


    };


    document.addEventListener('mousemove', handleMove);


    document.addEventListener('mouseup', handleUp);


  };


  // 样式编辑


  const handleStyleEdit = (panelId, buttonId) => {


    const btnList = buttonPositions[panelId] || [];


    const button = btnList.find((b) => b.id === buttonId);


    if (button) {


      setEditingButton({ panelId, buttonId, button });


    }


  };


  // 删除按钮


  const handleDeleteButton = () => {


    if (!editingButton) return;


    const { panelId, buttonId } = editingButton;


    if (confirm('\u786e\u5b9a\u8981\u5220\u9664\u8fd9\u4e2a\u6309\u94ae\u5417\uff1f')) {


      setButtonPositions((prev) => {


        const newList = (prev[panelId] || []).filter((b) => b.id !== buttonId);


        return { ...prev, [panelId]: newList };


      });


      setEditingButton(null);


    }


  };


  // 按钮/样式更新


  const handleButtonUpdate = ({ style, label }) => {


    if (!editingButton) return;


    const { panelId, buttonId } = editingButton;


    setButtonPositions((prev) => {


      const btnList = [...(prev[panelId] || [])];


      const btnIndex = btnList.findIndex((b) => b.id === buttonId);


      if (btnIndex !== -1) {


        // 更新 label 与 style


        btnList[btnIndex] = {


          ...btnList[btnIndex],


          label: label !== undefined ? label : btnList[btnIndex].label,


          style: { ...btnList[btnIndex].style, ...style }


        };


      }


      return { ...prev, [panelId]: btnList };


    });


  };


  // 添加新按钮


  const handleAddButton = (targetPanelId) => {


    const newButton = {


      id: `btn_${Date.now()}`,


      label: '\u65b0\u6309\u94ae',


      kind: 'action',


      left: 20,


      top: 20,


      width: 100,


      height: 36,


      enabled: true,


      style: {


        backgroundColor: '#ffffff',


        color: '#1e293b',


        borderColor: '#e2e8f0',


        borderWidth: 1,


        borderRadius: 6,


        fontSize: 14,


        fontWeight: 500


      }


    };


    setButtonPositions((prev) => ({


      ...prev,


      [targetPanelId]: [...(prev[targetPanelId] || []), newButton]


    }));


  };


  // 按钮点击 (通用处理)


  const handleButtonClick = (button) => {


    if (isEditingLayout) return;


    console.log('Button clicked:', button.label, button.kind);


    // --- 录制钩子 (Recording Hook) ---
    // 自动沉淀记录原则：只记录按钮的 Replay 逻辑，不记录编辑框中的具体内容
    // 记录四要素：
    //   1. 输入来源：用户基于什么类型的内容操作
    //   2. 动作执行：用户点击了什么按钮
    //   3. 记录位置：回写作用在什么地方（使用标题定位，而非序号）
    //   4. 执行摘要：结果输出了什么


    if (isRecordingRecord) {

      // 获取当前选中的文档信息作为输入来源上下文
      const selectedDocs = docs.filter(d => selectedSourceIds[d.id]);
      const inputContext = selectedDocs.map(d => ({
        docName: d.name || '',
        docType: (d.name || '').split('.').pop()?.toUpperCase() || 'TXT'
      }));

      const newSection = {


        id: `sec_${Date.now()}`,


        order: currentSessionSections.length + 1,


        // === 要素2：动作执行（按钮操作） ===
        buttonId: button.id,


        buttonLabel: button.label,


        buttonKind: button.kind,


        timestamp: Date.now(),


        // === 要素1：输入来源（类型和上下文，不记录具体内容） ===
        input: {


          sourceType: button.kind || 'button_click',


          inputContext: inputContext, // 输入文档的上下文信息
          selectedDocCount: selectedDocs.length


        },


        // === 动作信息（仅记录按钮，不记录编辑框内容） ===
        action: {


          type: 'button_click',


          buttonKind: button.kind,
          buttonLabel: button.label


        },


        // === 要素3 & 4：记录位置和执行摘要（在执行完成后更新） ===
        output: {


          targetLocation: 'pending', // 执行后更新
          status: 'pending'


        }


      };


      setCurrentSessionSections((prev) => [...prev, newSection]);


    }


    switch (button.kind) {


      case 'switch':onSwitch?.();break;


      case 'edit':handleToggleEdit();break;


      case 'action':


        // TODO: 需要补充按钮动作逻辑


        alert(`触发指令: ${button.label}`);


        break;


    }


  };


  // 面板标题编辑


  const handleTitleEdit = (panelId) => {


    const currentTitle = panelTitles[panelId];


    const newTitle = prompt('请输入新标题', currentTitle);


    if (newTitle !== null && newTitle.trim() !== '') {


      setPanelTitles((prev) => ({


        ...prev,


        [panelId]: newTitle.trim()


      }));


    }


  };


  // --- 内容交互处理 ---


  const handleUpload = async (e) => {


    const inputEl = e?.target;


    const files = Array.from(inputEl?.files || []);


    if (!files.length) return;


    const createdDocs = [];


    const failedFiles = [];


    for (const file of files) {


      try {


        const name = file?.name || '\u672a\u547d\u540d\u6587\u6863';


        const isDocx = isDocxName(name);


        const rawText = isDocx ? await parseDocxFileToStructuredText(file) : await readFileText(file);


        const text = typeof rawText === 'string' ? rawText : String(rawText ?? '');


        const normalizedText = text.trim() ? text : '\uff08\u7a7a\u767d\u6587\u6863\uff09';


        const res = await fetch('/api/docs', {


          method: 'POST',


          headers: { 'Content-Type': 'application/json' },


          body: JSON.stringify({ name, content: normalizedText })


        });


        if (!res.ok) {


          const msg = await res.text();


          throw new Error(msg || '上传失败');


        }


        const data = await res.json();


        if (data?.doc) createdDocs.push(data.doc);


      } catch (err) {


        console.error(err);


        failedFiles.push({ name: file?.name || '(unknown)', reason: err?.message });


      }


    }


    if (createdDocs.length) {


      setDocs((prev) => {


        const byId = new Map((prev || []).filter(Boolean).map((d) => [d.id, d]));


        createdDocs.forEach((doc) => {


          if (doc?.id) byId.set(doc.id, doc);


        });


        return Array.from(byId.values());


      });


    }


    await refreshDocs();


    if (inputEl) inputEl.value = '';


    if (failedFiles.length) {


      const details = failedFiles.


      map((f) => f.reason ? `${f.name} (${f.reason})` : f.name).


      join(', ');


      appendAssistantMessage(`\u4e0a\u4f20\u5931\u8d25\uff1a${details}`);


    }


    if (isRecordingRecord) {


      const fileNames = files.map((f) => f.name).join(', ');


      const newSection = {


        id: `sec_${Date.now()}`,


        order: currentSessionSections.length + 1,


        buttonId: 'source_upload_trigger',


        buttonLabel: '上传文件',


        buttonKind: 'action',


        timestamp: Date.now(),


        input: {


          sourceType: 'file_system',


          contentPreview: `上传 ${files.length} 个文件：${fileNames}`


        },


        action: {


          type: 'upload_file',


          buttonData: { label: '上传文件', kind: 'upload' }


        },


        output: {


          targetLocation: 'sources_list',


          summary: `已上传 ${files.length} 个文件`


        },


        meta: {


          fileCount: files.length,


          fileDetails: createdDocs.map((doc) => ({ id: doc.id, name: doc.name })),


          reproducibility: {


            requiresLocalFile: true,


            fileNames: files.map((f) => f.name)


          }


        }


      };


      setCurrentSessionSections((prev) => [...prev, newSection]);


    }


  };


  const handleDeleteSource = async (id) => {


    try {


      await fetch(`/api/docs/${id}`, { method: 'DELETE' });


      await refreshDocs();


      setSelectedSourceIds((prev) => {


        const next = { ...prev };


        delete next[id];


        return next;


      });


    } catch (err) {


      console.error('Failed to delete doc', err);


    }


  };


  const handleClearSources = async () => {


    if (!docs.length) return;


    if (!confirm('\u786e\u5b9a\u8981\u6e05\u9664\u6765\u6e90\u5217\u8868\u4e2d\u7684\u5168\u90e8\u6587\u4ef6\u5417\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u64a4\u9500\u3002')) return;


    try {


      for (const doc of docs) {


        await fetch(`/api/docs/${doc.id}`, { method: 'DELETE' });


      }


      await refreshDocs();


      setSelectedSourceIds({});


    } catch (err) {


      console.error('Failed to clear docs', err);


    }


  };


  const handleSelectSource = (id) =>


  setSelectedSourceIds((prev) => ({ ...prev, [id]: !prev[id] }));


  // 清除对话记录
  const handleClearMessages = () => {
    const initialMessage = {
      id: '1',
      role: 'assistant',
      content: '您好！我已经阅读了这些文档。您可以问我任何关于产品需求或用户反馈的问题。'
    };
    setMessages([initialMessage]);
    // 同步清除服务器缓存
    fetch('/api/chat/cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [initialMessage] })
    }).catch(err => console.log('清除对话缓存失败', err));
  };

  const handleSendMessage = async (text) => {
    const userMsg = { id: `u_${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    try {
      // 收集当前已加载的文档内容
      const docContents = docs.map(doc => ({
        name: doc.name,
        content: doc.content?.substring(0, 5000) || '' // 限制每个文档最多5000字符
      })).filter(d => d.content);

      // 构建包含文档上下文的 prompt
      const docContext = docContents.length > 0 
        ? `以下是用户已加载的文档内容，请基于这些文档回答用户的问题：\n\n${docContents.map(d => `【${d.name}】\n${d.content}`).join('\n\n---\n\n')}\n\n---\n\n`
        : '';

      const systemPrompt = `你是一个专业的文档助手，负责帮助用户理解和分析他们上传的文档。
请基于用户提供的文档内容来回答问题，如果问题与文档无关，也可以友好地回应。
回答要简洁、准确、专业。如果文档中没有相关信息，请诚实告知。`;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${docContext}用户问题：${text}` }
          ],
          maxTokens: 1000
        })
      });

      let aiContent = '抱歉，我暂时无法回答您的问题，请稍后再试。';
      const citedDocs = [];

      if (response.ok) {
        const data = await response.json();
        if (data?.content) {
          aiContent = data.content;
          // 收集引用的文档名称
          docContents.forEach(d => {
            if (aiContent.includes(d.name) || text.includes(d.name)) {
              citedDocs.push(d.name);
            }
          });
        }
      }

      const aiMsg = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: aiContent,
        citations: citedDocs.length > 0 ? citedDocs : (docContents.length > 0 ? [docContents[0].name] : [])
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error('AI 对话失败:', error);
      const aiMsg = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: '抱歉，与 AI 服务通信时出现问题。请检查网络连接或稍后重试。'
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setThinking(false);
    }
  };


  const handleAddNote = () => setNotes((prev) => [{ id: `n_${Date.now()}`, title: '', content: '' }, ...prev]);


  const handleDeleteNote = (id) => setNotes((prev) => prev.filter((n) => n.id !== id));


  // 编辑按钮覆盖层


  const renderButtonsOverlay = (panelId) =>


  <EditableButtonsContainer


    panelId={panelId}


    buttons={buttonPositions[panelId] || []}


    isEditing={isEditingLayout}


    onButtonMouseDown={handleButtonMouseDown}


    onStyleEdit={handleStyleEdit}


    onClick={handleButtonClick}


    style={{


      position: 'absolute',


      top: 0, left: 0, right: 0, bottom: 0,


      zIndex: 10,


      pointerEvents: isEditingLayout ? 'none' : 'none' // 编辑模式下禁止点击内部按钮


    }} />;


  // 头部标题文本更新


  const handleHeaderTitleChange = (key, newText) => {


    setHeaderTitles((prev) => ({


      ...prev,


      [key]: { ...prev[key], text: newText }


    }));


  };


  const hiddenPanelIds = Object.keys(DEFAULT_PANEL_VISIBILITY).filter((id) => panelVisibility[id] === false);


  const getPanelLabel = (panelId) => {


    if (panelTitles?.[panelId]) return panelTitles[panelId];


    if (panelId === PANEL_IDS.SOURCES) return '来源';


    if (panelId === PANEL_IDS.CHAT) return '对话';


    if (panelId === PANEL_IDS.STUDIO) return 'Studio';


    return panelId;


  };


  return (


    <div


      className={`layout-multi ${isEditingLayout ? 'editing-mode' : ''}`}


      style={{ position: 'relative', height: '100%', padding: '16px', boxSizing: 'border-box' }}>


            {/* Header */}


            <header className="hero multi-header" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>


                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>


                        <LayoutIcon size={22} style={{ color: 'var(--primary-accent)', marginTop: '4px' }} />


                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>


                        {isEditingLayout ?


            <>


                                {/* Editable Title (Top) */}


                                <div


                style={{


                  position: 'relative',


                  display: 'inline-flex',


                  alignItems: 'center',


                  width: `${headerTitles.title.width}px`,


                  height: `${headerTitles.title.height}px`,


                  border: '1px dashed #94a3b8',


                  borderRadius: '4px',


                  zIndex: draggingHeaderTitle?.titleKey === 'title' ? 200 : 100,


                  transform: `translate(${headerTitles.title.position?.left || 0}px, ${headerTitles.title.position?.top || 0}px)`,


                  transition: draggingHeaderTitle?.titleKey === 'title' ? 'none' : 'transform 0.2s'


                }}>


                                    {/* Control Bar (Outside Top) */}


                                    <div style={{ position: 'absolute', top: '-24px', left: 0, display: 'flex', gap: '4px', background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>


                                        <div


                    onMouseDown={(e) => handleHeaderTitleMouseDown(e, 'title')}


                    style={{ cursor: 'move', display: 'flex', alignItems: 'center', color: '#64748b' }}


                    title={UI_TEXT.t1}>


                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="19 9 22 12 19 15"></polyline><polyline points="9 19 12 22 15 19"></polyline><circle cx="12" cy="12" r="1"></circle></svg>


                                        </div>


                                        <div


                    onClick={() => setEditingHeaderTitle('title')}


                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}


                    title={UI_TEXT.t2}>


                                            <Settings size={14} />


                                        </div>


                                    </div>


                                    <input


                  value={headerTitles.title.text}


                  onChange={(e) => handleHeaderTitleChange('title', e.target.value)}


                  style={{


                    ...headerTitles.title.style,


                    margin: 0,


                    width: '100%',


                    height: '100%',


                    border: 'none',


                    background: 'transparent',


                    outline: 'none',


                    padding: 0


                  }} />


                                    <div className="resize-handle e" onMouseDown={(e) => handleHeaderTitleResizeMouseDown(e, 'title', 'e')} />


                                    <div className="resize-handle s" onMouseDown={(e) => handleHeaderTitleResizeMouseDown(e, 'title', 's')} />


                                    <div className="resize-handle se" onMouseDown={(e) => handleHeaderTitleResizeMouseDown(e, 'title', 'se')} />


                                </div>


                                {/* Editable Eyebrow (Bottom) */}


                                <div


                style={{


                  position: 'relative',


                  display: 'inline-flex',


                  alignItems: 'center',


                  width: `${headerTitles.eyebrow.width}px`,


                  height: `${headerTitles.eyebrow.height}px`,


                  border: '1px dashed #94a3b8',


                  borderRadius: '4px',


                  zIndex: draggingHeaderTitle?.titleKey === 'eyebrow' ? 200 : 100,


                  transform: `translate(${headerTitles.eyebrow.position?.left || 0}px, ${headerTitles.eyebrow.position?.top || 0}px)`,


                  transition: draggingHeaderTitle?.titleKey === 'eyebrow' ? 'none' : 'transform 0.2s'


                }}>


                                    {/* Control Bar */}


                                    <div style={{ position: 'absolute', top: '-24px', left: 0, display: 'flex', gap: '4px', background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>


                                        <div


                    onMouseDown={(e) => handleHeaderTitleMouseDown(e, 'eyebrow')}


                    style={{ cursor: 'move', display: 'flex', alignItems: 'center', color: '#64748b' }}


                    title={UI_TEXT.t1}>


                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="19 9 22 12 19 15"></polyline><polyline points="9 19 12 22 15 19"></polyline><circle cx="12" cy="12" r="1"></circle></svg>


                                        </div>


                                        <div


                    onClick={() => setEditingHeaderTitle('eyebrow')}


                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}


                    title={UI_TEXT.t2}>


                                            <Settings size={14} />


                                        </div>


                                    </div>


                                    <input


                  value={headerTitles.eyebrow.text}


                  onChange={(e) => handleHeaderTitleChange('eyebrow', e.target.value)}


                  style={{


                    ...headerTitles.eyebrow.style,


                    margin: 0,


                    width: '100%',


                    height: '100%',


                    border: 'none',


                    background: 'transparent',


                    outline: 'none',


                    padding: 0


                  }} />


                                    <div className="resize-handle e" onMouseDown={(e) => handleHeaderTitleResizeMouseDown(e, 'eyebrow', 'e')} />


                                    <div className="resize-handle s" onMouseDown={(e) => handleHeaderTitleResizeMouseDown(e, 'eyebrow', 's')} />


                                    <div className="resize-handle se" onMouseDown={(e) => handleHeaderTitleResizeMouseDown(e, 'eyebrow', 'se')} />


                                </div>


                            </> :


            <>


                                <h1 style={{ ...headerTitles.title.style, margin: 0, width: `${headerTitles.title.width}px`, height: `${headerTitles.title.height}px`, display: 'flex', alignItems: 'center', transform: `translate(${headerTitles.title.position?.left || 0}px, ${headerTitles.title.position?.top || 0}px)`, transition: 'transform 0.2s' }}>{headerTitles.title.text}</h1>


                                <p className="eyebrow" style={{ ...headerTitles.eyebrow.style, margin: 0, width: `${headerTitles.eyebrow.width}px`, height: `${headerTitles.eyebrow.height}px`, display: 'flex', alignItems: 'center', transform: `translate(${headerTitles.eyebrow.position?.left || 0}px, ${headerTitles.eyebrow.position?.top || 0}px)`, transition: 'transform 0.2s' }}>{headerTitles.eyebrow.text}</p>


                            </>


            }


                    </div>


                </div>


                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>


                    <button


            onClick={onSwitch}


            className="ghost"


            style={{


              display: 'inline-flex',


              alignItems: 'center',


              gap: '6px',


              padding: '4px 10px',


              borderRadius: '999px',


              fontSize: '16px',


              fontWeight: 600


            }}>


                        <GalleryVerticalEnd size={18} /> {UI_TEXT.t3}


                    </button>


                                        {/* 编辑模式下显示工具栏 */}
                    {isEditingLayout && (
          <div className="edit-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '4px 8px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', border: '1px solid #e2e8f0' }}>
                            <button className="ghost small" onClick={handleResetLayout} title={UI_TEXT.t5}><RotateCcw size={16} /></button>
                            <button className="ghost small" onClick={handleCancelEdit} title={UI_TEXT.t6}><X size={16} /></button>
                            <button className="primary small" onClick={handleSaveEdit} title={UI_TEXT.t7}><Save size={16} />{UI_TEXT.t7}</button>
                        </div>
                    )}


                </div>


                {/* Header 按钮覆盖层（编辑中） */}


                {renderButtonsOverlay(PANEL_IDS.HEADER)}


            </header>


            {/* 右下角固定定位的编辑按钮（非编辑模式） */}
            {!isEditingLayout && (
                <div style={{
                    position: 'fixed',
                    right: '24px',
                    bottom: '24px',
                    zIndex: 100
                }}>
                    <button
                        className="ghost"
                        onClick={handleToggleEdit}
                        title={UI_TEXT.t4}
                        style={{ fontSize: '11px', padding: '4px 8px' }}>
                        <Pencil size={14} />{UI_TEXT.t4}
                    </button>
                </div>
            )}

            {/* Main Layout Area - Replaced Grid with LayoutEditContainer */}


            <div className="multi-content-area" style={{ flex: 1, overflow: 'auto', position: 'relative' }}>


                <LayoutEditContainer


          isEditing={isEditingLayout}


          size={layoutSize}


          onSizeChange={setLayoutSize}


          minWidth={600}


          minHeight={400}


          style={{ background: '#f8fafc' }}>


                    {/* Left: Sources */}


                    {panelVisibility[PANEL_IDS.SOURCES] !== false &&


          <EditableLayoutPanel


            panelId={PANEL_IDS.SOURCES}


            panelName={panelTitles[PANEL_IDS.SOURCES]}


            isEditing={isEditingLayout}


            position={panelPositions[PANEL_IDS.SOURCES]}


            onPositionChange={(newPos) => setPanelPositions((prev) => ({ ...prev, [PANEL_IDS.SOURCES]: newPos }))}


            onTitleEdit={handleTitleEdit}


            editHeaderActions={isEditingLayout ?


            <button


              type="button"


              className="ghost"


              onClick={(e) => {e.stopPropagation();hidePanel(PANEL_IDS.SOURCES);}}


              style={{ padding: '4px 8px', fontSize: '12px' }}>{UI_TEXT.t8}


            </button> :


            null}>


                            <SourcesPanel


              sources={sources}


              onUpload={handleUpload}


              onDelete={handleDeleteSource}


              onSelect={handleSelectSource}


              onClearAll={handleClearSources} />


                            {renderButtonsOverlay(PANEL_IDS.SOURCES)}


                        </EditableLayoutPanel>


          }


                    {/* Middle: Chat */}


                    {panelVisibility[PANEL_IDS.CHAT] !== false &&


          <EditableLayoutPanel


            panelId={PANEL_IDS.CHAT}


            panelName={panelTitles[PANEL_IDS.CHAT]}


            isEditing={isEditingLayout}


            position={panelPositions[PANEL_IDS.CHAT]}


            onPositionChange={(newPos) => setPanelPositions((prev) => ({ ...prev, [PANEL_IDS.CHAT]: newPos }))}


            onTitleEdit={handleTitleEdit}


            editHeaderActions={isEditingLayout ?


            <button


              type="button"


              className="ghost"


              onClick={(e) => {e.stopPropagation();hidePanel(PANEL_IDS.CHAT);}}


              style={{ padding: '4px 8px', fontSize: '12px' }}>{UI_TEXT.t8}


            </button> :


            null}>


                            <ChatPanel


              messages={messages}


              onSendMessage={handleSendMessage}


              thinking={thinking}


              appButtons={appButtons}


              onAppButtonClick={handleAppButtonClick}
              onClearMessages={handleClearMessages} />


                            {renderButtonsOverlay(PANEL_IDS.CHAT)}


                        </EditableLayoutPanel>


          }


                    {/* Right: Studio */}


                    {panelVisibility[PANEL_IDS.STUDIO] !== false &&


          <EditableLayoutPanel


            panelId={PANEL_IDS.STUDIO}


            panelName={panelTitles[PANEL_IDS.STUDIO]}


            isEditing={isEditingLayout}


            position={panelPositions[PANEL_IDS.STUDIO]}


            onPositionChange={(newPos) => setPanelPositions((prev) => ({ ...prev, [PANEL_IDS.STUDIO]: newPos }))}


            onTitleEdit={handleTitleEdit}


            editHeaderActions={isEditingLayout ?


            <button


              type="button"


              className="ghost"


              onClick={(e) => {e.stopPropagation();hidePanel(PANEL_IDS.STUDIO);}}


              style={{ padding: '4px 8px', fontSize: '12px' }}>{UI_TEXT.t8}


            </button> :


            null}>


                            <StudioPanel


              notes={notes}


              onAddNote={handleAddNote}


              onDeleteNote={handleDeleteNote} />


                            {renderButtonsOverlay(PANEL_IDS.STUDIO)}


                        </EditableLayoutPanel>


          }


                </LayoutEditContainer>


            </div>


            {isEditingLayout &&


      <>


                    <div className={`multi-hidden-sidebar ${showHiddenSidebar ? 'is-open' : 'is-closed'}`}>


                        <div className="multi-hidden-header">


                            <div className="multi-hidden-title">{UI_TEXT.t9}


              <span className="multi-hidden-count">{hiddenPanelIds.length}</span>


                            </div>


                            <button


              type="button"


              className="ghost icon-btn multi-hidden-close"


              onClick={() => setShowHiddenSidebar(false)}


              title={UI_TEXT.t10}>


                                <ChevronRight size={18} />


                            </button>


                        </div>


                        <div className="multi-hidden-body">


                            {hiddenPanelIds.length === 0 ?


            <div className="multi-hidden-empty">{UI_TEXT.t11}</div> :


            hiddenPanelIds.map((panelId) =>


            <div key={panelId} className="multi-hidden-item">


                                        <span className="multi-hidden-name">{getPanelLabel(panelId)}</span>


                                        <button


                type="button"


                className="ghost multi-hidden-restore"


                onClick={(e) => {e.stopPropagation();showPanel(panelId);}}>{UI_TEXT.t12}


              </button>


                                    </div>


            )


            }


                        </div>


                    </div>


                    {!showHiddenSidebar &&


        <button


          type="button"


          className="multi-hidden-toggle"


          onClick={() => setShowHiddenSidebar(true)}


          title={UI_TEXT.t9}>


                            <ChevronLeft size={16} />


                            <span>{UI_TEXT.t9}</span>


                        </button>


        }


                </>


      }


            {/* Replay Status Overlay */}


            {isReplaying &&


      <div style={{


        position: 'fixed',


        top: '80px',


        left: '50%',


        transform: 'translateX(-50%)',


        background: 'rgba(30, 41, 59, 0.9)',


        color: 'white',


        padding: '12px 24px',


        borderRadius: '999px',


        zIndex: 9999,


        display: 'flex',


        alignItems: 'center',


        gap: '12px',


        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',


        backdropFilter: 'blur(4px)',


        fontSize: '14px',


        fontWeight: 500


      }}>


                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>


                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>


                    {replayStatus}


                </div>


      }


            {/* Style Editor Overlay */}


            {editingButton &&


      <>


                    <StyleEditorOverlay onClose={() => setEditingButton(null)} />


                    <StyleEditor


          button={editingButton.button}


          onStyleChange={handleButtonUpdate}


          onDelete={handleDeleteButton}


          onClose={() => setEditingButton(null)} />


                </>


      }


            {/* Header Title Editor Overlay */}


            {editingHeaderTitle &&


      <>


                    <StyleEditorOverlay onClose={() => setEditingHeaderTitle(null)} />


                    <StyleEditor


          button={{


            label: headerTitles[editingHeaderTitle].text,


            style: headerTitles[editingHeaderTitle].style


          }}


          onStyleChange={(updates) => {


            setHeaderTitles((prev) => ({


              ...prev,


              [editingHeaderTitle]: {


                ...prev[editingHeaderTitle],


                text: updates.label,


                style: { ...prev[editingHeaderTitle].style, ...updates.style }


              }


            }));


          }}


          onClose={() => setEditingHeaderTitle(null)}


          onDelete={() => {/* Disable delete for header titles */}} />


                </>


      }


        </div>);


}


// 错误边界


class ErrorBoundary extends React.Component {


  constructor(props) {


    super(props);


    this.state = { hasError: false };


  }


  static getDerivedStateFromError(error) {


    return { hasError: true };


  }


  render() {


    if (this.state.hasError) return <div>{UI_TEXT.t13}</div>;


    return this.props.children;


  }


}


export default function WrappedMultiDocWorkbench(props) {


  return (


    <ErrorBoundary>


            <MultiDocWorkbench {...props} />


        </ErrorBoundary>);


}
