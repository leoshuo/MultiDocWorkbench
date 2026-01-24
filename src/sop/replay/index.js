/**
 * Replay 模块导出
 */

// 配置
export {
  ReplayStatus,
  ActionCategory,
  getActionConfig,
  getAllActionTypes,
  getActionsByCategory,
  hasActionType,
  registerAction,
  unregisterAction,
  inferActionType,
} from './replayConfig';

// 上下文
export {
  ReplayContext,
  createReplayContext,
} from './replayContext';

// 引擎
export {
  ReplayEngine,
  createReplayEngine,
  createDefaultReplayEngine,
} from './replayEngine';
