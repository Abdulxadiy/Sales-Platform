import React, { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
          color: '#f8fafc',
          padding: 24,
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: 540,
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 16,
            padding: 28,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ margin: '0 0 12px', color: '#f43f5e', fontSize: 20 }}>
              Kutilmagan xatolik yuz berdi
            </h2>
            <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: 14 }}>
              Ilovani yuklashda xatolik aniqlandi:
            </p>
            <pre style={{
              background: '#020617',
              padding: 14,
              borderRadius: 8,
              color: '#fda4af',
              fontSize: 12,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              margin: '0 0 20px'
            }}>
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              style={{
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Keshni tozalash va Qayta yuklash
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
