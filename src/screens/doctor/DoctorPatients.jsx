import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  collection, query, where, getDocs, addDoc, doc,
  getDoc, onSnapshot, serverTimestamp, updateDoc, deleteDoc
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { parseQRData } from '../../lib/qrUtils'
import { analyzeWithGemini } from '../../lib/geminiClient'
import { format, addDays } from 'date-fns'
import { ru } from 'date-fns/locale'

// ── QR Scanner ────────────────────────────────────────────
function QRScanner({ onResult, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [err, setErr] = useState('')
  const streamRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => { startCamera(); return stopCamera }, [])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        rafRef.current = requestAnimationFrame(tick)
      }
    } catch {
      setErr('Нет доступа к камере. Разрешите доступ в настройках браузера.')
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
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    try {
      if ('BarcodeDetector' in window) {
        const barcodes = await new window.BarcodeDetector({ formats:['qr_code'] }).detect(canvas)
        if (barcodes[0]) { stopCamera(); onResult(barcodes[0].rawValue); return }
      } else if (window.jsQR) {
        const ctx = canvas.getContext('2d')
        const img = ctx.getImageData(0,0,canvas.width,canvas.height)
        const code = window.jsQR(img.data, img.width, img.height)
        if (code?.data) { stopCamera(); onResult(code.data); return }
      }
    } catch {}
    rafRef.current = requestAnimationFrame(tick)
  }

  // Load jsQR fallback
  useEffect(() => {
    if (!('BarcodeDetector' in window) && !window.jsQR) {
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
      s.onload = () => { window.jsQR = window.jsQR }
      document.head.appendChild(s)
    }
  }, [])

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.92)',
      zIndex:9999, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ color:'white', fontWeight:800, fontSize:17, marginBottom:20 }}>
        Сканирование QR пациента
      </div>
      {err
        ? <div style={{ color:'#FCA5A5', fontSize:13, textAlign:'center' }}>{err}</div>
        : <div style={{ position:'relative', width:260, height:260,
            borderRadius:16, overflow:'hidden', border:'3px solid #02C39A' }}>
            <video ref={videoRef} playsInline muted
              style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            <div style={{ position:'absolute', inset:0, display:'flex',
              alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <div style={{ width:160, height:160, border:'2px solid #02C39A',
                borderRadius:8, boxShadow:'0 0 0 2000px rgba(0,0,0,.4)' }}/>
            </div>
            <canvas ref={canvasRef} style={{ display:'none' }}/>
          </div>
      }
      <div style={{ color:'rgba(255,255,255,.5)', fontSize:12,
        marginTop:14, textAlign:'center' }}>
        Наведите на QR из приложения MedNOTE пациента
      </div>
      <button onClick={() => { stopCamera(); onClose() }} style={{
        marginTop:22, padding:'11px 30px', borderRadius:12, border:'none',
        background:'rgba(255,255,255,.15)', color:'white',
        fontWeight:700, fontSize:14, cursor:'pointer'
      }}>Отмена</button>
    </div>
  )
}

