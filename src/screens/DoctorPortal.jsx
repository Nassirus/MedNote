import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  collection, query, where, getDocs, addDoc,
  doc, getDoc, onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { analyzeWithGemini } from '../lib/geminiClient'
import { parseQRData, getPatientQRUrl } from '../lib/qrUtils'
import { format, addDays } from 'date-fns'

// ── Stat card ─────────────────────────────────────────────
function Stat({ icon, value, label, color='var(--primary)' }) {
  return (
    <div style={{ background:'white', borderRadius:12, padding:'12px 10px',
      border:'1px solid var(--border)', textAlign:'center', flex:1 }}>
      <div style={{ fontSize:20, marginBottom:3 }}>{icon}</div>
      <div style={{ fontSize:20, fontWeight:900, color }}>{value}</div>
      <div style={{ fontSize:10, color:'var(--text3)', marginTop:1 }}>{label}</div>
    </div>
  )
}

// ── QR Scanner using BarcodeDetector / jsQR fallback ──────
function QRScanner({ onResult, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [err, setErr] = useState('')
  const [scanning, setScanning] = useState(false)
  const streamRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  async function startCamera() {
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width:{ ideal:1280 }, height:{ ideal:720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        rafRef.current = requestAnimationFrame(tick)
      }
    } catch (e) {
      setErr('Нет доступа к камере. Разрешите доступ в настройках браузера.')
      setScanning(false)
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  async function tick() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick); return
    }
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    try {
      // Try BarcodeDetector API (Chrome/Edge)
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        const barcodes = await detector.detect(canvas)
        if (barcodes.length > 0) {
          stopCamera()
          onResult(barcodes[0].rawValue)
          return
        }
      } else {
        // Fallback: load jsQR dynamically
        if (!window._jsQR) {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
          script.onload = () => { window._jsQR = window.jsQR }
          document.head.appendChild(script)
        }
        if (window._jsQR) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = window._jsQR(imageData.data, imageData.width, imageData.height)
          if (code?.data) {
            stopCamera()
            onResult(code.data)
            return
          }
        }
      }
    } catch {}

    rafRef.current = requestAnimationFrame(tick)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.9)',
      zIndex:1000, display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', padding:20 }}>
      <div style={{ color:'white', fontWeight:700, fontSize:16, marginBottom:16 }}>
        📷 Сканирование QR-кода пациента
      </div>
      {err ? (
        <div style={{ color:'#FCA5A5', fontSize:13, textAlign:'center', marginBottom:16 }}>{err}</div>
      ) : (
        <div style={{ position:'relative', width:280, height:280, borderRadius:16, overflow:'hidden',
          border:'3px solid #02C39A' }}>
          <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }}
            playsInline muted />
          {/* Scan overlay */}
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
            justifyContent:'center', pointerEvents:'none' }}>
            <div style={{ width:180, height:180, border:'2px solid #02C39A',
              borderRadius:8, boxShadow:'0 0 0 1000px rgba(0,0,0,.4)' }}/>
          </div>
          <canvas ref={canvasRef} style={{ display:'none' }}/>
        </div>
      )}
      <div style={{ color:'rgba(255,255,255,.6)', fontSize:12, marginTop:12, textAlign:'center' }}>
        Наведите камеру на QR-код из приложения пациента
      </div>
      <button onClick={() => { stopCamera(); onClose() }} style={{
        marginTop:20, padding:'11px 28px', borderRadius:12, border:'none',
        background:'rgba(255,255,255,.15)', color:'white', fontWeight:700,
        fontSize:14, cursor:'pointer'
      }}>Отмена</button>
    </div>
  )
}

