import { Eye, EyeOff } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { api } from '../api/client';
import { Badge, Button, Field } from '../components/Ui';
import { go } from '../app/navigation';
import { isAdminRole } from '../utils/format';
import { saveAuth } from '../utils/storage';
import type { AuthState } from '../types';

export function AuthPage({ onAuth }: { onAuth: (auth: AuthState) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [status, setStatus] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus('Tekshirilmoqda...');
    try {
      if (mode === 'register') {
        await api.register({
          fullname: String(form.get('fullname') || ''),
          username: String(form.get('username') || ''),
          email: String(form.get('email') || ''),
          password: String(form.get('password') || ''),
          phone: String(form.get('phone') || ''),
        });
        setStatus('Ro‘yxatdan o‘tildi. Endi login qiling.');
        setMode('login');
        return;
      }
      const auth = await api.login(String(form.get('email') || ''), String(form.get('password') || ''));
      saveAuth(auth);
      onAuth(auth);
      go(isAdminRole(auth.user.role) ? 'admin' : 'home');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Xatolik yuz berdi');
    }
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <Badge tone="success">Dorixona tizimi</Badge>
        <h1>{mode === 'login' ? 'Tizimga kirish' : 'Yangi xaridor'}</h1>
        <div className="switcher">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">Kirish</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">Register</button>
        </div>
        {mode === 'register' && (
          <>
            <Field label="Ism familiya"><input name="fullname" placeholder="Ali Valiyev" required /></Field>
            <Field label="Username"><input name="username" placeholder="ali_valiyev" required /></Field>
            <Field label="Telefon"><input name="phone" placeholder="+998 90 123 45 67" required /></Field>
          </>
        )}
        <Field label="Email"><input name="email" placeholder="email@dorixona.uz" required type="email" /></Field>
        <Field label="Parol">
          <div className="password-field">
            <input name="password" placeholder="Kamida 8 belgi" required type={showPassword ? 'text' : 'password'} />
            <button
              aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <Button type="submit">{mode === 'login' ? 'Kirish' : 'Ro‘yxatdan o‘tish'}</Button>
        {status && <p className="status-text">{status}</p>}
      </form>
    </main>
  );
}