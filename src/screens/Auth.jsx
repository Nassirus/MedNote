import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

// ── Defined OUTSIDE Auth to prevent re-render focus loss ──────────────
function PwInput({ id, value, show, onToggle, placeholder, onChange, label, autoComplete }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          className="input"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete || 'current-password'}
          required
          minLength={6}
          style={{ paddingRight: 44 }}
        />
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); onToggle() }}
          tabIndex={-1}
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 17, color: 'var(--text3)', padding: 3, lineHeight: 1
          }}
        >
          {show ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  )
}

const ERROR_MAP = {
  'auth/configuration-not-found': '⚙️ Firebase не настроен. Добавьте VITE_FIREBASE_* в Vercel → Environment Variables и нажмите Redeploy.',
  'auth/invalid-api-key':         '⚙️ Неверный VITE_FIREBASE_API_KEY.',
  'auth/user-not-found':          'Пользователь с таким email не найден.',
  'auth/wrong-password':          'Неверный пароль.',
  'auth/invalid-credential':      'Неверный email или пароль.',
  'auth/email-already-in-use':    'Этот email уже зарегистрирован. Попробуйте войти.',
  'auth/weak-password':           'Пароль слишком простой — минимум 6 символов.',
  'auth/invalid-email':           'Некорректный формат email.',
  'auth/too-many-requests':       'Слишком много попыток. Подождите несколько минут.',
  'auth/network-request-failed':  'Ошибка сети. Проверьте подключение к интернету.',
  'auth/operation-not-allowed':   '⚙️ Вход по email не включён. Firebase Console → Authentication → Sign-in method → Email/Password → Enable.',
}
function friendlyError(code) {
  for (const [k, v] of Object.entries(ERROR_MAP)) {
    if (code?.includes(k)) return v
  }
  return code || 'Произошла ошибка. Попробуйте ещё раз.'
}
// ─────────────────────────────────────────────────────────────────────