// ── Add Prescription Form ─────────────────────────────────
function PrescriptionForm({ patientUid, patientName, onSuccess, onCancel }) {
  const [mode, setMode]   = useState('manual')
  const [file, setFile]   = useState(null)
  const [items, setItems] = useState([{
    type:'medication', title:'', dose:'', times_per_day:1,
    first_time:'08:00', duration_days:7, notes:''
  }])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const TYPES = [
    {v:'medication',l:'💊 Лекарство'},{v:'exercise',l:'🏃 Упражнение'},
    {v:'procedure',l:'🩺 Процедура'},{v:'appointment',l:'📅 Визит'},
    {v:'restriction',l:'⚠️ Ограничение'},{v:'nutrition',l:'🥗 Питание'},
  ]

  function upd(i, f, v) { setItems(p => p.map((it,idx)=>idx===i?{...it,[f]:v}:it)) }

  async function analyzePhoto() {
    if (!file) return
    setLoading(true); setErr('')
    try {
      const b64 = await new Promise((res,rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })
      const parsed = await analyzeWithGemini({ imageBase64:b64, mimeType:file.type||'image/jpeg' })
      if (parsed.length) {
        setItems(parsed.map(p=>({
          type:p.type||'medication', title:p.title||'', dose:p.dose||'',
          times_per_day:p.times_per_day||1, first_time:p.time_slots?.[0]||'08:00',
          duration_days:p.duration_days||7, notes:p.notes||''
        })))
        setMode('manual')
      } else { setErr('ИИ не нашёл назначений. Введите вручную.') }
    } catch(e) { setErr(e.message) }
    setLoading(false)
  }

  async function save() {
    const valid = items.filter(i => i.title.trim())
    if (!valid.length) { setErr('Введите хотя бы одно назначение'); return }
    setLoading(true); setErr('')
    try {
      const startDate = new Date()
      for (const item of valid) {
        const days  = item.duration_days || 1
        const n     = Math.min(3, item.times_per_day || 1)
        const slotPresets = {1:['08:00'],2:['08:00','20:00'],3:['08:00','14:00','20:00']}
        const slots = slotPresets[n] || [item.first_time||'08:00']
        for (let d = 0; d < days; d++) {
          const dateStr = format(addDays(startDate,d), 'yyyy-MM-dd')
          for (const t of slots) {
            await addDoc(collection(db,'schedule_items'), {
              user_id:    patientUid,
              type:       item.type,
              title:      item.title.trim(),
              time:       t, endTime:null,
              notes:      [item.notes, item.dose].filter(Boolean).join(' · ') || '',
              freq:       'Разово',
              date:       dateStr,
              color:      null, done:false,
              added_by:   'doctor',
              created_at: serverTimestamp(),
            })
          }
        }
      }
      onSuccess(valid.length)
    } catch(e) { setErr('Ошибка: '+e.message) }
    setLoading(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={onCancel} style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text3)',padding:0 }}>←</button>
        <div>
          <div style={{ fontWeight:700, fontSize:14 }}>Новые назначения</div>
          <div style={{ fontSize:11, color:'var(--text3)' }}>для {patientName}</div>
        </div>
      </div>

      {/* Mode */}
      <div style={{ display:'flex', gap:6 }}>
        {[['manual','✏️ Вручную'],['photo','📷 Фото выписки']].map(([m,l])=>(
          <button key={m} onClick={()=>setMode(m)} style={{
            flex:1, padding:'9px', borderRadius:10, cursor:'pointer',
            border:`1.5px solid ${mode===m?'var(--primary)':'var(--border)'}`,
            background:mode===m?'var(--primary-light)':'white',
            color:mode===m?'var(--primary)':'var(--text3)', fontWeight:700, fontSize:12
          }}>{l}</button>
        ))}
      </div>

      {mode==='photo' && (
        <div>
          <input type="file" accept="image/*" id="rx-photo" style={{display:'none'}}
            onChange={e=>setFile(e.target.files[0])}/>
          <label htmlFor="rx-photo" style={{
            display:'block', padding:18, borderRadius:12, cursor:'pointer',
            border:'2px dashed var(--border)', background:'var(--surface2)',
            textAlign:'center', fontSize:13, color:'var(--text3)'
          }}>{file?`📎 ${file.name}`:'📷 Выбрать фото выписки'}</label>
          {file&&<button onClick={analyzePhoto} disabled={loading} style={{
            width:'100%', marginTop:8, padding:'11px', borderRadius:10, border:'none',
            background:loading?'var(--surface2)':'var(--primary)',
            color:loading?'var(--text3)':'white', fontWeight:700, fontSize:13, cursor:'pointer'
          }}>{loading?'⏳ ИИ анализирует...':'🤖 Анализировать'}</button>}
        </div>
      )}

      {mode==='manual' && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {items.map((item,i)=>(
            <div key={i} style={{background:'var(--surface2)',borderRadius:12,padding:'12px',border:'1px solid var(--border)'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:11,fontWeight:700,color:'var(--text3)'}}>Назначение {i+1}</span>
                {items.length>1&&<button onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))}
                  style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:13}}>✕</button>}
              </div>
              <select value={item.type} onChange={e=>upd(i,'type',e.target.value)}
                className="input" style={{marginBottom:8,fontSize:12}}>
                {TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
              <input className="input" placeholder="Название" value={item.title}
                onChange={e=>upd(i,'title',e.target.value)} style={{marginBottom:8,fontSize:13}}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                <input className="input" placeholder="Дозировка" value={item.dose}
                  onChange={e=>upd(i,'dose',e.target.value)} style={{fontSize:12}}/>
                <input type="number" className="input" placeholder="Дней" min={1} max={365}
                  value={item.duration_days||''} onChange={e=>upd(i,'duration_days',parseInt(e.target.value)||null)}
                  style={{fontSize:12}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                <div>
                  <div style={{fontSize:10,color:'var(--text3)',marginBottom:3}}>Раз в день</div>
                  <div style={{display:'flex',gap:4}}>
                    {[1,2,3].map(n=><button key={n} onClick={()=>upd(i,'times_per_day',n)} style={{
                      flex:1, padding:'6px 0', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:700,
                      background:item.times_per_day===n?'var(--primary)':'var(--surface2)',
                      color:item.times_per_day===n?'white':'var(--text3)'
                    }}>{n}×</button>)}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:10,color:'var(--text3)',marginBottom:3}}>Первый приём</div>
                  <input type="time" className="input" value={item.first_time}
                    onChange={e=>upd(i,'first_time',e.target.value)} style={{fontSize:12}}/>
                </div>
              </div>
              <input className="input" placeholder="Примечание" value={item.notes}
                onChange={e=>upd(i,'notes',e.target.value)} style={{fontSize:12}}/>
            </div>
          ))}
          <button onClick={()=>setItems(p=>[...p,{type:'medication',title:'',dose:'',times_per_day:1,first_time:'08:00',duration_days:7,notes:''}])}
            style={{width:'100%',padding:'9px',borderRadius:10,border:'1.5px dashed var(--border)',
              background:'transparent',color:'var(--primary)',fontWeight:700,fontSize:13,cursor:'pointer'}}>
            + Добавить назначение
          </button>
        </div>
      )}

      {err&&<div style={{padding:'9px 12px',borderRadius:9,fontSize:12,
        background:'var(--danger-light)',border:'1px solid #FECACA',color:'var(--danger)'}}>❌ {err}</div>}

      <button onClick={save} disabled={loading} style={{
        width:'100%',padding:'13px',borderRadius:12,border:'none',
        background:loading?'var(--surface2)':'var(--primary)',
        color:loading?'var(--text3)':'white',fontWeight:800,fontSize:14,cursor:loading?'default':'pointer'
      }}>{loading?'⏳ Сохранение...':`💾 Сохранить назначения`}</button>
    </div>
  )
}

