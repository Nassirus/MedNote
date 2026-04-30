import { TypeIcon, IcTrash, IcCheck, IcPencil, IcSave, IcLoader, IcCalendarX, IcX, IcPlus } from '../../components/Icons'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  collection, query, where, addDoc, doc,
  onSnapshot, serverTimestamp, updateDoc, deleteDoc
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import {
  format, addDays, addMonths, subMonths,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday
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
const TYPE_LABELS = {
  appointment:'Приём',
  procedure: 'Процедура',
  medication: 'Лекарство',
  exercise: 'ЛФК',
  other: 'Другое',
}

// ── Appointment form (modal bottom sheet) ─────────────────
function AppointmentForm({ date, appt, doctorUid, patients, onClose, onSaved }) {
  const editing = !!appt
  const [title,    setTitle]    = useState(appt?.title    || '')
  const [time,     setTime]     = useState(appt?.time     || '09:00')
  const [type,     setType]     = useState(appt?.type     || 'appointment')
  const [patient,  setPatient]  = useState(appt?.patient_id || '')
  const [notes,    setNotes]    = useState(appt?.notes    || '')
  const [duration, setDuration] = useState(appt?.duration_min || 30)
  const [loading,  setLoading]  = useState(false)
  const [err,      setErr]      = useState('')

  async function save() {
    if (!title.trim()) { setErr('Введите название'); return }
    setLoading(true); setErr('')
    try {
      const sel = patients.find(p => p.id === patient)
      const data = {
        doctor_uid:   doctorUid,
        patient_id:   patient || null,
        patient_name: sel?.patient_name || '',
        patient_uid:  sel?.patient_uid  || null,
        patient_has_account: sel?.has_account || false,
        title:        title.trim(),
        type,
        date:         format(date, 'yyyy-MM-dd'),
        time,
        duration_min: duration,
        notes:        notes.trim(),
        status:       'scheduled',
      }
      if (editing) {
        await updateDoc(doc(db, 'doctor_appointments', appt.id), data)
      } else {
        await addDoc(collection(db, 'doctor_appointments'), {
          ...data, created_at: serverTimestamp()
        })
        // Mirror to patient's MedNOTE if they have account
        if (sel?.patient_uid) {
          await addDoc(collection(db, 'schedule_items'), {
            user_id:   sel.patient_uid,
            type:      'appointment',
            title:     title.trim(),
            time,
            endTime:   null,
            notes:     notes.trim(),
            freq:      'Разово',
            date:      format(date, 'yyyy-MM-dd'),
            color:     null, done: false,
            added_by:  'doctor',
            created_at: serverTimestamp(),
          })
        }
      }
      onSaved()
    } catch(e) { setErr(e.message) }
    setLoading(false)
  }

  async function remove() {
    if (!editing) return
    await deleteDoc(doc(db, 'doctor_appointments', appt.id))
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)',
      zIndex:999, display:'flex', alignItems:'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'white', borderRadius:'18px 18px 0 0',
        padding:'22px 20px 32px', width:'100%', maxHeight:'90vh', overflow:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between',
          alignItems:'center', marginBottom:18 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:17 }}>
              {editing ? 'Редактировать приём' : 'Новый приём'}
            </div>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
              {format(date, 'd MMMM yyyy', { locale:ru })}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none',
            cursor:'pointer', fontSize:24, color:'var(--text3)', padding:0 }}>×</button>
        </div>

        {/* Type pills */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
          {Object.entries(TYPE_LABELS).map(([v,l]) => (
            <button key={v} onClick={() => setType(v)} style={{
              padding:'7px 12px', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:700,
              border:`1.5px solid ${type===v ? TYPE_COLORS[v] : 'var(--border)'}`,
              background: type===v ? TYPE_COLORS[v]+'20' : 'white',
              color: type===v ? TYPE_COLORS[v] : 'var(--text3)',
            }}>{l}</button>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label className="label">Название *</label>
            <input className="input" placeholder="Плановый приём, перевязка, консультация..."
              value={title} onChange={e => setTitle(e.target.value)}/>
          </div>

          <div>
            <label className="label">Пациент</label>
            <select className="input" value={patient} onChange={e => setPatient(e.target.value)}>
              <option value="">— Без пациента —</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.patient_name}{p.has_account ? ' ●' : ''}
                </option>
              ))}
            </select>
            {patients.length === 0 && (
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
                Добавьте пациентов во вкладке «Пациенты»
              </div>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label className="label">Время</label>
              <input type="time" className="input" value={time}
                onChange={e => setTime(e.target.value)}/>
            </div>
            <div>
              <label className="label">Длительность</label>
              <select className="input" value={duration}
                onChange={e => setDuration(parseInt(e.target.value))}>
                {[10,15,20,30,45,60,90,120].map(m => (
                  <option key={m} value={m}>{m} мин</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Примечание</label>
            <textarea className="input" placeholder="Жалобы, цель визита, анамнез..."
              rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              style={{ resize:'none' }}/>
          </div>

          {err && <div style={{ padding:'9px 12px', borderRadius:9, fontSize:12,
            background:'var(--danger-light)', color:'var(--danger)' }}><IcX size={12} color='var(--danger)'/> {err}</div>}

          <div style={{ display:'flex', gap:10 }}>
            {editing && (
              <button onClick={remove} style={{ flex:1, padding:'12px', borderRadius:12,
                border:'none', background:'var(--danger-light)', color:'var(--danger)',
                fontWeight:700, fontSize:13, cursor:'pointer' }}>
                <IcTrash size={14}/> Удалить
              </button>
            )}
            <button onClick={save} disabled={loading} style={{
              flex:2, padding:'13px', borderRadius:12, border:'none',
              background: loading ? 'var(--surface2)' : '#1D4ED8',
              color: loading ? 'var(--text3)' : 'white',
              fontWeight:800, fontSize:14, cursor: loading ? 'default' : 'pointer',
            }}>
              {loading ? 'Сохранение...' : editing ? 'Сохранить' : '+ Добавить приём'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Appointment detail card ────────────────────────────────
function ApptCard({ appt, onEdit, onDone, onCancel }) {
  const color = TYPE_COLORS[appt.type] || TYPE_COLORS.other
  const isDone = appt.status === 'done'
  const isCancelled = appt.status === 'cancelled'

  return (
    <div style={{
      background: isDone ? '#F0FDF4' : isCancelled ? 'var(--surface2)' : 'white',
      borderRadius:14, padding:'14px 16px',
      border:`1.5px solid ${isDone ? '#A7F3D0' : isCancelled ? 'var(--border)' : color+'44'}`,
      borderLeft:`4px solid ${isDone ? 'var(--success)' : isCancelled ? 'var(--border2)' : color}`,
      opacity: isCancelled ? 0.6 : 1,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:6, gap:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:14,
            textDecoration: isCancelled ? 'line-through' : 'none' }}>
            {appt.title}
          </div>
          {appt.patient_name && (
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:2, display:'flex', gap:6 }}>
              <span>{appt.patient_name}</span>
              {appt.patient_has_account && (
                <span style={{ color:'var(--success)', fontWeight:600, fontSize:10 }}>● MedNOTE</span>
              )}
            </div>
          )}
          {appt.notes && (
            <div style={{ fontSize:12, color:'var(--text2)', marginTop:4, lineHeight:1.5 }}>
              {appt.notes.slice(0, 100)}{appt.notes.length > 100 ? '...' : ''}
            </div>
          )}
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontWeight:800, fontSize:15, color: isDone ? 'var(--success)' : color }}>
            {appt.time}
          </div>
          <div style={{ fontSize:10, color:'var(--text3)', marginTop:1 }}>
            {appt.duration_min} мин
          </div>
        </div>
      </div>

      {!isCancelled && !isDone && (
        <div style={{ display:'flex', gap:6, marginTop:10 }}>
          <button onClick={() => onEdit(appt)} style={{
            padding:'7px 12px', borderRadius:9, border:'1px solid var(--border)',
            background:'white', color:'var(--text2)', fontSize:12, fontWeight:600, cursor:'pointer'
          }}><IcPencil size={14}/> Изменить</button>
          <button onClick={() => onDone(appt)} style={{
            flex:1, padding:'7px', borderRadius:9, border:'none',
            background:'var(--success-light)', color:'var(--success)',
            fontSize:12, fontWeight:700, cursor:'pointer'
          }}><IcCheck size={14}/> Выполнен</button>
          <button onClick={() => onCancel(appt)} style={{
            padding:'7px 12px', borderRadius:9, border:'none',
            background:'var(--danger-light)', color:'var(--danger)',
            fontSize:12, fontWeight:700, cursor:'pointer'
          }}><IcX size={14}/></button>
        </div>
      )}

      {isDone && (
        <div style={{ fontSize:12, color:'var(--success)', fontWeight:600, marginTop:6 }}>
          <IcCheck size={14} color='var(--success)'/> Выполнен
        </div>
      )}
    </div>
  )
}

// ── Main DoctorCalendar ────────────────────────────────────
export default function DoctorCalendar() {
  const { user } = useAuth()
  const [view,     setView]     = useState('month') // month | week
  const [month,    setMonth]    = useState(new Date())
  const [selected, setSelected] = useState(new Date())
  const [appts,    setAppts]    = useState([])
  const [patients, setPatients] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editAppt, setEditAppt] = useState(null)
  const [msg,      setMsg]      = useState('')

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'doctor_appointments'),
      where('doctor_uid', '==', user.uid))
    return onSnapshot(q, snap =>
      setAppts(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    )
  }, [user])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'doctor_patients'),
      where('doctor_uid', '==', user.uid))
    return onSnapshot(q, snap =>
      setPatients(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    )
  }, [user])

  async function markDone(appt) {
    await updateDoc(doc(db, 'doctor_appointments', appt.id), { status:'done' })
    flash('Приём отмечен выполненным')
  }

  async function markCancelled(appt) {
    await updateDoc(doc(db, 'doctor_appointments', appt.id), { status:'cancelled' })
    flash('Приём отменён')
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  function apptsForDay(day) {
    const ds = format(day, 'yyyy-MM-dd')
    return appts
      .filter(a => a.date === ds && a.status !== 'cancelled')
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }

  const selectedStr = format(selected, 'yyyy-MM-dd')
  const dayAppts = apptsForDay(selected)

  // ── Month calendar ──────────────────────────────────────
  const monthStart = startOfMonth(month)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn:1 }),
    end:   endOfWeek(endOfMonth(month), { weekStartsOn:1 }),
  })

  // ── Week view ───────────────────────────────────────────
  const weekStart = startOfWeek(selected, { weekStartsOn:1 })
  const weekDays  = Array.from({ length:7 }, (_, i) => addDays(weekStart, i))
  const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

  // Stats for current month
  const monthStr  = format(month, 'yyyy-MM')
  const monthAppts = appts.filter(a => (a.date || '').startsWith(monthStr))
  const doneCount  = monthAppts.filter(a => a.status === 'done').length
  const totalCount = monthAppts.filter(a => a.status !== 'cancelled').length

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {(showForm || editAppt) && (
        <AppointmentForm
          date={selected}
          appt={editAppt}
          doctorUid={user.uid}
          patients={patients}
          onClose={() => { setShowForm(false); setEditAppt(null) }}
          onSaved={() => {
            setShowForm(false); setEditAppt(null)
            flash(editAppt ? 'Приём обновлён' : 'Приём добавлен')
          }}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <h1 style={{ fontWeight:700, fontSize:18 }}>Расписание приёмов</h1>
        <div style={{ display:'flex', gap:6 }}>
          {/* View toggle */}
          <div style={{ display:'flex', background:'var(--surface2)',
            borderRadius:9, padding:3, gap:2 }}>
            {[['month','Месяц'],['week','Неделя']].map(([v,l]) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding:'5px 10px', borderRadius:7, border:'none', cursor:'pointer',
                fontSize:12, fontWeight:700,
                background: view===v ? 'white' : 'transparent',
                color: view===v ? 'var(--primary)' : 'var(--text3)',
                boxShadow: view===v ? 'var(--shadow)' : 'none',
              }}>{l}</button>
            ))}
          </div>
          <button onClick={() => { setShowForm(true); setEditAppt(null) }} style={{
            padding:'8px 14px', borderRadius:10, border:'none',
            background:'#1D4ED8', color:'white', fontWeight:700, fontSize:13, cursor:'pointer'
          }}>+ Приём</button>
        </div>
      </div>

      <div className="page-content" style={{ display:'flex', flexDirection:'column', gap:12 }}>

        {/* Flash message */}
        {msg && (
          <div style={{ padding:'10px 14px', borderRadius:10, fontSize:13, fontWeight:600,
            background: msg.includes('добавлен') || msg.includes('обновлён') || msg.includes('отмечен') ? 'var(--success-light)' : 'var(--surface2)',
            border:`1px solid ${msg.includes('добавлен') || msg.includes('обновлён') || msg.includes('отмечен') ? '#A7F3D0' : 'var(--border)'}`,
            color: msg.includes('добавлен') || msg.includes('обновлён') || msg.includes('отмечен') ? 'var(--success)' : 'var(--text2)' }}>
            {msg}
          </div>
        )}

        {/* Month stats */}
        <div style={{ display:'flex', gap:8 }}>
          {[
            [totalCount,    'Приёмов в месяц', '#1D4ED8'],
            [doneCount,     'Выполнено',        'var(--success)'],
            [patients.length,'Пациентов',       'var(--purple)'],
          ].map(([v,l,c]) => (
            <div key={l} style={{ flex:1, background:'white', borderRadius:12,
              padding:'12px 10px', border:'1px solid var(--border)', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:900, color:c }}>{v}</div>
              <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Nav — month or week depending on view */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'white', borderRadius:14, padding:'12px 16px',
          border:'1px solid var(--border)' }}>
          <button
            onClick={() => {
              if (view === 'week') {
                const prev = addDays(weekStart, -7)
                setSelected(prev)
                setMonth(prev)
              } else {
                setMonth(m => subMonths(m, 1))
              }
            }}
            style={{ background:'none', border:'none', cursor:'pointer',
              fontSize:20, color:'var(--text3)', padding:'0 8px' }}>‹</button>

          <button
            onClick={() => { setMonth(new Date()); setSelected(new Date()) }}
            style={{ fontWeight:700, fontSize:15, background:'none', border:'none',
              cursor:'pointer', color:'var(--text)' }}>
            {view === 'week'
              ? `${format(weekStart, 'd MMM', { locale:ru })} — ${format(addDays(weekStart,6), 'd MMM yyyy', { locale:ru })}`
              : format(month, 'LLLL yyyy', { locale:ru })
            }
          </button>

          <button
            onClick={() => {
              if (view === 'week') {
                const next = addDays(weekStart, 7)
                setSelected(next)
                setMonth(next)
              } else {
                setMonth(m => addMonths(m, 1))
              }
            }}
            style={{ background:'none', border:'none', cursor:'pointer',
              fontSize:20, color:'var(--text3)', padding:'0 8px' }}>›</button>
        </div>

        {/* ── MONTH VIEW ── */}
        {view === 'month' && (
          <div style={{ background:'white', borderRadius:14, border:'1px solid var(--border)' }}>
            {/* Day headers */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)',
              borderBottom:'1px solid var(--border)' }}>
              {DOW.map(d => (
                <div key={d} style={{ textAlign:'center', padding:'8px 0',
                  fontSize:11, fontWeight:700, color:'var(--text3)' }}>{d}</div>
              ))}
            </div>
            {/* Days — auto height, no overflow clipping */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
              {days.map(day => {
                const da    = apptsForDay(day)
                const sel   = isSameDay(day, selected)
                const today = isToday(day)
                const inMon = isSameMonth(day, month)
                return (
                  <button key={day.toISOString()} onClick={() => setSelected(day)}
                    style={{
                      minHeight:'56px', display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'flex-start',
                      padding:'7px 4px 5px',
                      border:'none',
                      borderBottom:'1px solid var(--border)',
                      borderRight:'1px solid var(--border)',
                      outline: sel ? '2px solid #1D4ED8' : 'none',
                      outlineOffset: '-2px',
                      background: sel ? '#EFF6FF' : today ? '#F0FDF4' : 'white',
                      cursor:'pointer',
                    }}>
                    <span style={{ fontSize:13, fontWeight: sel||today ? 800 : 400,
                      color: !inMon ? 'var(--border2)' : sel ? '#1D4ED8' :
                        today ? 'var(--success)' : 'var(--text)' }}>
                      {format(day, 'd')}
                    </span>
                    <div style={{ display:'flex', gap:1, marginTop:2,
                      flexWrap:'wrap', justifyContent:'center' }}>
                      {da.slice(0,3).map((a,i) => (
                        <div key={i} style={{
                          width:6, height:6, borderRadius:'50%',
                          background: TYPE_COLORS[a.type] || TYPE_COLORS.other,
                        }}/>
                      ))}
                      {da.length > 3 && (
                        <span style={{ fontSize:8, color:'var(--text3)',
                          lineHeight:1 }}>+{da.length-3}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── WEEK VIEW — time grid ── */}
        {view === 'week' && (
          <div style={{ background:'white', borderRadius:14, border:'1px solid var(--border)' }}>

            {/* Day header row */}
            <div style={{ display:'grid', gridTemplateColumns:'48px repeat(7,1fr)',
              borderBottom:'1px solid var(--border)', position:'sticky', top:0,
              background:'white', zIndex:2 }}>
              <div style={{ borderRight:'1px solid var(--border)' }}/>
              {weekDays.map((day,i) => {
                const da  = apptsForDay(day)
                const sel = isSameDay(day, selected)
                const td  = isToday(day)
                return (
                  <button key={i} onClick={() => setSelected(day)} style={{
                    display:'flex', flexDirection:'column', alignItems:'center',
                    padding:'8px 4px', border:'none', cursor:'pointer',
                    background: sel ? '#EFF6FF' : 'white',
                    borderBottom: sel ? '3px solid #1D4ED8' : '3px solid transparent',
                    borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontSize:10, color:'var(--text3)', fontWeight:600 }}>
                      {DOW[i]}
                    </span>
                    <span style={{ fontSize:16, fontWeight: sel||td ? 800 : 400,
                      color: sel ? '#1D4ED8' : td ? '#059669' : 'var(--text)',
                      width:28, height:28, borderRadius:'50%',
                      background: td ? '#F0FDF4' : 'transparent',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      marginTop:2 }}>
                      {format(day,'d')}
                    </span>
                    {da.length > 0 && (
                      <div style={{ fontSize:9, fontWeight:700, color:'#1D4ED8', marginTop:2 }}>
                        {da.length}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Time grid — 07:00 to 21:00 */}
            <div style={{ overflowY:'auto', maxHeight:'calc(100dvh - 380px)', minHeight:300 }}>
              {Array.from({ length:15 }, (_, hi) => hi + 7).map(hour => {
                return (
                  <div key={hour} style={{ display:'grid',
                    gridTemplateColumns:'48px repeat(7,1fr)',
                    borderBottom:'1px solid var(--border)', minHeight:56 }}>
                    {/* Hour label */}
                    <div style={{ borderRight:'1px solid var(--border)',
                      display:'flex', alignItems:'flex-start', justifyContent:'center',
                      paddingTop:4, fontSize:11, color:'var(--text3)', fontWeight:500,
                      flexShrink:0 }}>
                      {String(hour).padStart(2,'0')}:00
                    </div>
                    {/* Day columns */}
                    {weekDays.map((day,di) => {
                      const ds   = format(day,'yyyy-MM-dd')
                      const slot = appts.filter(a =>
                        a.date === ds &&
                        a.status !== 'cancelled' &&
                        parseInt((a.time||'00:00').split(':')[0]) === hour
                      )
                      return (
                        <div key={di} onClick={() => { setSelected(day); setShowForm(true) }}
                          style={{
                            borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                            padding:'2px 3px', cursor:'pointer', minHeight:56,
                            background: isSameDay(day,selected) ? '#F8FBFF' : 'white',
                          }}>
                          {slot.map(a => (
                            <div key={a.id}
                              onClick={e => { e.stopPropagation(); setEditAppt(a); setShowForm(true) }}
                              style={{
                                background: TYPE_COLORS[a.type] || TYPE_COLORS.other,
                                color:'white', borderRadius:5, padding:'2px 5px',
                                fontSize:10, fontWeight:600, marginBottom:2,
                                cursor:'pointer', lineHeight:1.4,
                                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                              }}>
                              {a.time} {a.title}
                              {a.patient_name && (
                                <span style={{ opacity:.8 }}> · {a.patient_name.split(' ')[0]}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Selected day appointments ── */}
        <div style={{ fontWeight:700, fontSize:12, color:'var(--text3)',
          letterSpacing:'.3px', textTransform:'uppercase' }}>
          {format(selected, 'd MMMM, EEEE', { locale:ru })}
          {' '}—{' '}
          {dayAppts.length > 0 ? `${dayAppts.length} приём${dayAppts.length > 1 ? 'а' : ''}` : 'нет приёмов'}
        </div>

        {dayAppts.length === 0 ? (
          <div style={{ textAlign:'center', padding:'30px 20px', color:'var(--text3)' }}>
            <IcCalendarX size={36} color="var(--border2)" style={{marginBottom:10}}/>
            <div style={{ fontSize:13 }}>На этот день приёмов нет</div>
            <button onClick={() => { setShowForm(true); setEditAppt(null) }}
              style={{ marginTop:12, background:'none', border:'none',
                color:'#1D4ED8', fontWeight:700, cursor:'pointer', fontSize:13 }}>
              + Добавить приём
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {dayAppts.map(a => (
              <ApptCard key={a.id} appt={a}
                onEdit={a => { setEditAppt(a); setShowForm(true) }}
                onDone={markDone}
                onCancel={markCancelled}
              />
            ))}
          </div>
        )}

        {/* Cancelled appointments (collapsed) */}
        {appts.filter(a => a.date === selectedStr && a.status === 'cancelled').length > 0 && (
          <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center' }}>
            + {appts.filter(a => a.date === selectedStr && a.status === 'cancelled').length} отменённых
          </div>
        )}
      </div>
    </div>
  )
}
