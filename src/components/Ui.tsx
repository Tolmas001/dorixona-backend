import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'disabled' | 'onClick' | 'type'> & {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

export function Button({ children, onClick, type = 'button', variant = 'primary', disabled, loading, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`btn ${variant} ${loading ? 'loading' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      aria-busy={loading}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'success' | 'warning' | 'danger' | 'neutral' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {text && <span>{text}</span>}
    </div>
  );
}

export function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`field ${error ? 'error' : ''}`}>
      <span>
        {label}
        {required && <span aria-label="required">*</span>}
      </span>
      {children}
      {error && <div className="error-message" role="alert">{error}</div>}
    </label>
  );
}

export function PageTitle({ eyebrow, title, text, action }: { eyebrow?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  );
}
