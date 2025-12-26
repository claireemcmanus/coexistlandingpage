import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Add error boundary for better error handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={() => window.location.reload()}>Reload App</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Add debug logging
console.log('React app starting...');
console.log('Root element:', document.getElementById('root'));

// Force background color on body and html to prevent white space
document.documentElement.style.backgroundColor = '#1a1f3a';
document.body.style.backgroundColor = '#1a1f3a';
document.body.style.background = 'linear-gradient(135deg, #1a1f3a 0%, #2d3561 50%, #3d1f5c 100%)';

// Also set on root element
const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.style.backgroundColor = '#1a1f3a';
  rootElement.style.background = 'linear-gradient(135deg, #1a1f3a 0%, #2d3561 50%, #3d1f5c 100%)';
}

// Set background on document element as well
document.documentElement.style.background = 'linear-gradient(135deg, #1a1f3a 0%, #2d3561 50%, #3d1f5c 100%)';

// Background is handled by CSS (body::before pseudo-element)
// We just need to ensure background color is set as fallback
// Allow normal scrolling - background will stay fixed via CSS

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

console.log('React app rendered');

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
