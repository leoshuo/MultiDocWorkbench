// ========== P1: 前端状态管理增强 ==========
// 这个文件提供了改进的状态管理方案，用于替代 App.jsx 中的 40+ useState

import { useReducer, useCallback } from 'react';

// 初始状态结构
export const initialAppState = {
  // 核心数据
  data: {
    template: null,
    docs: [],
    scene: null,
    deposits: [],
  },

  // UI ״̬
  ui: {
    loading: false,
    dispatching: false,
    finalizing: false,
    toast: '',
    processingTab: 'outline', // 'outline' | 'records' | 'config'
  },

  // 编辑和选择
  editing: {
    selectedDocId: null,
    docDraft: '',
    outlineEditing: {}, // sectionId -> bool
    depositEditing: {}, // key -> draft text
    editingButtonId: null,
    buttonDraft: null,
  },

  // 回放和日志
  replay: {
    dirHandle: null,
    dirName: '',
    running: false,
    batchReplayRunning: false,
    replayState: {}, // depositId -> {running, bySection:{[sectionId]:{status,message}}}
  },

  // 大纲相关
  outline: {
    selectedOutlineExec: {}, // sectionId -> bool
    sectionDocLinks: {},
    sectionDocPick: {},
    sectionDocDone: {},
    summaryExpanded: {},
    selectedOutlineIds: {},
  },

  // LLM 按钮配置
  llmConfig: {
    llmButtons: [],
    dispatchLogs: [],
    expandedLogs: {},
    finalSlots: {},
    processedContent: '',
    dispatchMode: 'doc', // 'doc' | 'result'
    selectedLogTexts: {},
  },

  // 预览
  preview: {
    selection: { text: '', start: 0, end: 0 },
    hasSelection: false,
  },

  // 其他
  misc: {
    depositSeq: 0,
    selectedDepositIds: {},
    expandedDepositSections: {},
  },
};

// Action 类型定义
export const actionTypes = {
  // 数据操作
  SET_TEMPLATE: 'SET_TEMPLATE',
  SET_DOCS: 'SET_DOCS',
  SET_SCENE: 'SET_SCENE',
  SET_DEPOSITS: 'SET_DEPOSITS',

  // UI ״̬
  SET_LOADING: 'SET_LOADING',
  SET_DISPATCHING: 'SET_DISPATCHING',
  SET_FINALIZING: 'SET_FINALIZING',
  SHOW_TOAST: 'SHOW_TOAST',
  SET_PROCESSING_TAB: 'SET_PROCESSING_TAB',

  // 编辑
  SET_SELECTED_DOC_ID: 'SET_SELECTED_DOC_ID',
  SET_DOC_DRAFT: 'SET_DOC_DRAFT',
  SET_OUTLINE_EDITING: 'SET_OUTLINE_EDITING',
  SET_EDITING_BUTTON_ID: 'SET_EDITING_BUTTON_ID',
  SET_BUTTON_DRAFT: 'SET_BUTTON_DRAFT',

  // 回放
  SET_REPLAY_DIR_HANDLE: 'SET_REPLAY_DIR_HANDLE',
  SET_REPLAY_DIR_NAME: 'SET_REPLAY_DIR_NAME',
  SET_REPLAY_RUNNING: 'SET_REPLAY_RUNNING',

  // 大纲
  SET_SECTION_DOC_LINKS: 'SET_SECTION_DOC_LINKS',
  SET_OUTLINE_SELECTION: 'SET_OUTLINE_SELECTION',

  // LLM 配置
  SET_LLM_BUTTONS: 'SET_LLM_BUTTONS',
  ADD_DISPATCH_LOG: 'ADD_DISPATCH_LOG',

  // 批量操作
  RESET_STATE: 'RESET_STATE',
};