// ── Add Patient Modal (with or without account) ───────────
function AddPatientModal({ doctorUid, doctorName, clinicName, onClose, onAdded }) {
  const [mode, setMode] = useState('qr') // qr | manual
  const [showScanner, setShowScanner] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualDob, setManualDob] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleQR(text) {
    setShowScanner(false)
    setLoading(true); setErr('')
    const parsed = parseQRData(text)
    if (!parsed) { setErr('Неверный QR-код MedNOTE'); setLoading(false); return }
    try {
      const pSnap = await getDoc(doc(db,'profiles',parsed.uid))
      if (!pSnap.exists()) { setErr('Профиль пациента не найден'); setLoading(false); return }
      const pd = pSnap.data()
      await addDoc(collection(db,'doctor_patients'), {
        doctor_uid: doctorUid, doctor_name: doctorName,
        patient_uid: parsed.uid, patient_name: pd.name,
        email: pd.email || '', phone: pd.phone || '',
        clinic_name: clinicName, has_account: true,
        linked_at: serverTimestamp(),
      })
      onAdded(pd.name)
    } catch(e) { setErr(e.message) }
    setLoading(false)
  }

  async function addManual() {
    if (!manualName.trim()) { setErr('Введите имя пациента'); return }
    setLoading(true); setErr('')
    try {
      await addDoc(collection(db,'doctor_patients'), {
        doctor_uid: doctorUid, doctor_name: doctorName,
        patient_uid: null, patient_name: manualName.trim(),
        email: '', phone: manualPhone.trim(),
        date_of_birth: manualDob, notes: manualNotes.trim(),
        clinic_name: clinicName, has_account: false,
        linked_at: serverTimestamp(),
      })
      onAdded(manualName.trim())
    } catch(e) { setErr(e.message) }
    setLoading(false)
  }

  return (
    <>
      {showScanner && <QRScanner onResult={handleQR} onClose={()=>setShowScanner(false)}/>}
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)',
        zIndex:999, display:'flex', alignItems:'flex-end', padding:0 }}
        onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div style={{ background:'white', borderRadius:'18px 18px 0 0',
          padding:'20px 20px 32px', width:'100%', maxHeight:'90vh', overflow:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between',
            alignItems:'center', marginBottom:18 }}>
            <div style={{ fontWeight:800, fontSize:17 }}>Добавить пациента</div>
            <button onClick={onClose} style={{ background:'none', border:'none',
              cursor:'pointer', fontSize:22, color:'var(--text3)' }}>×</button>
          </div>

          {/* Mode tabs */}
          <div style={{ display:'flex', gap:6, marginBottom:18 }}>
            {[['qr','📷 По QR-коду'],['manual','✏️ Без аккаунта']].map(([m,l])=>(
              <button key={m} onClick={()=>setMode(m)} style={{
                flex:1, padding:'10px', borderRadius:12, cursor:'pointer',
                border:`2px solid ${mode===m?'#1D4ED8':'var(--border)'}`,
                background:mode===m?'#EFF6FF':'white',
                color:mode===m?'#1D4ED8':'var(--text3)',
                fontWeight:700, fontSize:13
              }}>{l}</button>
            ))}
          </div>

          {mode==='qr'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ background:'#EFF6FF', borderRadius:12, padding:'14px',
                fontSize:13, color:'#1E40AF', lineHeight:1.6 }}>
                📱 Попросите пациента открыть MedNOTE → Профиль → показать QR-код.
                Или введите UID пациента вручную.
              </div>
              <button onClick={()=>setShowScanner(true)} disabled={loading} style={{
                width:'100%', padding:'14px', borderRadius:14, border:'none',
                background:'linear-gradient(135deg,#1D4ED8,#2563EB)',
                color:'white', fontWeight:800, fontSize:15, cursor:'pointer'
              }}>
                {loading ? '⏳ Загрузка...' : '📷 Сканировать QR'}
              </button>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1, height:1, background:'var(--border)' }}/>
                <span style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>или введите UID вручную</span>
                <div style={{ flex:1, height:1, background:'var(--border)' }}/>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input className="input" placeholder="UID пациента (из его профиля MedNOTE)"
                  style={{ flex:1, fontSize:12 }}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && e.target.value.trim().length >= 24) {
                      await handleQR(e.target.value.trim())
                    }
                  }}
                  onChange={e => {
                    if (e.target.value.trim().length >= 20) {
                      // auto-trigger on paste/complete UID
                    }
                  }}
                  id="uid-input"
                />
                <button onClick={async () => {
                  const v = document.getElementById('uid-input')?.value?.trim()
                  if (v && v.length >= 24) await handleQR(v)
                }} style={{
                  padding:'0 14px', borderRadius:10, border:'none',
                  background:'#1D4ED8', color:'white', fontWeight:700, cursor:'pointer', flexShrink:0
                }}>Добавить</button>
              </div>
            </div>
          )}

          {mode==='manual'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ background:'#FFFBEB', borderRadius:12, padding:'12px',
                fontSize:12, color:'#92400E', lineHeight:1.6, border:'1px solid #FDE68A' }}>
                ℹ️ Пациент без аккаунта MedNOTE. Вы сможете записывать ему приёмы,
                но он не будет получать напоминания в приложении.
              </div>
              <div>
                <label className="label">ФИО пациента *</label>
                <input className="input" placeholder="Иванов Иван Иванович"
                  value={manualName} onChange={e=>setManualName(e.target.value)}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label className="label">Телефон</label>
                  <input className="input" type="tel" placeholder="+7 (777) 000-00-00"
                    value={manualPhone} onChange={e=>setManualPhone(e.target.value)}/>
                </div>
                <div>
                  <label className="label">Дата рождения</label>
                  <input className="input" type="date"
                    value={manualDob} onChange={e=>setManualDob(e.target.value)}/>
                </div>
              </div>
              <div>
                <label className="label">Примечания</label>
                <textarea className="input" placeholder="Аллергии, хронические заболевания..."
                  rows={2} value={manualNotes} onChange={e=>setManualNotes(e.target.value)}
                  style={{ resize:'none' }}/>
              </div>
              {err&&<div style={{ padding:'9px 12px', borderRadius:9, fontSize:12,
                background:'var(--danger-light)', color:'var(--danger)' }}>❌ {err}</div>}
              <button onClick={addManual} disabled={loading} style={{
                width:'100%', padding:'13px', borderRadius:14, border:'none',
                background: loading?'var(--surface2)':'#1D4ED8',
                color:loading?'var(--text3)':'white', fontWeight:800, fontSize:14, cursor:'pointer'
              }}>{loading?'⏳ Сохранение...':'➕ Добавить пациента'}</button>
            </div>
          )}

          {err&&mode==='qr'&&(
            <div style={{ marginTop:10, padding:'9px 12px', borderRadius:9,
              fontSize:12, background:'var(--danger-light)', color:'var(--danger)' }}>❌ {err}</div>
          )}
        </div>
      </div>
    </>
  )
}


