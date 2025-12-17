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

// Ensure background always covers full screen on iOS
function ensureFullScreenBackground() {
  const setFullScreenBackground = () => {
    // Get actual screen dimensions (not affected by keyboard)
    const screenHeight = window.screen.height || window.innerHeight;
    const screenWidth = window.screen.width || window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Use the larger of screen or viewport to ensure full coverage
    const height = Math.max(screenHeight, viewportHeight);
    const width = Math.max(screenWidth, viewportWidth);
    
    // Set fixed dimensions to cover entire screen
    document.documentElement.style.width = `${width}px`;
    document.documentElement.style.height = `${height}px`;
    document.documentElement.style.minHeight = `${height}px`;
    document.documentElement.style.position = 'fixed';
    document.documentElement.style.top = '0';
    document.documentElement.style.left = '0';
    document.documentElement.style.right = '0';
    document.documentElement.style.bottom = '0';
    document.documentElement.style.background = 'linear-gradient(135deg, #1a1f3a 0%, #2d3561 50%, #3d1f5c 100%)';
    document.documentElement.style.backgroundColor = '#1a1f3a';
    document.documentElement.style.overflow = 'hidden';
    
    document.body.style.width = `${width}px`;
    document.body.style.height = `${height}px`;
    document.body.style.minHeight = `${height}px`;
    document.body.style.position = 'fixed';
    document.body.style.top = '0';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.bottom = '0';
    document.body.style.background = 'linear-gradient(135deg, #1a1f3a 0%, #2d3561 50%, #3d1f5c 100%)';
    document.body.style.backgroundColor = '#1a1f3a';
    document.body.style.overflow = 'hidden';
    
    // Also set on root to prevent any gaps
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.style.background = 'transparent';
      rootElement.style.backgroundColor = 'transparent';
    }
  };
  
  // Set immediately
  setFullScreenBackground();
  
  // Update on any resize (including keyboard)
  window.addEventListener('resize', setFullScreenBackground);
  window.addEventListener('orientationchange', () => {
    setTimeout(setFullScreenBackground, 100);
  });
  
  // Use Visual Viewport API if available (for keyboard handling)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      // Don't resize when keyboard appears - keep full screen
      setFullScreenBackground();
    });
    window.visualViewport.addEventListener('scroll', setFullScreenBackground);
  }
  
  // Handle focus events (keyboard show/hide)
  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      // Keep full screen when keyboard appears
      setTimeout(setFullScreenBackground, 100);
    }
  });
  
  document.addEventListener('focusout', () => {
    // Maintain full screen when keyboard closes
    setTimeout(setFullScreenBackground, 100);
  });
}

ensureFullScreenBackground();

// Continuously ensure background stays full screen
setInterval(() => {
  const screenHeight = window.screen.height || window.innerHeight;
  const screenWidth = window.screen.width || window.innerWidth;
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const height = Math.max(screenHeight, viewportHeight);
  const width = Math.max(screenWidth, viewportWidth);
  
  // Force full screen coverage
  if (document.documentElement.style.height !== `${height}px`) {
    document.documentElement.style.height = `${height}px`;
    document.documentElement.style.minHeight = `${height}px`;
    document.documentElement.style.width = `${width}px`;
  }
  if (document.body.style.height !== `${height}px`) {
    document.body.style.height = `${height}px`;
    document.body.style.minHeight = `${height}px`;
    document.body.style.width = `${width}px`;
  }
  
  // Ensure background is always set (prevent black)
  if (!document.documentElement.style.background || !document.documentElement.style.background.includes('gradient')) {
    document.documentElement.style.background = 'linear-gradient(135deg, #1a1f3a 0%, #2d3561 50%, #3d1f5c 100%)';
    document.documentElement.style.backgroundColor = '#1a1f3a';
  }
  if (!document.body.style.background || !document.body.style.background.includes('gradient')) {
    document.body.style.background = 'linear-gradient(135deg, #1a1f3a 0%, #2d3561 50%, #3d1f5c 100%)';
    document.body.style.backgroundColor = '#1a1f3a';
  }
  
  // Ensure position is fixed
  if (document.documentElement.style.position !== 'fixed') {
    document.documentElement.style.position = 'fixed';
    document.documentElement.style.top = '0';
    document.documentElement.style.left = '0';
    document.documentElement.style.right = '0';
    document.documentElement.style.bottom = '0';
  }
  if (document.body.style.position !== 'fixed') {
    document.body.style.position = 'fixed';
    document.body.style.top = '0';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.bottom = '0';
  }
}, 50);

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