// Reducer 函数
export const appReducer = (state, action) => {
  switch (action.type) {
    // 数据操作
    case actionTypes.SET_TEMPLATE:
      return { ...state, data: { ...state.data, template: action.payload } };

    case actionTypes.SET_DOCS:
      return { ...state, data: { ...state.data, docs: action.payload } };

    case actionTypes.SET_SCENE:
      return { ...state, data: { ...state.data, scene: action.payload } };

    case actionTypes.SET_DEPOSITS:
      return { ...state, data: { ...state.data, deposits: action.payload } };

    // UI ״̬
    case actionTypes.SET_LOADING:
      return { ...state, ui: { ...state.ui, loading: action.payload } };

    case actionTypes.SET_DISPATCHING:
      return { ...state, ui: { ...state.ui, dispatching: action.payload } };

    case actionTypes.SET_FINALIZING:
      return { ...state, ui: { ...state.ui, finalizing: action.payload } };

    case actionTypes.SHOW_TOAST:
      return { ...state, ui: { ...state.ui, toast: action.payload } };

    case actionTypes.SET_PROCESSING_TAB:
      return { ...state, ui: { ...state.ui, processingTab: action.payload } };

    // 编辑
    case actionTypes.SET_SELECTED_DOC_ID:
      return { ...state, editing: { ...state.editing, selectedDocId: action.payload } };

    case actionTypes.SET_DOC_DRAFT:
      return { ...state, editing: { ...state.editing, docDraft: action.payload } };

    case actionTypes.SET_OUTLINE_EDITING:
      return {
        ...state,
        editing: { ...state.editing, outlineEditing: action.payload },
      };

    case actionTypes.SET_EDITING_BUTTON_ID:
      return { ...state, editing: { ...state.editing, editingButtonId: action.payload } };

    case actionTypes.SET_BUTTON_DRAFT:
      return { ...state, editing: { ...state.editing, buttonDraft: action.payload } };

    // 回放
    case actionTypes.SET_REPLAY_DIR_HANDLE:
      return { ...state, replay: { ...state.replay, dirHandle: action.payload } };

    case actionTypes.SET_REPLAY_DIR_NAME:
      return { ...state, replay: { ...state.replay, dirName: action.payload } };

    case actionTypes.SET_REPLAY_RUNNING:
      return { ...state, replay: { ...state.replay, running: action.payload } };

    // 大纲
    case actionTypes.SET_SECTION_DOC_LINKS:
      return { ...state, outline: { ...state.outline, sectionDocLinks: action.payload } };

    case actionTypes.SET_OUTLINE_SELECTION:
      return { ...state, outline: { ...state.outline, selectedOutlineExec: action.payload } };

    // LLM 配置
    case actionTypes.SET_LLM_BUTTONS:
      return { ...state, llmConfig: { ...state.llmConfig, llmButtons: action.payload } };

    case actionTypes.ADD_DISPATCH_LOG:
      return {
        ...state,
        llmConfig: {
          ...state.llmConfig,
          dispatchLogs: [action.payload, ...state.llmConfig.dispatchLogs],
        },
      };

    // 重置
    case actionTypes.RESET_STATE:
      return initialAppState;

    default:
      return state;
  }
};

// Custom Hook - 简化 useReducer 使用
export const useAppState = () => {
  const [state, dispatch] = useReducer(appReducer, initialAppState);

  // 便利函数
  const actions = {
    setTemplate: useCallback((template) => dispatch({ type: actionTypes.SET_TEMPLATE, payload: template }), []),
    setDocs: useCallback((docs) => dispatch({ type: actionTypes.SET_DOCS, payload: docs }), []),
    setScene: useCallback((scene) => dispatch({ type: actionTypes.SET_SCENE, payload: scene }), []),
    setLoading: useCallback((loading) => dispatch({ type: actionTypes.SET_LOADING, payload: loading }), []),
    setDispatching: useCallback((dispatching) => dispatch({ type: actionTypes.SET_DISPATCHING, payload: dispatching }), []),
    setFinalizing: useCallback((finalizing) => dispatch({ type: actionTypes.SET_FINALIZING, payload: finalizing }), []),
    showToast: useCallback((message) => dispatch({ type: actionTypes.SHOW_TOAST, payload: message }), []),
    setProcessingTab: useCallback((tab) => dispatch({ type: actionTypes.SET_PROCESSING_TAB, payload: tab }), []),
    setSelectedDocId: useCallback((id) => dispatch({ type: actionTypes.SET_SELECTED_DOC_ID, payload: id }), []),
    setDocDraft: useCallback((draft) => dispatch({ type: actionTypes.SET_DOC_DRAFT, payload: draft }), []),
    setLlmButtons: useCallback((buttons) => dispatch({ type: actionTypes.SET_LLM_BUTTONS, payload: buttons }), []),
    addDispatchLog: useCallback((log) => dispatch({ type: actionTypes.ADD_DISPATCH_LOG, payload: log }), []),
    resetState: useCallback(() => dispatch({ type: actionTypes.RESET_STATE }), []),
  };

  return { state, dispatch, actions };
};
