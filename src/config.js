// API配置
const envApiBase = import.meta.env.VITE_API_URL;
const fallbackBase =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:4300';
export const API_BASE_URL = (envApiBase && envApiBase.trim()) ? envApiBase : fallbackBase;

// API端点
export const API_ENDPOINTS = {
    OUTLINES: `${API_BASE_URL}/api/multi/outlines`,
    PRECIPITATION: `${API_BASE_URL}/api/multi/precipitation/records`,
    DOCS: `${API_BASE_URL}/api/docs`,
    SCENE: `${API_BASE_URL}/api/scene`,
};
