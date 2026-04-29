import { NAV_ITEMS } from '../constants'
import NavIcon from './NavIcon'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'

export default function Layout({ active, onChange, children }) {
  const { profile, logout } = useAuth()
  const name     = profile?.name || 'Пользователь'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()

  return (
    <>
      <div className="app-shell">

        {/* ═══ SIDEBAR (desktop ≥768px) ═══ */}
        <aside className="sidebar">

          {/* Logo */}
          <div style={{ padding:'20px 20px 16px', flexShrink:0, borderBottom:'1px solid var(--border)', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:11 }}>
              <Logo size={38}/>
              <div>
                <div style={{ fontWeight:800, fontSize:17, color:'var(--text)', letterSpacing:-0.4 }}>
                  MedNOTE
                </div>
                <div style={{ fontSize:10, color:'var(--text3)', letterSpacing:0.3 }}>
                  AI Medical Assistant
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ flex:1, padding:'4px 12px',
            display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>

            {/* Section label */}
            <div style={{ fontSize:9, fontWeight:700, color:'var(--text3)',
              letterSpacing:1.2, textTransform:'uppercase', padding:'10px 8px 6px' }}>
              Меню
            </div>

            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => onChange(item.id)} style={{
                display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
                borderRadius:10, border:'none', width:'100%', textAlign:'left',
                background: active===item.id
                  ? 'linear-gradient(135deg,var(--primary-light),rgba(37,99,235,.08))'
                  : 'transparent',
                color: active===item.id ? 'var(--primary)' : 'var(--text2)',
                fontWeight: active===item.id ? 700 : 500,
                fontSize:14, transition:'all .12s', cursor:'pointer',
                borderLeft: active===item.id
                  ? '3px solid var(--primary)'
                  : '3px solid transparent',
              }}>
                <NavIcon name={item.iconName} size={19} color={active===item.id ? 'var(--primary)' : 'var(--text3)' } strokeWidth={active===item.id ? 2.2 : 1.8}/>
                <span style={{ flex:1 }}>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* App version */}
          <div style={{ padding:'8px 20px 0', flexShrink:0 }}>
            <div style={{ fontSize:10, color:'var(--text3)', textAlign:'center', opacity:.6 }}>
              MedNOTE v2.0 · AI Medical Assistant
            </div>
          </div>

          {/* User card at bottom */}
          <div style={{ padding:'12px 16px 16px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10,
              padding:'10px 12px', borderRadius:12,
              background:'var(--surface2)', border:'1px solid var(--border)' }}>
              <div style={{ width:36, height:36, borderRadius:'50%',
                background:'var(--primary-light)', display:'flex', alignItems:'center',
                justifyContent:'center', fontWeight:700, fontSize:13,
                color:'var(--primary)', flexShrink:0 }}>
                {initials}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {name}
                </div>
                <div style={{ fontSize:10, color:'var(--text3)',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {profile?.email || ''}
                </div>
              </div>
              <button onClick={logout} title="Выйти"
                style={{ background:'none', border:'none', color:'var(--text3)',
                  fontSize:16, padding:4, cursor:'pointer', flexShrink:0,
                  borderRadius:6, transition:'color .12s' }}
                onMouseEnter={e=>e.currentTarget.style.color='var(--danger)'}
                onMouseLeave={e=>e.currentTarget.style.color='var(--text3)'}>
                ↩
              </button>
            </div>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="main-area">
          {children}
        </div>
      </div>

      {/* ═══ BOTTOM NAV (mobile <768px) ═══ */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => onChange(item.id)} style={{
            flex:1, display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', gap:2, background:'none', border:'none',
            padding:'6px 0', minHeight:54, cursor:'pointer',
            color: active===item.id ? 'var(--primary)' : 'var(--text3)',
            position:'relative',
          }}>
            {active===item.id && (
              <div style={{ position:'absolute', top:0, left:'50%',
                transform:'translateX(-50%)', width:32, height:3,
                borderRadius:'0 0 4px 4px', background:'var(--primary)' }}/>
            )}
            <NavIcon name={item.iconName} size={22} color={active===item.id ? 'var(--primary)' : 'var(--text3)'} strokeWidth={active===item.id ? 2.2 : 1.8}/>
            <span style={{ fontSize:10, fontWeight: active===item.id ? 700 : 500 }}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </>
  )
}
