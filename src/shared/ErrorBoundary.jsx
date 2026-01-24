import React from 'react';

/**
 * 错误边界组件
 * 用于捕获子组件树中的 JavaScript 错误，防止整个应用崩溃
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 使下一次渲染能够显示降级 UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误信息
    console.error('[ErrorBoundary] 捕获到错误:', error);
    console.error('[ErrorBoundary] 组件堆栈:', errorInfo?.componentStack);
    
    this.setState({ errorInfo });
    
    // 如果提供了错误上报回调，调用它
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义降级 UI，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认降级 UI
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#fef2f2',
          borderRadius: '8px',
          margin: '20px',
          border: '1px solid #fecaca'
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>
            {this.props.title || '页面渲染出错'}
          </h2>
          <p style={{ color: '#7f1d1d', marginBottom: '24px' }}>
            {this.props.message || '抱歉，该模块出现了问题。您可以尝试重试或刷新页面。'}
          </p>
          {this.state.error && (
            <details style={{ 
              textAlign: 'left', 
              marginBottom: '24px',
              padding: '12px',
              backgroundColor: '#fee2e2',
              borderRadius: '4px'
            }}>
              <summary style={{ cursor: 'pointer', color: '#991b1b' }}>
                错误详情
              </summary>
              <pre style={{ 
                fontSize: '12px', 
                overflow: 'auto',
                marginTop: '8px',
                color: '#7f1d1d'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '8px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              重试
            </button>
            <button
              onClick={this.handleRefresh}
              style={{
                padding: '8px 24px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 高阶组件：为组件添加错误边界
 * @param {React.Component} WrappedComponent - 要包装的组件
 * @param {Object} errorBoundaryProps - ErrorBoundary 的 props
 */
export function withErrorBoundary(WrappedComponent, errorBoundaryProps = {}) {
  return function WithErrorBoundaryWrapper(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
