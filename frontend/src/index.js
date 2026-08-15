import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Suppress unhandled promise rejections from axios (network errors, 401s)
// These are handled by the axios interceptor which redirects to /login
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (
    reason?.isAxiosError ||
    reason?.message?.includes('Request failed') ||
    reason?.message?.includes('Network Error') ||
    reason?.code === 'ERR_NETWORK'
  ) {
    event.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);
