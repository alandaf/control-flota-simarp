import { useState } from 'react';
import { api, setToken } from '../lib/api';
import { useAuth, type User } from '../lib/auth';
import { Logo, User as UserIcon, Wheel } from '../components/Icons';

export default function Login() {
  const { setUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'passenger' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : form;
      const res = await api<{ token: string; user: User }>(path, payload);
      setToken(res.token);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand"><span className="mark"><Logo /></span> Control Flota</div>
        <p className="sub">Plataforma de gestión de flota y viajes en tiempo real.</p>

        <div className="tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Ingresar</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Registrarse</button>
        </div>

        {mode === 'register' && (
          <>
            <label>Nombre completo</label>
            <input value={form.name} onChange={upd('name')} placeholder="Juan Pérez" required />
          </>
        )}

        <label>Email</label>
        <input type="email" value={form.email} onChange={upd('email')} placeholder="tucorreo@correo.cl" required />

        {mode === 'register' && (
          <>
            <label>Teléfono</label>
            <input type="tel" value={form.phone} onChange={upd('phone')} placeholder="+56 9 1234 5678" />
          </>
        )}

        <label>Contraseña</label>
        <input type="password" value={form.password} onChange={upd('password')} placeholder="••••••" required />

        {mode === 'register' && (
          <>
            <label>Quiero registrarme como</label>
            <div className="role-pick">
              <label>
                <input type="radio" name="role" checked={form.role === 'passenger'} onChange={() => setForm({ ...form, role: 'passenger' })} />
                <span><UserIcon /> Pasajero</span>
              </label>
              <label>
                <input type="radio" name="role" checked={form.role === 'driver'} onChange={() => setForm({ ...form, role: 'driver' })} />
                <span><Wheel /> Conductor</span>
              </label>
            </div>
          </>
        )}

        <button className="btn" disabled={busy}>{busy ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
        {error && <div className="msg error">{error}</div>}

        {import.meta.env.DEV && (
          <p className="hint">
            Cuentas de demostración (solo dev) · clave <code>123456</code><br />
            <b>admin@flota.cl</b> · <b>pasajero@flota.cl</b> · <b>conductor@flota.cl</b>
          </p>
        )}
      </form>
    </div>
  );
}
