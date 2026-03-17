import { NAV_ITEMS } from '../constants'
import { useAuth } from '../context/AuthContext'

export default function Layout({ active, onChange, children }) {
  const { profile, logout } = useAuth()
  const name = profile?.name || 'Пользователь'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="app-shell">
      {/* ── Sidebar (desktop) ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💊</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: -0.3 }}>MedSchedule</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>AI Medical Assistant</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => onChange(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 8, border: 'none', width: '100%', textAlign: 'left',
              background: active === item.id ? 'var(--primary-light)' : 'transparent',
              color: active === item.id ? 'var(--primary)' : 'var(--text2)',
              fontWeight: active === item.id ? 600 : 400, fontSize: 14,
              transition: 'all .12s'
            }}>
              <span style={{ fontSize: 17 }}>{item.icon}</span>
              {item.label}
              {active === item.id && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)' }} />}
            </button>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--primary)', flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email || ''}</div>
            </div>
            <button onClick={logout} title="Выйти" style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 16, padding: 4, borderRadius: 6 }}>↩</button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-area">
        {children}
      </div>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="bottom-nav" style={{ display: 'flex', height: 'var(--nav-h)' }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => onChange(item.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 3, background: 'none', border: 'none', padding: '6px 0'
          }}>
            <span style={{ fontSize: 21 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: active === item.id ? 'var(--primary)' : 'var(--text3)' }}>{item.label}</span>
            {active === item.id && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--primary)' }} />}
          </button>
        ))}
      </nav>
    </div>
  )
}