// ── Prescription Sheet — расширенная форма назначения ────────
function PrescriptionSheet({ patient, doctorUid, doctorProfile, onClose, onSaved }) {
  const [mode,    setMode]    = useState('manual')
  const [file,    setFile]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState('')

  // Each item has main fields + optional advanced fields
  const newItem = () => ({
    type:'medication', title:'', dose:'', route:'',         // Основные
    times_per_day:1, time_slots:['08:00'],                  // Время приёма
    duration_days:7, start_date:'',                         // Курс
    notes:'', contraindications:'', special_instructions:'',// Доп.
    showAdvanced: false,
  })
  const [items, setItems] = useState([newItem()])

  const TYPES=[
    {v:'medication',  l:'💊 Препарат'},
    {v:'exercise',    l:'🏃 ЛФК/Упражнение'},
    {v:'procedure',   l:'🩺 Процедура'},
    {v:'appointment', l:'📅 Визит к врачу'},
    {v:'restriction', l:'⚠️ Ограничение'},
    {v:'nutrition',   l:'🥗 Диета/Питание'},
  ]

  const ROUTES = ['Внутрь (перорально)','Сублингвально','В/м инъекция','В/в инъекция',
    'Местно','Ингаляционно','Ректально','Трансдермально','Капли (глазные)','Капли (ушные)']

  function upd(i, field, val) {
    setItems(p => p.map((x,j) => j!==i ? x : { ...x, [field]: val }))
  }

  function setSlotTime(i, slotIdx, val) {
    setItems(p => p.map((x,j) => {
      if (j!==i) return x
      const slots = [...(x.time_slots||['08:00'])]
      slots[slotIdx] = val
      return { ...x, time_slots: slots }
    }))
  }

  function setTimesPerDay(i, n) {
    const defaults = ['08:00','13:00','18:00','22:00','11:00','15:00']
    setItems(p => p.map((x,j) => {
      if (j!==i) return x
      const existing = x.time_slots || ['08:00']
      const slots = Array.from({length:n}, (_,k) => existing[k] || defaults[k] || '08:00')
      return { ...x, times_per_day:n, time_slots:slots }
    }))
  }

  async function analyzePhoto() {
    if (!file) return; setLoading(true); setErr('')
    try {
      const b64 = await new Promise((res,rej)=>{
        const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.onerror=rej; r.readAsDataURL(file)
      })
      const parsed = await analyzeWithGemini({imageBase64:b64, mimeType:file.type||'image/jpeg'})
      if (parsed.length) {
        setItems(parsed.map(p => ({
          ...newItem(),
          type:          p.type||'medication',
          title:         p.title||'',
          dose:          p.dose||'',
          times_per_day: p.times_per_day||1,
          time_slots:    p.time_slots||['08:00'],
          duration_days: p.duration_days||7,
          notes:         p.notes||'',
        })))
        setMode('manual')
      } else { setErr('ИИ не нашёл назначений. Введите вручную.') }
    } catch(e) { setErr(e.message) }
    setLoading(false)
  }

  async function save() {
    const valid = items.filter(i => i.title.trim())
    if (!valid.length) { setErr('Введите хотя бы одно назначение'); return }
    if (!patient.patient_uid) { setErr('Пациент без аккаунта MedNOTE'); return }
    setLoading(true); setErr('')
    try {
      const requestItems = valid.map(item => ({
        type:           item.type,
        title:          item.title.trim(),
        dose:           item.dose||null,
        route:          item.route||null,
        notes:          [item.notes, item.special_instructions].filter(Boolean).join(' | ') || null,
        contraindications: item.contraindications||null,
        time:           item.time_slots?.[0]||'08:00',
        time_slots:     item.time_slots||['08:00'],
        times_per_day:  item.times_per_day||1,
        duration_days:  item.duration_days||7,
        start_date:     item.start_date||null,
        is_one_time:    false,
      }))
      await addDoc(collection(db,'prescription_requests'),{
        patient_uid:  patient.patient_uid,
        patient_name: patient.patient_name,
        doctor_uid:   doctorUid||'',
        doctor_name:  doctorProfile?.name||'Врач',
        clinic_name:  doctorProfile?.clinic_name||'',
        items:        requestItems,
        status:       'pending',
        created_at:   serverTimestamp(),
      })
      onSaved(valid.length)
    } catch(e) { setErr('Ошибка: '+e.message) }
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:998,
      display:'flex',alignItems:'flex-end'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'white',borderRadius:'18px 18px 0 0',padding:'20px 20px 32px',
        width:'100%',maxHeight:'92vh',overflow:'auto'}}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <div style={{fontWeight:800,fontSize:17}}>📋 Назначения</div>
            <div style={{fontSize:12,color:'var(--text3)'}}>для {patient.patient_name}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:24,color:'var(--text3)'}}>×</button>
        </div>

        {!patient.patient_uid && (
          <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:10,
            padding:'10px 12px',marginBottom:12,fontSize:12,color:'#92400E'}}>
            ⚠️ Пациент без аккаунта MedNOTE — запрос не будет отправлен.
          </div>
        )}

        {/* Mode tabs */}
        <div style={{display:'flex',gap:6,marginBottom:14}}>
          {[['manual','✏️ Вручную'],['photo','📷 Фото выписки']].map(([m,l])=>(
            <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'9px',borderRadius:10,
              cursor:'pointer',border:`1.5px solid ${mode===m?'#1D4ED8':'var(--border)'}`,
              background:mode===m?'#EFF6FF':'white',color:mode===m?'#1D4ED8':'var(--text3)',
              fontWeight:700,fontSize:12}}>{l}</button>
          ))}
        </div>

        {/* Photo mode */}
        {mode==='photo' && (
          <div style={{marginBottom:12}}>
            <input type="file" accept="image/*" id="rx-img" style={{display:'none'}}
              onChange={e=>setFile(e.target.files[0])}/>
            <label htmlFor="rx-img" style={{display:'block',padding:16,borderRadius:12,cursor:'pointer',
              border:'2px dashed var(--border)',background:'var(--surface2)',textAlign:'center',
              fontSize:13,color:'var(--text3)'}}>
              {file?`📎 ${file.name}`:'📷 Выбрать фото выписки'}
            </label>
            {file && (
              <button onClick={analyzePhoto} disabled={loading} style={{width:'100%',marginTop:8,
                padding:'11px',borderRadius:10,border:'none',
                background:loading?'var(--surface2)':'#1D4ED8',
                color:loading?'var(--text3)':'white',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                {loading?'⏳ Анализирую...':'🤖 Анализировать ИИ'}
              </button>
            )}
          </div>
        )}

        {/* Manual mode */}
        {mode==='manual' && (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {items.map((item,i) => (
              <div key={i} style={{background:'var(--surface2)',borderRadius:14,
                border:'1px solid var(--border)',overflow:'hidden'}}>

                {/* Item header */}
                <div style={{display:'flex',justifyContent:'space-between',
                  alignItems:'center',padding:'10px 14px 0'}}>
                  <span style={{fontSize:11,fontWeight:700,color:'#1D4ED8',
                    textTransform:'uppercase',letterSpacing:.5}}>
                    Назначение {i+1}
                  </span>
                  {items.length>1 && (
                    <button onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))}
                      style={{background:'none',border:'none',cursor:'pointer',
                        color:'var(--danger)',fontSize:18,lineHeight:1}}>✕</button>
                  )}
                </div>

                <div style={{padding:'10px 14px 14px',display:'flex',flexDirection:'column',gap:10}}>

                  {/* Type selector */}
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {TYPES.map(t=>(
                      <button key={t.v} onClick={()=>upd(i,'type',t.v)} style={{
                        padding:'5px 10px',borderRadius:20,cursor:'pointer',fontSize:11,fontWeight:700,
                        border:`1.5px solid ${item.type===t.v?'#1D4ED8':'var(--border)'}`,
                        background:item.type===t.v?'#EFF6FF':'white',
                        color:item.type===t.v?'#1D4ED8':'var(--text3)'}}>
                        {t.l}
                      </button>
                    ))}
                  </div>

                  {/* Title */}
                  <input className="input" placeholder="Название препарата / процедуры *"
                    value={item.title} onChange={e=>upd(i,'title',e.target.value)}
                    style={{fontSize:14,fontWeight:600}}/>

                  {/* Dose + Route */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div>
                      <label className="label">Дозировка</label>
                      <input className="input" placeholder="100мг, 2 табл., 5мл..."
                        value={item.dose} onChange={e=>upd(i,'dose',e.target.value)}
                        style={{fontSize:12}}/>
                    </div>
                    <div>
                      <label className="label">Путь введения</label>
                      <select className="input" value={item.route} onChange={e=>upd(i,'route',e.target.value)}
                        style={{fontSize:12}}>
                        <option value="">— выбрать —</option>
                        {ROUTES.map(r=><option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Times per day + individual time slots */}
                  <div>
                    <label className="label">Приёмов в день</label>
                    <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
                      {[1,2,3,4,5,6].map(n=>(
                        <button key={n} onClick={()=>setTimesPerDay(i,n)} style={{
                          width:36,height:36,borderRadius:9,border:'none',cursor:'pointer',
                          fontSize:13,fontWeight:700,
                          background:item.times_per_day===n?'#1D4ED8':'var(--surface2)',
                          color:item.times_per_day===n?'white':'var(--text3)'}}>
                          {n}×
                        </button>
                      ))}
                    </div>
                    {/* Individual time inputs per slot */}
                    <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                      {(item.time_slots||['08:00']).map((t,si)=>(
                        <div key={si} style={{display:'flex',alignItems:'center',gap:4}}>
                          <span style={{fontSize:11,color:'var(--text3)',fontWeight:600,
                            minWidth:14,textAlign:'right'}}>{si+1}.</span>
                          <input type="time" className="input"
                            value={t} onChange={e=>setSlotTime(i,si,e.target.value)}
                            style={{width:100,fontSize:12,padding:'7px 8px'}}/>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Duration + Start date */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div>
                      <label className="label">Количество дней</label>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:4}}>
                        {[3,5,7,10,14,21,30].map(d=>(
                          <button key={d} onClick={()=>upd(i,'duration_days',d)} style={{
                            padding:'4px 8px',borderRadius:8,border:'none',cursor:'pointer',
                            fontSize:11,fontWeight:700,
                            background:item.duration_days===d?'#1D4ED8':'var(--surface2)',
                            color:item.duration_days===d?'white':'var(--text3)'}}>
                            {d}д
                          </button>
                        ))}
                      </div>
                      <input type="number" className="input" placeholder="или введите"
                        min={1} max={365} value={item.duration_days||''}
                        onChange={e=>upd(i,'duration_days',parseInt(e.target.value)||null)}
                        style={{fontSize:12}}/>
                    </div>
                    <div>
                      <label className="label">Начало курса</label>
                      <input type="date" className="input"
                        value={item.start_date||''} onChange={e=>upd(i,'start_date',e.target.value)}
                        style={{fontSize:12}}/>
                      <div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>
                        Пустое = пациент выберет сам
                      </div>
                    </div>
                  </div>

                  {/* Notes (always visible) */}
                  <div>
                    <label className="label">Примечание / инструкция</label>
                    <textarea className="input" placeholder="Принимать после еды, запивать водой..."
                      rows={2} value={item.notes||''} onChange={e=>upd(i,'notes',e.target.value)}
                      style={{resize:'none',fontSize:12}}/>
                  </div>

                  {/* Advanced toggle */}
                  <button onClick={()=>upd(i,'showAdvanced',!item.showAdvanced)} style={{
                    background:'none',border:'none',cursor:'pointer',fontSize:12,
                    color:'#1D4ED8',fontWeight:600,textAlign:'left',padding:0}}>
                    {item.showAdvanced?'▲ Скрыть доп. поля':'▼ Дополнительные поля'}
                  </button>

                  {/* Advanced fields */}
                  {item.showAdvanced && (
                    <div style={{display:'flex',flexDirection:'column',gap:8,
                      background:'white',borderRadius:10,padding:'10px 12px',
                      border:'1px solid var(--border)'}}>
                      <div>
                        <label className="label">⚠️ Противопоказания / предостережения</label>
                        <textarea className="input" placeholder="Нельзя при беременности, совместно с..."
                          rows={2} value={item.contraindications||''}
                          onChange={e=>upd(i,'contraindications',e.target.value)}
                          style={{resize:'none',fontSize:12}}/>
                      </div>
                      <div>
                        <label className="label">📋 Особые инструкции</label>
                        <textarea className="input" placeholder="Хранить в холодильнике, не делить таблетку..."
                          rows={2} value={item.special_instructions||''}
                          onChange={e=>upd(i,'special_instructions',e.target.value)}
                          style={{resize:'none',fontSize:12}}/>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button onClick={()=>setItems(p=>[...p,newItem()])} style={{
              padding:'11px',borderRadius:12,border:'1.5px dashed #1D4ED8',
              background:'transparent',color:'#1D4ED8',fontWeight:700,fontSize:13,cursor:'pointer'}}>
              + Добавить ещё назначение
            </button>
          </div>
        )}

        {err && (
          <div style={{padding:'10px 12px',borderRadius:10,fontSize:12,marginTop:10,
            background:'var(--danger-light)',border:'1px solid #FECACA',color:'var(--danger)'}}>
            ❌ {err}
          </div>
        )}

        {patient.patient_uid && (
          <button onClick={save} disabled={loading} style={{
            width:'100%',marginTop:16,padding:'14px',borderRadius:14,border:'none',
            background:loading?'var(--surface2)':'#1D4ED8',
            color:loading?'var(--text3)':'white',fontWeight:800,fontSize:15,cursor:'pointer'}}>
            {loading?'⏳ Отправка...':'📨 Отправить запрос пациенту'}
          </button>
        )}
      </div>
    </div>
  )
}


// ── Patient Detail ─────────────────────────────────────────
function PatientDetail({ patient, onBack, doctorUid, doctorProfile }) {
  const [items, setItems] = useState([])
  const [showPrescription, setShowPrescription] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!patient.patient_uid) return
    const q = query(collection(db,'schedule_items'), where('user_id','==',patient.patient_uid))
    const unsub = onSnapshot(q, snap => {
      const today = format(new Date(),'yyyy-MM-dd')
      const list = snap.docs.map(d=>({id:d.id,...d.data()}))
        .filter(i=>i.date>=today)
        .sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||''))
      setItems(list.slice(0,30))
    })
    return unsub
  },[patient.patient_uid])

  const today = format(new Date(),'yyyy-MM-dd')
  const todayItems = items.filter(i=>i.date===today)
  const done = todayItems.filter(i=>i.done).length
  const adherence = todayItems.length>0 ? Math.round(done/todayItems.length*100) : null

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {showPrescription&&(
        <PrescriptionSheet patient={patient} doctorUid={doctorUid} doctorProfile={doctorProfile} onClose={()=>setShowPrescription(false)}
          onSaved={n=>{setMsg(`✅ ${n} назначений добавлено`);setShowPrescription(false);setTimeout(()=>setMsg(''),3000)}}/>
      )}

      <div className="page-header" style={{background:'linear-gradient(135deg,#EFF6FF,#F0FDFA)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:'var(--text3)',padding:0}}>←</button>
          <div style={{width:42,height:42,borderRadius:'50%',background:'#1D4ED8',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontWeight:800,fontSize:18,color:'white',flexShrink:0}}>
            {patient.patient_name?.charAt(0)}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:15}}>{patient.patient_name}</div>
            <div style={{fontSize:11,color:'var(--text3)'}}>
              {patient.has_account?'🟢 Есть аккаунт MedNOTE':'⚪ Без аккаунта'}
              {patient.phone&&` · ${patient.phone}`}
            </div>
          </div>
        </div>
      </div>

      <div className="page-content" style={{display:'flex',flexDirection:'column',gap:12}}>
        {msg&&<div style={{padding:'10px 14px',borderRadius:10,fontSize:13,
          background:'var(--success-light)',border:'1px solid #A7F3D0',color:'var(--success)'}}>
          {msg}</div>}

        {/* Stats */}
        {patient.has_account&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {[
              ['📊',adherence!==null?adherence+'%':'—','Выполнено','#1D4ED8'],
              ['📋',todayItems.length,'Сегодня','var(--primary)'],
              ['📅',items.length,'Предстоит','var(--success)'],
            ].map(([ic,v,l,c])=>(
              <div key={l} style={{background:'white',borderRadius:12,padding:'12px 8px',
                border:'1px solid var(--border)',textAlign:'center'}}>
                <div style={{fontSize:18,marginBottom:3}}>{ic}</div>
                <div style={{fontSize:20,fontWeight:900,color:c}}>{v}</div>
                <div style={{fontSize:10,color:'var(--text3)',marginTop:1}}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <button onClick={()=>setShowPrescription(true)} style={{
          width:'100%',padding:'14px',borderRadius:14,border:'none',
          background:'linear-gradient(135deg,#1D4ED8,#2563EB)',
          color:'white',fontWeight:800,fontSize:15,cursor:'pointer'
        }}>💊 Добавить назначения</button>

        {/* Upcoming */}
        {items.length>0&&<>
          <div style={{fontSize:12,fontWeight:700,color:'var(--text3)',letterSpacing:'.3px'}}>
            БЛИЖАЙШИЕ НАЗНАЧЕНИЯ
          </div>
          {items.slice(0,15).map(item=>(
            <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,
              padding:'10px 12px',borderRadius:10,
              background:item.done?'var(--success-light)':'white',
              border:`1px solid ${item.done?'#A7F3D0':'var(--border)'}`}}>
              <span style={{fontSize:15}}>{item.done?'✅':'⬜'}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {item.title}
                </div>
                <div style={{fontSize:10,color:'var(--text3)'}}>
                  {item.date} · {item.time}
                  {item.notes&&` · ${item.notes.slice(0,30)}`}
                </div>
              </div>
              {item.added_by==='doctor'&&(
                <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:10,
                  background:'#EFF6FF',color:'#1D4ED8',flexShrink:0}}>👨‍⚕️</span>
              )}
            </div>
          ))}
        </>}

        {patient.notes&&(
          <div style={{background:'var(--surface2)',borderRadius:12,padding:'12px 14px',
            border:'1px solid var(--border)',fontSize:12,color:'var(--text2)',lineHeight:1.6}}>
            📋 {patient.notes}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main: DoctorPatients ──────────────────────────────────
export default function DoctorPatients() {
  const { user, profile } = useAuth()
  const [patients, setPatients] = useState([])
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) return
    const q = query(collection(db,'doctor_patients'),where('doctor_uid','==',user.uid))
    const unsub = onSnapshot(q, snap => {
      setPatients(snap.docs.map(d=>({id:d.id,...d.data()})))
    })
    return unsub
  },[user])

  function onAdded(name) {
    setShowAdd(false)
    setMsg(`✅ ${name} добавлен в список пациентов`)
    setTimeout(()=>setMsg(''),3000)
  }

  const filtered = patients.filter(p =>
    !search || p.patient_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (selected) return (
    <PatientDetail patient={selected} onBack={()=>setSelected(null)} doctorUid={user?.uid} doctorProfile={profile}/>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {showAdd&&(
        <AddPatientModal
          doctorUid={user.uid}
          doctorName={profile?.name||''}
          clinicName={profile?.clinic_name||''}
          onClose={()=>setShowAdd(false)}
          onAdded={onAdded}
        />
      )}

      <div className="page-header">
        <h1 style={{fontWeight:700,fontSize:18}}>Мои пациенты</h1>
        <button onClick={()=>setShowAdd(true)} style={{
          padding:'8px 16px',borderRadius:10,border:'none',
          background:'#1D4ED8',color:'white',fontWeight:700,fontSize:13,cursor:'pointer'
        }}>+ Добавить</button>
      </div>

      <div className="page-content" style={{display:'flex',flexDirection:'column',gap:10}}>
        {msg&&<div style={{padding:'10px 14px',borderRadius:10,fontSize:13,
          background:'var(--success-light)',border:'1px solid #A7F3D0',color:'var(--success)'}}>
          {msg}</div>}

        {/* Search */}
        {patients.length>3&&(
          <input className="input" placeholder="🔍 Поиск по имени..."
            value={search} onChange={e=>setSearch(e.target.value)}/>
        )}

        {/* Stats */}
        <div style={{display:'flex',gap:8}}>
          <div style={{flex:1,background:'white',borderRadius:12,padding:'12px',
            border:'1px solid var(--border)',textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:900,color:'#1D4ED8'}}>{patients.length}</div>
            <div style={{fontSize:11,color:'var(--text3)'}}>Пациентов</div>
          </div>
          <div style={{flex:1,background:'white',borderRadius:12,padding:'12px',
            border:'1px solid var(--border)',textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:900,color:'var(--success)'}}>
              {patients.filter(p=>p.has_account).length}
            </div>
            <div style={{fontSize:11,color:'var(--text3)'}}>С MedNOTE</div>
          </div>
          <div style={{flex:1,background:'white',borderRadius:12,padding:'12px',
            border:'1px solid var(--border)',textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:900,color:'var(--text3)'}}>
              {patients.filter(p=>!p.has_account).length}
            </div>
            <div style={{fontSize:11,color:'var(--text3)'}}>Без аккаунта</div>
          </div>
        </div>

        {filtered.length===0?(
          <div style={{textAlign:'center',padding:'40px 20px',color:'var(--text3)'}}>
            <div style={{fontSize:48,marginBottom:16}}>👥</div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Нет пациентов</div>
            <div style={{fontSize:13,lineHeight:1.7}}>
              Нажмите «+ Добавить» чтобы добавить пациента по QR-коду или вручную
            </div>
          </div>
        ):(
          filtered.map(p=>(
            <button key={p.id} onClick={()=>setSelected(p)} style={{
              display:'flex',alignItems:'center',gap:12,padding:'13px 14px',
              background:'white',border:'1.5px solid var(--border)',
              borderRadius:14,cursor:'pointer',textAlign:'left',width:'100%'
            }}>
              <div style={{width:44,height:44,borderRadius:'50%',flexShrink:0,
                background:'#EFF6FF',display:'flex',alignItems:'center',
                justifyContent:'center',fontWeight:800,fontSize:18,color:'#1D4ED8'}}>
                {p.patient_name?.charAt(0)||'?'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,overflow:'hidden',
                  textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {p.patient_name}
                </div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:2,display:'flex',gap:6}}>
                  {p.has_account
                    ?<span style={{color:'var(--success)',fontWeight:600}}>🟢 MedNOTE</span>
                    :<span style={{color:'var(--text3)'}}>⚪ Без аккаунта</span>}
                  {p.phone&&<span>· {p.phone}</span>}
                </div>
              </div>
              <span style={{color:'var(--text3)',fontSize:18}}>›</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
