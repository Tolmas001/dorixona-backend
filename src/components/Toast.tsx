import { ShoppingBag, AlertCircle, CheckCircle, InfoIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 2200) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return { toasts, showToast };
}

export function ToastMessage({ message }: { message: string }) {
  if (!message) return null;
  return <div className="toast toast-info">{message}</div>;
}

export function CartToast({ message }: { message: string }) {
  if (!message) return null;
  return <div className="toast toast-success"><ShoppingBag size={18} /> {message}</div>;
}

export function Toast({
  message,
  type = 'info',
  onClose
}: {
  message: string;
  type?: ToastType;
  onClose?: () => void;
}) {
  if (!message) return null;

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    warning: <AlertCircle size={18} />,
    info: <InfoIcon size={18} />,
  };

  return (
    <div className={`toast toast-${type}`} role="status" aria-live="polite">
      {icons[type]}
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="toast-close" type="button" aria-label="Close notification">
          ✕
        </button>
      )}
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: { toasts: Array<{ id: string; message: string; type: ToastType }>; onClose: (id: string) => void }) {
  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  );
}