import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function Auth({ onOpenLegal }) {
  const { login, register } = useAuth()
  const [mode, setMode]       = useState('login')
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' })
  const [agreed1, setAgreed1] = useState(false)
  const [agreed2, setAgreed2] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [showCf, setShowCf]   = useState(false)
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)

  const allAgreed = agreed1 && agreed2

  function set(k) { return e => { setForm(p => ({ ...p, [k]: e.target.value })); setErr('') } }

  function friendlyError(code) {
    const map = {
      'auth/configuration-not-found': '⚙️ Firebase не настроен. Убедитесь что переменные VITE_FIREBASE_* добавлены в Vercel → Settings → Environment Variables и нажат Redeploy.',
      'auth/invalid-api-key':         '⚙️ Неверный VITE_FIREBASE_API_KEY.',
      'auth/user-not-found':          'Пользователь с таким email не найден.',
      'auth/wrong-password':          'Неверный пароль.',
      'auth/invalid-credential':      'Неверный email или пароль.',
      'auth/email-already-in-use':    'Этот email уже зарегистрирован. Войдите или восстановите пароль.',
      'auth/weak-password':           'Пароль слишком простой. Минимум 6 символов.',
      'auth/invalid-email':           'Некорректный формат email.',
      'auth/too-many-requests':       'Слишком много попыток. Подождите несколько минут.',
      'auth/network-request-failed':  'Ошибка сети. Проверьте подключение к интернету.',
      'auth/operation-not-allowed':   '⚙️ Вход по email не включён. Firebase Console → Authentication → Sign-in method → Email/Password → Enable.',
    }
    for (const [k, v] of Object.entries(map)) {
      if (code?.includes(k)) return v
    }
    return code || 'Произошла ошибка. Попробуйте ещё раз.'
  }

  async function submit(e) {
    e.preventDefault()
    setErr('')

    if (mode === 'register') {
      if (!form.name.trim())             { setErr('Введите ваше имя'); return }
      if (!allAgreed)                    { setErr('Необходимо принять оба соглашения'); return }
      if (form.password !== form.confirm){ setErr('Пароли не совпадают. Проверьте и попробуйте снова.'); return }
      if (form.password.length < 6)      { setErr('Пароль должен содержать минимум 6 символов'); return }
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register(form.email, form.password, form.name)
      }
    } catch (e) {
      setErr(friendlyError(e.code || e.message))
    }
    setLoading(false)
  }

  function switchMode(m) {
    setMode(m); setErr(''); setAgreed1(false); setAgreed2(false)
    setForm({ name: '', email: form.email, password: '', confirm: '' })
    setShowPw(false); setShowCf(false)
  }

  function LegalLink({ doc, children }) {
    return (
      <a href="#" onClick={ev => { ev.preventDefault(); onOpenLegal(doc) }}
        style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
        {children}
      </a>
    )
  }

  function PwInput({ id, value, show, onToggle, placeholder, onChange, label, minLength }) {
    return (
      <div>
        <label className="label">{label}</label>
        <div style={{ position: 'relative' }}>
          <input id={id} className="input" type={show ? 'text' : 'password'}
            value={value} onChange={onChange} placeholder={placeholder}
            required minLength={minLength || 6}
            style={{ paddingRight: 42 }} />
          <button type="button" onClick={onToggle} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
            color: 'var(--text3)', padding: 2
          }}>{show ? '🙈' : '👁️'}</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg,#EFF6FF 0%,#F0FDFA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="auth-card">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Logo size={56} />
          </div>
          <h1 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: -0.5 }}>MedSchedule</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>AI-помощник по назначениям врача</p>
        </div>

        {/* Tabs */}
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
              <label className="label">Ваше имя</label>
              <input className="input" placeholder="Иван Иванов" value={form.name} onChange={set('name')} />
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
          </div>

          <PwInput id="pw" value={form.password} show={showPw} onToggle={() => setShowPw(p => !p)}
            label="Пароль" placeholder={mode === 'register' ? 'Минимум 6 символов' : '••••••••'}
            onChange={set('password')} />

          {mode === 'register' && (
            <PwInput id="cf" value={form.confirm} show={showCf} onToggle={() => setShowCf(p => !p)}
              label="Повторите пароль" placeholder="Введите пароль ещё раз"
              onChange={set('confirm')} />
          )}

          {/* Password match indicator */}
          {mode === 'register' && form.confirm && (
            <div style={{ fontSize: 12, fontWeight: 600, color: form.password === form.confirm ? 'var(--success)' : 'var(--danger)', marginTop: -8 }}>
              {form.password === form.confirm ? '✓ Пароли совпадают' : '✗ Пароли не совпадают'}
            </div>
          )}

          {/* Agreements */}
          {mode === 'register' && (
            <div style={{ padding: 14, background: 'var(--surface2)', borderRadius: 10, border: `1px solid ${err && !allAgreed ? 'var(--danger)' : 'var(--border)'}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Соглашения</div>

              <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
                <input type="checkbox" checked={agreed1} onChange={e => { setAgreed1(e.target.checked); setErr('') }}
                  style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--primary)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                  Принимаю <LegalLink doc="terms">Условия использования</LegalLink> и <LegalLink doc="privacy">Политику конфиденциальности</LegalLink>. Понимаю, что сервис не заменяет врача.
                </span>
              </label>

              <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
                <input type="checkbox" checked={agreed2} onChange={e => { setAgreed2(e.target.checked); setErr('') }}
                  style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--primary)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                  Даю согласие на <LegalLink doc="dataprocessing">обработку персональных данных</LegalLink> (Закон РК № 94-V).
                </span>
              </label>

              <div style={{ padding: '8px 10px', background: 'var(--warning-light)', borderRadius: 8, border: '1px solid #FDE68A' }}>
                <p style={{ fontSize: 11, color: '#92400E', lineHeight: 1.5 }}>⚠️ <strong>Важно:</strong> MedSchedule — вспомогательный инструмент. Все решения принимает только лечащий врач.</p>
              </div>
            </div>
          )}

          {err && (
            <div style={{ background: 'var(--danger-light)', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--danger)', lineHeight: 1.5 }}>
              {err}
            </div>
          )}

          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', padding: 13, fontSize: 15, opacity: (mode === 'register' && !allAgreed) ? 0.55 : 1 }}
            disabled={loading || (mode === 'register' && !allAgreed)}>
            {loading ? '⏳ Загрузка...' : mode === 'login' ? 'Войти →' : 'Создать аккаунт →'}
          </button>
        </form>

        {/* Legal footer links */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          {[['terms','📋 Условия'],['privacy','🔒 Конфиденциальность'],['dataprocessing','✍️ Данные']].map(([doc,label]) => (
            <button key={doc} onClick={() => onOpenLegal(doc)} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--text3)', textDecoration: 'underline', cursor: 'pointer' }}>{label}</button>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
          🔒 Firebase Auth · 🇰🇿 Закон РК № 94-V · 🤖 Gemini AI
        </p>
      </div>
    </div>
  )
}