// ── Main Doctor Portal ────────────────────────────────────
export default function DoctorPortal({ onBack }) {
  const { user, profile } = useAuth()
  const [view, setView] = useState('list') // list | prescribe | monitor
  const [patients, setPatients] = useState([])
  const [selected, setSelected] = useState(null)
  const [patientItems, setPatientItems] = useState([])
  const [showQR, setShowQR] = useState(false)
  const [linkErr, setLinkErr] = useState('')
  const [linkSuccess, setLinkSuccess] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)

  // Load linked patients
  useEffect(() => {
    if (!user) return
    const q = query(collection(db,'doctor_patients'), where('doctor_uid','==',user.uid))
    const unsub = onSnapshot(q, async snap => {
      const list = await Promise.all(snap.docs.map(async d => {
        const data = d.data()
        const today = format(new Date(),'yyyy-MM-dd')
        const iq = query(collection(db,'schedule_items'), where('user_id','==',data.patient_uid))
        const iSnap = await getDocs(iq)
        const items = iSnap.docs.map(d=>d.data())
        const todayItems = items.filter(i=>i.date===today)
        const done = todayItems.filter(i=>i.done).length
        const adherence = todayItems.length>0 ? Math.round(done/todayItems.length*100) : null
        return { ...data, id:d.id, itemCount:items.length, adherence, todayTotal:todayItems.length }
      }))
      setPatients(list)
    })
    return unsub
  }, [user])

  // Load selected patient's items
  useEffect(() => {
    if (!selected) return
    const q = query(collection(db,'schedule_items'), where('user_id','==',selected.patient_uid))
    const unsub = onSnapshot(q, snap => {
      const today = format(new Date(),'yyyy-MM-dd')
      const items = snap.docs.map(d=>({id:d.id,...d.data()}))
        .filter(i=>i.date>=today||!i.date)
        .sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||''))
      setPatientItems(items.slice(0,20))
    })
    return unsub
  }, [selected])

  async function handleQRResult(text) {
    setShowQR(false)
    setLinkErr(''); setLinkLoading(true)
    const parsed = parseQRData(text)
    if (!parsed) {
      setLinkErr('Неверный QR-код. Убедитесь что пациент показывает QR из MedNOTE.')
      setLinkLoading(false); return
    }
    const uid = parsed.uid
    // Check already linked
    if (patients.find(p=>p.patient_uid===uid)) {
      setLinkErr('Этот пациент уже добавлен.')
      setLinkLoading(false); return
    }
    try {
      // Get patient profile
      const pSnap = await getDoc(doc(db,'profiles',uid))
      if (!pSnap.exists()) {
        setLinkErr('Профиль пациента не найден.'); setLinkLoading(false); return
      }
      const pData = pSnap.data()
      await addDoc(collection(db,'doctor_patients'), {
        doctor_uid:   user.uid,
        doctor_name:  profile?.name || user.email,
        patient_uid:  uid,
        patient_name: pData.name,
        email:        pData.email || '',
        clinic_name:  profile?.clinic_name || '',
        linked_at:    serverTimestamp(),
      })
      setLinkSuccess(`✅ ${pData.name} успешно добавлен!`)
      setTimeout(()=>setLinkSuccess(''), 4000)
    } catch(e) { setLinkErr('Ошибка: '+e.message) }
    setLinkLoading(false)
  }

  function selectPatient(p) {
    setSelected(p)
    setView('monitor')
  }

  function onPrescriptionSuccess(count) {
    setLinkSuccess(`✅ ${count} назначений добавлено в календарь ${selected?.patient_name}`)
    setTimeout(()=>setLinkSuccess(''),4000)
    setView('monitor')
  }

  const avgAdherence = patients.filter(p=>p.adherence!==null).length > 0
    ? Math.round(patients.reduce((s,p)=>s+(p.adherence||0),0)/patients.filter(p=>p.adherence!==null).length)
    : null
  const low = patients.filter(p=>p.adherence!==null&&p.adherence<50).length

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>

      {showQR && <QRScanner onResult={handleQRResult} onClose={()=>setShowQR(false)}/>}

      {/* Header */}
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={view!=='list'?()=>setView('list'):onBack}
            style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:'var(--text3)',padding:0}}>←</button>
          <div>
            <h1 style={{fontWeight:700,fontSize:17}}>Портал врача</h1>
            <div style={{fontSize:11,color:'var(--text3)'}}>{profile?.clinic_name||profile?.name||user?.email}</div>
          </div>
        </div>
        <div style={{padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:'#EFF6FF',color:'#2563EB'}}>
          👨‍⚕️ {profile?.speciality||'Врач'}
        </div>
      </div>

      <div className="page-content" style={{display:'flex',flexDirection:'column',gap:12}}>

        {/* Notifications */}
        {linkSuccess&&<div style={{padding:'10px 14px',borderRadius:10,fontSize:13,fontWeight:600,
          background:'var(--success-light)',border:'1px solid #A7F3D0',color:'var(--success)'}}>
          {linkSuccess}</div>}
        {linkErr&&<div style={{padding:'10px 14px',borderRadius:10,fontSize:13,
          background:'var(--danger-light)',border:'1px solid #FECACA',color:'var(--danger)'}}>
          ❌ {linkErr}<button onClick={()=>setLinkErr('')} style={{float:'right',background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:16}}>×</button>
        </div>}

        {/* ── LIST VIEW ── */}
        {view==='list'&&<>
          {/* Stats */}
          <div style={{display:'flex',gap:8}}>
            <Stat icon="👥" value={patients.length} label="Пациентов"/>
            <Stat icon="📊" value={avgAdherence!==null?avgAdherence+'%':'—'} label="Adherence" color="var(--success)"/>
            <Stat icon="⚠️" value={low} label="Низкий" color="var(--danger)"/>
          </div>

          {/* Scan QR button */}
          <button onClick={()=>setShowQR(true)} style={{
            width:'100%',padding:'14px',borderRadius:14,border:'none',
            background:'linear-gradient(135deg,#028090,#02C39A)',
            color:'white',fontWeight:800,fontSize:15,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:10
          }}>
            📷 Сканировать QR пациента
          </button>

          {linkLoading&&<div style={{textAlign:'center',padding:'10px',fontSize:13,color:'var(--text3)'}}>
            ⏳ Поиск пациента...</div>}

          {/* Patients list */}
          {patients.length===0?(
            <div style={{textAlign:'center',padding:'30px 20px',color:'var(--text3)'}}>
              <div style={{fontSize:44,marginBottom:12}}>👥</div>
              <div style={{fontWeight:700,marginBottom:6}}>Нет пациентов</div>
              <div style={{fontSize:13}}>Нажмите «Сканировать QR» и попросите пациента показать его QR-код из приложения MedNOTE</div>
            </div>
          ):(
            patients.map(p=>(
              <button key={p.id} onClick={()=>selectPatient(p)} style={{
                display:'flex',alignItems:'center',gap:12,padding:'13px 14px',
                background:'white',border:`1.5px solid ${p.adherence!==null&&p.adherence<50?'var(--danger)':'var(--border)'}`,
                borderRadius:12,cursor:'pointer',textAlign:'left',width:'100%'
              }}>
                <div style={{width:42,height:42,borderRadius:'50%',flexShrink:0,
                  background:'var(--primary-light)',display:'flex',alignItems:'center',
                  justifyContent:'center',fontWeight:800,fontSize:17,color:'var(--primary)'}}>
                  {p.patient_name?.charAt(0)||'?'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {p.patient_name}
                  </div>
                  <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>
                    {p.itemCount} назначений · сегодня {p.todayTotal} событий
                  </div>
                </div>
                {p.adherence!==null&&(
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:900,
                      color:p.adherence>=80?'var(--success)':p.adherence>=50?'var(--warning)':'var(--danger)'}}>
                      {p.adherence}%
                    </div>
                    <div style={{fontSize:9,color:'var(--text3)'}}>сегодня</div>
                  </div>
                )}
                <span style={{color:'var(--text3)',fontSize:16}}>›</span>
              </button>
            ))
          )}
        </>}

        {/* ── MONITOR VIEW ── */}
        {view==='monitor'&&selected&&<>
          {/* Patient header */}
          <div style={{background:'white',borderRadius:12,padding:'14px 16px',
            border:'1px solid var(--border)',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:46,height:46,borderRadius:'50%',
              background:'var(--primary-light)',display:'flex',alignItems:'center',
              justifyContent:'center',fontWeight:800,fontSize:19,color:'var(--primary)',flexShrink:0}}>
              {selected.patient_name?.charAt(0)}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:15}}>{selected.patient_name}</div>
              <div style={{fontSize:11,color:'var(--text3)'}}>
                Adherence сегодня:{' '}
                <span style={{fontWeight:700,color:selected.adherence>=80?'var(--success)':'var(--warning)'}}>
                  {selected.adherence??'—'}%
                </span>
              </div>
            </div>
            <button onClick={()=>setView('prescribe')} style={{
              padding:'8px 14px',borderRadius:10,border:'none',
              background:'var(--primary)',color:'white',fontWeight:700,fontSize:12,cursor:'pointer'
            }}>+ Назначить</button>
          </div>

          {/* Upcoming items */}
          <div style={{fontSize:12,fontWeight:700,color:'var(--text3)',letterSpacing:'.3px'}}>
            БЛИЖАЙШИЕ НАЗНАЧЕНИЯ ({patientItems.length})
          </div>
          {patientItems.length===0?(
            <div style={{textAlign:'center',padding:'20px',color:'var(--text3)',fontSize:13}}>
              Нет предстоящих событий
            </div>
          ):(
            patientItems.map(item=>(
              <div key={item.id} style={{
                display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
                borderRadius:10,background:item.done?'var(--success-light)':'white',
                border:`1px solid ${item.done?'#A7F3D0':'var(--border)'}`,
              }}>
                <span style={{fontSize:16}}>{item.done?'✅':'⬜'}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.title}</div>
                  <div style={{fontSize:10,color:'var(--text3)'}}>{item.date} · {item.time}</div>
                </div>
                {item.added_by==='doctor'&&(
                  <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:10,background:'#EFF6FF',color:'#2563EB',flexShrink:0}}>
                    👨‍⚕️ врач
                  </span>
                )}
              </div>
            ))
          )}
        </>}

        {/* ── PRESCRIBE VIEW ── */}
        {view==='prescribe'&&selected&&(
          <PrescriptionForm
            patientUid={selected.patient_uid}
            patientName={selected.patient_name}
            onSuccess={onPrescriptionSuccess}
            onCancel={()=>setView('monitor')}
          />
        )}
      </div>
    </div>
  )
}
