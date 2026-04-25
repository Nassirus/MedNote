import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  collection, query, where, getDocs, addDoc,
  onSnapshot, serverTimestamp, deleteDoc, doc
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import {
  format, addDays, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth
} from 'date-fns'
import { ru } from 'date-fns/locale'

const TYPE_COLORS = {
  appointment: '#1D4ED8',
  medication:  '#059669',
  procedure:   '#7C3AED',
  exercise:    '#D97706',
  restriction: '#DC2626',
  other:       '#64748B',
}

function AppointmentModal({ date, doctorUid, patients, onClose, onSaved }) {
  const [title, setTitle]     = useState('')
  const [time, setTime]       = useState('09:00')
  const [patient, setPatient] = useState('')
  const [type, setType]       = useState('appointment')
  const [notes, setNotes]     = useState('')
  const [duration, setDuration] = useState(30)
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  const TYPES = [
    {v:'appointment',l:'📅 Приём'},
    {v:'procedure',l:'🩺 Процедура'},
    {v:'medication',l:'💊 Лекарство'},
    {v:'exercise',l:'🏃 ЛФК'},
    {v:'other',l:'📋 Другое'},
  ]

  async function save() {
    if (!title.trim()) { setErr('Введите название'); return }
    setLoading(true); setErr('')
    try {
      const selPatient = patients.find(p=>p.id===patient)
      await addDoc(collection(db,'doctor_appointments'), {
        doctor_uid:    doctorUid,
        patient_id:    patient || null,
        patient_name:  selPatient?.patient_name || '',
        patient_has_account: selPatient?.has_account || false,
        patient_uid:   selPatient?.patient_uid || null,
        title:         title.trim(),
        type,
        date:          format(date, 'yyyy-MM-dd'),
        time,
        duration_min:  duration,
        notes:         notes.trim(),
        status:        'scheduled', // scheduled | done | cancelled
        created_at:    serverTimestamp(),
      })

      // If patient has MedNOTE account — add to their schedule too
      if (selPatient?.patient_uid) {
        await addDoc(collection(db,'schedule_items'), {
          user_id:    selPatient.patient_uid,
          type:       'appointment',
          title:      title.trim(),
          time,
          endTime:    null,
          notes:      notes.trim(),
          freq:       'Разово',
          date:       format(date,'yyyy-MM-dd'),
          color:      null, done:false,
          added_by:   'doctor',
          created_at: serverTimestamp(),
        })
      }
      onSaved()
    } catch(e) { setErr(e.message) }
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',
      zIndex:999,display:'flex',alignItems:'flex-end'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'white',borderRadius:'18px 18px 0 0',
        padding:'20px 20px 32px',width:'100%',maxHeight:'90vh',overflow:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',
          alignItems:'center',marginBottom:18}}>
          <div>
            <div style={{fontWeight:800,fontSize:17}}>Новый приём</div>
            <div style={{fontSize:12,color:'var(--text3)'}}>
              {format(date,'d MMMM yyyy',{locale:ru})}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',
            cursor:'pointer',fontSize:22,color:'var(--text3)'}}>×</button>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Type */}
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {TYPES.map(t=>(
              <button key={t.v} onClick={()=>setType(t.v)} style={{
                padding:'7px 12px',borderRadius:20,cursor:'pointer',
                border:`1.5px solid ${type===t.v?TYPE_COLORS[t.v]:'var(--border)'}`,
                background:type===t.v?TYPE_COLORS[t.v]+'18':'white',
                color:type===t.v?TYPE_COLORS[t.v]:'var(--text3)',
                fontWeight:700,fontSize:12
              }}>{t.l}</button>
            ))}
          </div>

          {/* Title */}
          <div>
            <label className="label">Название *</label>
            <input className="input" placeholder="Плановый приём, перевязка..."
              value={title} onChange={e=>setTitle(e.target.value)}/>
          </div>

          {/* Patient */}
          <div>
            <label className="label">Пациент</label>
            <select className="input" value={patient} onChange={e=>setPatient(e.target.value)}>
              <option value="">— Без пациента —</option>
              {patients.map(p=>(
                <option key={p.id} value={p.id}>
                  {p.patient_name}{p.has_account?' (MedNOTE)':''}
                </option>
              ))}
            </select>
          </div>

          {/* Time + Duration */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label className="label">Время</label>
              <input type="time" className="input" value={time}
                onChange={e=>setTime(e.target.value)}/>
            </div>
            <div>
              <label className="label">Длительность</label>
              <select className="input" value={duration}
                onChange={e=>setDuration(parseInt(e.target.value))}>
                {[15,20,30,45,60,90,120].map(m=>(
                  <option key={m} value={m}>{m} мин</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Примечание</label>
            <textarea className="input" placeholder="Жалобы, анамнез, цель визита..."
              rows={2} value={notes} onChange={e=>setNotes(e.target.value)}
              style={{resize:'none'}}/>
          </div>

          {err&&<div style={{padding:'9px 12px',borderRadius:9,fontSize:12,
            background:'var(--danger-light)',color:'var(--danger)'}}>❌ {err}</div>}

          <button onClick={save} disabled={loading} style={{
            width:'100%',padding:'13px',borderRadius:14,border:'none',
            background:loading?'var(--surface2)':'#1D4ED8',
            color:loading?'var(--text3)':'white',fontWeight:800,fontSize:14,cursor:'pointer'}}>
            {loading?'⏳ Сохранение...':'💾 Сохранить приём'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DoctorCalendar() {
  const { user } = useAuth()
  const [month, setMonth]   = useState(new Date())
  const [selected, setSelected] = useState(new Date())
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!user) return
    const q = query(collection(db,'doctor_appointments'),where('doctor_uid','==',user.uid))
    const unsub = onSnapshot(q, snap => {
      setAppointments(snap.docs.map(d=>({id:d.id,...d.data()})))
    })
    return unsub
  },[user])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db,'doctor_patients'),where('doctor_uid','==',user.uid))
    const unsub = onSnapshot(q, snap => {
      setPatients(snap.docs.map(d=>({id:d.id,...d.data()})))
    })
    return unsub
  },[user])

  async function markDone(appt) {
    await deleteDoc(doc(db,'doctor_appointments',appt.id))
    await addDoc(collection(db,'doctor_appointments'),{
      ...appt, status:'done', updated_at:serverTimestamp()
    })
  }

  async function cancelAppt(appt) {
    await deleteDoc(doc(db,'doctor_appointments',appt.id))
  }

  // Build calendar
  const monthStart = startOfMonth(month)
  const monthEnd   = endOfMonth(month)
  const calStart   = startOfWeek(monthStart,{weekStartsOn:1})
  const calEnd     = endOfWeek(monthEnd,{weekStartsOn:1})
  const days       = eachDayOfInterval({start:calStart,end:calEnd})

  const selectedStr = format(selected,'yyyy-MM-dd')
  const dayAppointments = appointments
    .filter(a=>a.date===selectedStr)
    .sort((a,b)=>(a.time||'').localeCompare(b.time||''))

  function appointmentsForDay(day) {
    const ds = format(day,'yyyy-MM-dd')
    return appointments.filter(a=>a.date===ds)
  }

  const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {showAdd&&(
        <AppointmentModal date={selected} doctorUid={user.uid} patients={patients}
          onClose={()=>setShowAdd(false)}
          onSaved={()=>{setShowAdd(false);setMsg('✅ Приём добавлен');setTimeout(()=>setMsg(''),2500)}}
        />
      )}

      <div className="page-header">
        <h1 style={{fontWeight:700,fontSize:18}}>Расписание приёмов</h1>
        <button onClick={()=>setShowAdd(true)} style={{
          padding:'8px 16px',borderRadius:10,border:'none',
          background:'#1D4ED8',color:'white',fontWeight:700,fontSize:13,cursor:'pointer'}}>
          + Приём
        </button>
      </div>

      <div className="page-content" style={{display:'flex',flexDirection:'column',gap:12}}>
        {msg&&<div style={{padding:'10px 14px',borderRadius:10,fontSize:13,
          background:'var(--success-light)',border:'1px solid #A7F3D0',color:'var(--success)'}}>
          {msg}</div>}

        {/* Month nav */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          background:'white',borderRadius:14,padding:'12px 16px',border:'1px solid var(--border)'}}>
          <button onClick={()=>setMonth(d=>addDays(startOfMonth(d),-1))}
            style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:'var(--text3)',padding:'0 6px'}}>‹</button>
          <span style={{fontWeight:700,fontSize:15}}>
            {format(month,'LLLL yyyy',{locale:ru})}
          </span>
          <button onClick={()=>setMonth(d=>addDays(endOfMonth(d),1))}
            style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:'var(--text3)',padding:'0 6px'}}>›</button>
        </div>

        {/* Calendar grid */}
        <div style={{background:'white',borderRadius:14,padding:'12px',border:'1px solid var(--border)'}}>
          {/* Day headers */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:4}}>
            {DOW.map(d=>(
              <div key={d} style={{textAlign:'center',fontSize:10,fontWeight:700,
                color:'var(--text3)',padding:'4px 0'}}>{d}</div>
            ))}
          </div>
          {/* Days */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
            {days.map(day=>{
              const isToday = isSameDay(day,new Date())
              const isSel   = isSameDay(day,selected)
              const inMonth = isSameMonth(day,month)
              const appts   = appointmentsForDay(day)
              return (
                <button key={day.toISOString()} onClick={()=>setSelected(day)}
                  style={{
                    aspectRatio:'1',display:'flex',flexDirection:'column',
                    alignItems:'center',justifyContent:'center',borderRadius:10,
                    border:`2px solid ${isSel?'#1D4ED8':'transparent'}`,
                    background: isSel?'#EFF6FF': isToday?'var(--primary-light)':'transparent',
                    cursor:'pointer',position:'relative',padding:2
                  }}>
                  <span style={{fontSize:13,fontWeight:isSel||isToday?800:400,
                    color:!inMonth?'var(--border2)':isSel?'#1D4ED8':isToday?'var(--primary)':'var(--text)'}}>
                    {format(day,'d')}
                  </span>
                  {appts.length>0&&(
                    <div style={{display:'flex',gap:1,marginTop:1,flexWrap:'wrap',justifyContent:'center'}}>
                      {appts.slice(0,3).map((a,i)=>(
                        <div key={i} style={{width:5,height:5,borderRadius:'50%',
                          background:TYPE_COLORS[a.type]||TYPE_COLORS.other}}/>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected day appointments */}
        <div style={{fontWeight:700,fontSize:13,color:'var(--text3)'}}>
          {format(selected,'d MMMM, EEEE',{locale:ru}).toUpperCase()} — {dayAppointments.length} приёмов
        </div>

        {dayAppointments.length===0?(
          <div style={{textAlign:'center',padding:'20px',color:'var(--text3)',fontSize:13}}>
            На этот день приёмов нет.
            <br/>
            <button onClick={()=>setShowAdd(true)} style={{marginTop:8,background:'none',
              border:'none',color:'#1D4ED8',fontWeight:700,cursor:'pointer',fontSize:13}}>
              + Добавить приём
            </button>
          </div>
        ):(
          dayAppointments.map(a=>(
            <div key={a.id} style={{
              background:'white',borderRadius:14,padding:'14px 16px',
              border:`1.5px solid ${TYPE_COLORS[a.type]||'var(--border)'}`,
              borderLeft:`4px solid ${TYPE_COLORS[a.type]||'var(--border)'}`
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{a.title}</div>
                  {a.patient_name&&(
                    <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>
                      👤 {a.patient_name}
                      {a.patient_has_account&&<span style={{fontSize:10,color:'var(--success)',marginLeft:4}}>● MedNOTE</span>}
                    </div>
                  )}
                </div>
                <div style={{textAlign:'right',flexShrink:0,marginLeft:10}}>
                  <div style={{fontWeight:800,fontSize:14,color:TYPE_COLORS[a.type]||'var(--text)'}}>
                    {a.time}
                  </div>
                  <div style={{fontSize:10,color:'var(--text3)'}}>{a.duration_min} мин</div>
                </div>
              </div>
              {a.notes&&<div style={{fontSize:12,color:'var(--text2)',marginBottom:8,lineHeight:1.5}}>
                {a.notes}</div>}
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>markDone(a)} style={{flex:1,padding:'7px',borderRadius:9,
                  border:'none',background:'var(--success-light)',color:'var(--success)',
                  fontWeight:700,fontSize:12,cursor:'pointer'}}>✅ Выполнен</button>
                <button onClick={()=>cancelAppt(a)} style={{flex:1,padding:'7px',borderRadius:9,
                  border:'none',background:'var(--danger-light)',color:'var(--danger)',
                  fontWeight:700,fontSize:12,cursor:'pointer'}}>❌ Отменить</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
