import { useAuth } from '../../context/AuthContext'
import { getRoleLabel } from '../../lib/roles'
import { generateQRSVG } from '../../lib/qrUtils'

export default function DoctorProfile() {
  const { user, profile, logout } = useAuth()

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div className="page-header">
        <h1 style={{fontWeight:700,fontSize:18}}>Мой профиль</h1>
        <button onClick={logout} className="btn btn-ghost" style={{fontSize:13}}>Выйти ↩</button>
      </div>

      <div className="page-content" style={{display:'flex',flexDirection:'column',gap:14}}>

        {/* Doctor card */}
        <div style={{background:'linear-gradient(135deg,#1E3A5F,#1D4ED8)',
          borderRadius:16,padding:'20px',color:'white'}}>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
            <div style={{width:56,height:56,borderRadius:'50%',
              background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',
              justifyContent:'center',fontWeight:800,fontSize:22,flexShrink:0}}>
              {profile?.name?.charAt(0)||'?'}
            </div>
            <div>
              <div style={{fontWeight:800,fontSize:17}}>{profile?.name}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,.7)',marginTop:2}}>
                {profile?.speciality||'Специалист'}
              </div>
              <div style={{fontSize:10,color:'rgba(255,255,255,.5)',marginTop:2}}>
                {getRoleLabel(profile?.role)}
              </div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[
              ['🏥',profile?.clinic_name||'—','Клиника'],
              ['📧',profile?.email||'—','Email'],
            ].map(([ic,v,l])=>(
              <div key={l} style={{background:'rgba(255,255,255,.1)',
                borderRadius:10,padding:'10px 12px'}}>
                <div style={{fontSize:9,color:'rgba(255,255,255,.5)',
                  textTransform:'uppercase',letterSpacing:.4,marginBottom:3}}>{l}</div>
                <div style={{fontSize:12,fontWeight:600,overflow:'hidden',
                  textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ic} {v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinic ID */}
        <div style={{background:'white',borderRadius:14,padding:'14px 16px',
          border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>🏥 Партнёрская клиника</div>
          <div style={{fontSize:13,color:'var(--text2)',marginBottom:4}}>{profile?.clinic_name}</div>
          <div style={{fontSize:11,color:'var(--text3)',background:'var(--surface2)',
            padding:'6px 10px',borderRadius:8,fontFamily:'monospace'}}>
            ID: {profile?.clinic_id||'—'}
          </div>
        </div>

        {/* About */}
        <div style={{background:'var(--surface2)',borderRadius:14,
          padding:'14px 16px',border:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>ℹ️ О враче кабинете MedNOTE</div>
          {[
            ['👥','Пациенты','Добавляйте пациентов по QR-коду или вручную. Пациенты с аккаунтом MedNOTE получат назначения в своё расписание автоматически.'],
            ['📅','Расписание','Ведите календарь приёмов. Приёмы появляются у пациентов с аккаунтом MedNOTE.'],
            ['💊','Назначения','Добавляйте назначения вручную или через ИИ-анализ фото выписки.'],
          ].map(([ic,title,desc])=>(
            <div key={title} style={{display:'flex',gap:12,marginBottom:12,alignItems:'flex-start'}}>
              <span style={{fontSize:20,flexShrink:0}}>{ic}</span>
              <div>
                <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{title}</div>
                <div style={{fontSize:12,color:'var(--text3)',lineHeight:1.6}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{textAlign:'center',fontSize:11,color:'var(--text3)'}}>
          MedNOTE Врачебный кабинет · v2.0
        </p>
      </div>
    </div>
  )
}
