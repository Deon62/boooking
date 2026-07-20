import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckIcon, XIcon } from './icons.jsx';

// Lightweight global toast: one stack, auto-dismiss, click to dismiss.
// Usage: const toast = useToast(); toast.success('Saved'); toast.error('…').

const ToastContext = createContext(null);

export function useToast() {
  // Safe no-op fallback so components work even outside the provider (e.g. tests).
  return useContext(ToastContext) || { show() {}, success() {}, error() {}, info() {}, dismiss() {} };
}

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const show = useCallback(
    (message, type = 'info', duration = 3500) => {
      const id = ++nextId;
      setToasts((list) => [...list, { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const api = useRef({
    show,
    success: (m, d) => show(m, 'success', d),
    error: (m, d) => show(m, 'error', d),
    info: (m, d) => show(m, 'info', d),
    dismiss,
  }).current;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => (
          <button
            key={t.id}
            className={`toast toast-${t.type}`}
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
          >
            {t.type !== 'info' && (
              <span className="toast-ico">
                {t.type === 'success' ? <CheckIcon size={16} /> : <XIcon size={16} />}
              </span>
            )}
            <span>{t.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
