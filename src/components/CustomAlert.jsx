import React from 'react';
import { AlertTriangle, Info, CheckCircle, Trash2, X } from 'lucide-react';

export default function CustomAlert({ 
  title = 'Alert', 
  message = '', 
  type = 'confirm', // 'alert' (only ok) or 'confirm' (ok and cancel)
  variant = 'info', // 'info', 'warning', 'danger', 'success'
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel
}) {

  // Colors and Icons depending on the variant
  const config = {
    info: {
      icon: <Info size={32} color="#3b82f6" />,
      border: '1px solid rgba(59, 130, 246, 0.2)',
      btnBg: '#3b82f6',
      btnHoverBg: '#2563eb',
      glow: 'rgba(59, 130, 246, 0.2)'
    },
    warning: {
      icon: <AlertTriangle size={32} color="#f59e0b" />,
      border: '1px solid rgba(245, 158, 11, 0.2)',
      btnBg: '#f59e0b',
      btnHoverBg: '#d97706',
      glow: 'rgba(245, 158, 11, 0.2)'
    },
    danger: {
      icon: <Trash2 size={32} color="#ef4444" />,
      border: '1px solid rgba(239, 68, 68, 0.2)',
      btnBg: '#ef4444',
      btnHoverBg: '#dc2626',
      glow: 'rgba(239, 68, 68, 0.2)'
    },
    success: {
      icon: <CheckCircle size={32} color="#10b981" />,
      border: '1px solid rgba(16, 185, 129, 0.2)',
      btnBg: '#10b981',
      btnHoverBg: '#059669',
      glow: 'rgba(16, 185, 129, 0.2)'
    }
  }[variant] || {
    icon: <Info size={32} color="#3b82f6" />,
    border: '1px solid rgba(59, 130, 246, 0.2)',
    btnBg: '#3b82f6',
    btnHoverBg: '#2563eb',
    glow: 'rgba(59, 130, 246, 0.2)'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      animation: 'overlayFadeIn 0.25s ease'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        border: config.border,
        borderRadius: '16px',
        width: '100%',
        maxWidth: '440px',
        padding: '30px',
        boxShadow: `0 20px 50px rgba(0, 0, 0, 0.4), 0 0 30px ${config.glow}`,
        animation: 'cardSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        color: '#f8fafc',
        position: 'relative'
      }}>
        {/* Close icon on top-right */}
        <button 
          onClick={onCancel || onConfirm} 
          style={{
            position: 'absolute', top: '15px', right: '15px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', transition: 'color 0.2s', padding: '4px',
            borderRadius: '8px'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#f1f5f9'}
          onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
        >
          <X size={18} />
        </button>

        {/* Content Row */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            padding: '12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            {config.icon}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '700', color: '#f1f5f9' }}>{title}</h3>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#94a3b8', lineHeight: '1.5' }}>{message}</p>
          </div>
        </div>

        {/* Buttons Row */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {type === 'confirm' && (
            <button
              onClick={onCancel}
              style={{
                padding: '10px 18px',
                backgroundColor: 'transparent',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.color = '#f1f5f9';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              backgroundColor: config.btnBg,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: `0 4px 12px ${config.glow}`,
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = config.btnHoverBg;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = config.btnBg;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
