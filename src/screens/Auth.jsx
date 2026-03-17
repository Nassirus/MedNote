import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Auth() {
  const { login, register } = useAuth()
  const [mode, setMode]   = useState('login')
  const [form, setForm]   = useState({ name: '', email: '', password: '' })
  const [err, setErr]     = useState('')
  const [loading, setLoading] = useState(false)

  function set(k) { return e => { setForm(p => ({ ...p, [k]: e.target.value })); setErr('') } }

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setErr('')
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        if (!form.name.trim()) { setErr('Введите имя'); setLoading(false); return }
        await register(form.email, form.password, form.name)
      }
    } catch (e) {
      setErr(e.message || 'Ошибка. Проверьте данные.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg,#EFF6FF 0%,#F0FDFA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 12 }}>💊</div>
          <h1 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: -0.5 }}>MedSchedule</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>AI-помощник по назначениям врача</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 10, padding: 4, marginBottom: 22 }}>
          {[['login', 'Войти'], ['register', 'Регистрация']].map(([m, l]) => (
            <button key={m} onClick={() => { setMode(m); setErr('') }} style={{
              flex: 1, padding: '8px', borderRadius: 7, border: 'none', fontWeight: 600, fontSize: 14,
              background: mode === m ? 'white' : 'transparent',
              color: mode === m ? 'var(--primary)' : 'var(--text3)',
              boxShadow: mode === m ? 'var(--shadow)' : 'none',
              transition: 'all .15s'
            }}>{l}</button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div>
              <label className="label">Имя</label>
              <input className="input" placeholder="Иван Иванов" value={form.name} onChange={set('name')} required />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
          </div>
          <div>
            <label className="label">Пароль</label>
            <input className="input" type="password" placeholder={mode === 'register' ? 'Минимум 6 символов' : '••••••••'} value={form.password} onChange={set('password')} required minLength={6} />
          </div>
          {err && <div style={{ background: 'var(--danger-light)', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--danger)' }}>{err}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 13, fontSize: 15, marginTop: 4 }} disabled={loading}>
            {loading ? '⏳ Загрузка...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 18 }}>
          Данные защищены · Supabase Auth
        </p>
      </div>
    </div>
  )
}