export default function Auth({ onOpenLegal }) {
  const { login, register } = useAuth()
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [name, setName]         = useState('')
  const [agreed1, setAgreed1]   = useState(false)
  const [agreed2, setAgreed2]   = useState(false)
  const [showPw, setShowPw]     = useState(false)
  const [showCf, setShowCf]     = useState(false)
  const [err, setErr]           = useState('')
  const [loading, setLoading]   = useState(false)

  const allAgreed = agreed1 && agreed2
  const pwMatch   = password === confirm

  function switchMode(m) {
    setMode(m); setErr('')
    setPassword(''); setConfirm('')
    setAgreed1(false); setAgreed2(false)
    setShowPw(false); setShowCf(false)
  }

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (mode === 'register') {
      if (!name.trim())          { setErr('Введите ваше имя'); return }
      if (!allAgreed)            { setErr('Необходимо принять оба соглашения'); return }
      if (!pwMatch)              { setErr('Пароли не совпадают'); return }
      if (password.length < 6)  { setErr('Пароль должен содержать минимум 6 символов'); return }
    }
    setLoading(true)
    try {
      if (mode === 'login') await login(email, password)
      else                  await register(email, password, name)
    } catch (e) {
      setErr(friendlyError(e.code || e.message))
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg,#EFF6FF 0%,#F0FDFA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="auth-card">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ display: 'inline-flex', marginBottom: 12 }}>
            <Logo size={56} />
          </div>
          <h1 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: -0.5 }}>MedSchedule</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>AI-помощник по назначениям врача</p>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 10, padding: 4, marginBottom: 22 }}>
          {[['login','Войти'],['register','Регистрация']].map(([m,l]) => (
            <button key={m} onClick={() => switchMode(m)} style={{
              flex: 1, padding: '8px', borderRadius: 7, border: 'none', fontWeight: 600, fontSize: 14,
              background: mode === m ? 'white' : 'transparent',
              color: mode === m ? 'var(--primary)' : 'var(--text3)',
              boxShadow: mode === m ? 'var(--shadow)' : 'none', transition: 'all .15s'
            }}>{l}</button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div>
              <label className="label" htmlFor="auth-name">Ваше имя</label>
              <input id="auth-name" className="input" placeholder="Иван Иванов"
                value={name} onChange={e => { setName(e.target.value); setErr('') }}
                autoComplete="name" />
            </div>
          )}

          <div>
            <label className="label" htmlFor="auth-email">Email</label>
            <input id="auth-email" className="input" type="email" placeholder="you@example.com"
              value={email} onChange={e => { setEmail(e.target.value); setErr('') }}
              autoComplete="email" required />
          </div>

          <PwInput
            id="auth-password"
            value={password}
            show={showPw}
            onToggle={() => setShowPw(p => !p)}
            label="Пароль"
            placeholder={mode === 'register' ? 'Минимум 6 символов' : '••••••••'}
            onChange={e => { setPassword(e.target.value); setErr('') }}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />

          {mode === 'register' && (
            <>
              <PwInput
                id="auth-confirm"
                value={confirm}
                show={showCf}
                onToggle={() => setShowCf(p => !p)}
                label="Повторите пароль"
                placeholder="Введите пароль ещё раз"
                onChange={e => { setConfirm(e.target.value); setErr('') }}
                autoComplete="new-password"
              />
              {confirm && (
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: -8,
                  color: pwMatch ? 'var(--success)' : 'var(--danger)' }}>
                  {pwMatch ? '✓ Пароли совпадают' : '✗ Пароли не совпадают'}
                </div>
              )}

              {/* Agreements */}
              <div style={{ padding: 14, background: 'var(--surface2)', borderRadius: 10,
                border: `1px solid ${err && !allAgreed ? 'var(--danger)' : 'var(--border)'}`,
                display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Соглашения</div>

                <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={agreed1}
                    onChange={e => { setAgreed1(e.target.checked); setErr('') }}
                    style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                    Принимаю{' '}
                    <a href="#" onClick={e => { e.preventDefault(); onOpenLegal('terms') }}
                      style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Условия использования</a>
                    {' '}и{' '}
                    <a href="#" onClick={e => { e.preventDefault(); onOpenLegal('privacy') }}
                      style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Политику конфиденциальности</a>.
                    Понимаю, что сервис не заменяет врача.
                  </span>
                </label>

                <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={agreed2}
                    onChange={e => { setAgreed2(e.target.checked); setErr('') }}
                    style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                    Даю согласие на{' '}
                    <a href="#" onClick={e => { e.preventDefault(); onOpenLegal('dataprocessing') }}
                      style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>обработку персональных данных</a>
                    {' '}(Закон РК № 94-V).
                  </span>
                </label>

                <div style={{ padding: '8px 10px', background: 'var(--warning-light)', borderRadius: 8, border: '1px solid #FDE68A' }}>
                  <p style={{ fontSize: 11, color: '#92400E', lineHeight: 1.5 }}>
                    ⚠️ <strong>Важно:</strong> MedSchedule — вспомогательный инструмент. Все медицинские решения принимает только врач.
                  </p>
                </div>
              </div>
            </>
          )}

          {err && (
            <div style={{ background: 'var(--danger-light)', border: '1px solid #FECACA', borderRadius: 8,
              padding: '10px 12px', fontSize: 13, color: 'var(--danger)', lineHeight: 1.5 }}>
              {err}
            </div>
          )}

          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', padding: 13, fontSize: 15,
              opacity: mode === 'register' && !allAgreed ? 0.55 : 1 }}
            disabled={loading || (mode === 'register' && !allAgreed)}>
            {loading ? '⏳ Загрузка...' : mode === 'login' ? 'Войти →' : 'Создать аккаунт →'}
          </button>
        </form>

        {/* Footer links */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          {[['terms','📋 Условия'],['privacy','🔒 Конфиденциальность'],['dataprocessing','✍️ Данные']].map(([doc,label]) => (
            <button key={doc} onClick={() => onOpenLegal(doc)}
              style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--text3)', textDecoration: 'underline', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
          🔒 Firebase Auth · 🇰🇿 Закон РК № 94-V · 🤖 Gemini AI
        </p>
      </div>
    </div>
  )
}
