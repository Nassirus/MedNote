/**
 * PrescriptionRequests.jsx
 * Patient screen: review, edit and accept/reject doctor prescription requests
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { format, addDays } from 'date-fns'
import { ru } from 'date-fns/locale'

const TYPE_ICONS = {
  medication:  '💊',
  exercise:    '🏃',
  procedure:   '🩺',
  appointment: '📅',
  restriction: '⚠️',
  nutrition:   '🥗',
  routine:     '📋',
}

// Single editable prescription item card
function RequestItemCard({ item, onChange }) {
  const [expanded, setExpanded] = useState(false)
  const icon = TYPE_ICONS[item.type] || '📋'

  return (
    <div style={{
      background: 'white', borderRadius: 14,
      border: '1.5px solid var(--primary-border)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow)',
    }}>
      {/* Header — tap to expand */}
      <button onClick={() => setExpanded(p => !p)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 14px', background: 'none', border: 'none',
        cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {item.dose && `${item.dose} · `}
            {item.time} · {item.duration_days ? `${item.duration_days} дн.` : 'Разово'}
            {item.notes ? ` · ${item.notes.slice(0, 30)}` : ''}
          </div>
        </div>
        <span style={{ color: 'var(--text3)', fontSize: 14, flexShrink: 0 }}>
          {expanded ? '▲' : '✏️'}
        </span>
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)',
            textTransform: 'uppercase', letterSpacing: 0.5 }}>
            ✏️ Редактировать под своё расписание
          </div>

          {/* Start date */}
          <div>
            <label className="label">Дата начала</label>
            <input type="date" className="input"
              value={item.start_date || format(new Date(), 'yyyy-MM-dd')}
              onChange={e => onChange({ ...item, start_date: e.target.value })}/>
          </div>

          {/* Time slots */}
          <div>
            <label className="label">
              Время приёма ({item.time_slots?.length || 1} раз в день)
            </label>
            {(item.time_slots || [item.time || '08:00']).map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6,
                alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)',
                  width: 18, flexShrink: 0 }}>{i + 1}.</span>
                <input type="time" className="input"
                  value={t}
                  onChange={e => {
                    const slots = [...(item.time_slots || [item.time || '08:00'])]
                    slots[i] = e.target.value
                    onChange({ ...item, time_slots: slots, time: slots[0] })
                  }}/>
              </div>
            ))}
          </div>

          {/* Duration */}
          <div>
            <label className="label">Количество дней</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[1, 3, 5, 7, 10, 14, 21, 30].map(d => (
                <button key={d} onClick={() => onChange({ ...item, duration_days: d })} style={{
                  padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700,
                  background: item.duration_days === d ? 'var(--primary)' : 'var(--surface2)',
                  color: item.duration_days === d ? 'white' : 'var(--text3)',
                }}>{d} дн.</button>
              ))}
            </div>
          </div>

          {/* Notes (read-only from doctor) */}
          {item.notes && (
            <div style={{ background: 'var(--surface2)', borderRadius: 9,
              padding: '9px 12px', fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
              📋 Заметка врача: {item.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Single prescription request (from one doctor)
function RequestCard({ request, onAccept, onReject }) {
  const [items, setItems] = useState(
    (request.items || []).map((item, i) => ({
      ...item,
      _key: i,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      time_slots: item.time_slots || [item.time || '08:00'],
    }))
  )
  const [loading, setLoading] = useState(false)

  async function accept() {
    setLoading(true)
    await onAccept(request, items)
    setLoading(false)
  }

  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 16,
      border: '2px solid var(--primary-border)', padding: '16px',
      marginBottom: 14 }}>

      {/* Doctor info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#1D4ED8,#2563EB)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 17, color: 'white' }}>
          {request.doctor_name?.charAt(0) || '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{request.doctor_name}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
            {request.clinic_name && `${request.clinic_name} · `}
            {request.created_at?.toDate
              ? format(request.created_at.toDate(), 'd MMMM, HH:mm', { locale: ru })
              : 'Только что'}
          </div>
        </div>
        <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11,
          fontWeight: 700, background: '#FFFBEB', color: '#92400E',
          border: '1px solid #FDE68A' }}>
          ⏳ Ожидает
        </div>
      </div>

      {/* Info banner */}
      <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '10px 12px',
        fontSize: 12, color: '#1E40AF', lineHeight: 1.6, marginBottom: 12,
        border: '1px solid #BFDBFE' }}>
        💡 Вы можете изменить время и дату каждого назначения — нажмите ✏️ на карточке.
        После принятия события появятся в вашем календаре.
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {items.map((item, i) => (
          <RequestItemCard
            key={item._key}
            item={item}
            onChange={updated => setItems(p => p.map((x, j) => j === i ? updated : x))}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => onReject(request)} style={{
          flex: 1, padding: '12px', borderRadius: 12, border: 'none',
          background: 'var(--danger-light)', color: 'var(--danger)',
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          ❌ Отклонить
        </button>
        <button onClick={accept} disabled={loading} style={{
          flex: 2, padding: '12px', borderRadius: 12, border: 'none',
          background: loading ? 'var(--surface2)' : 'var(--success)',
          color: loading ? 'var(--text3)' : 'white',
          fontWeight: 800, fontSize: 14, cursor: loading ? 'default' : 'pointer',
        }}>
          {loading ? '⏳ Добавляю...' : '✅ Принять и добавить в календарь'}
        </button>
      </div>
    </div>
  )
}

// ── Main screen ────────────────────────────────────────────
export default function PrescriptionRequests({ onBack }) {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [doneMsg, setDoneMsg] = useState('')

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'prescription_requests'),
      where('patient_uid', '==', user.uid),
      where('status', '==', 'pending')
    )
    const unsub = onSnapshot(q, snap => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [user])

  async function handleAccept(request, editedItems) {
    try {
      const batch = writeBatch(db)

      // Create schedule items from edited items
      for (const item of editedItems) {
        const days  = item.duration_days || 1
        const slots = item.time_slots || [item.time || '08:00']
        const start = item.start_date
          ? new Date(item.start_date + 'T00:00:00')
          : new Date()

        for (let d = 0; d < days; d++) {
          const dateStr = format(addDays(start, d), 'yyyy-MM-dd')
          for (const t of slots) {
            const ref = doc(collection(db, 'schedule_items'))
            batch.set(ref, {
              user_id:    user.uid,
              type:       item.type,
              title:      item.title,
              time:       t,
              endTime:    null,
              notes:      item.notes || '',
              freq:       'Разово',
              date:       dateStr,
              color:      null,
              done:       false,
              added_by:   'doctor_accepted',
              doctor_name: request.doctor_name,
              created_at: serverTimestamp(),
            })
          }
        }
      }

      // Mark request as accepted
      const reqRef = doc(db, 'prescription_requests', request.id)
      batch.update(reqRef, { status: 'accepted', accepted_at: serverTimestamp() })

      await batch.commit()

      setDoneMsg(`✅ ${editedItems.length} назначений добавлено в календарь!`)
      setTimeout(() => setDoneMsg(''), 4000)
    } catch (e) {
      console.error('Accept error:', e)
    }
  }

  async function handleReject(request) {
    await deleteDoc(doc(db, 'prescription_requests', request.id))
    setDoneMsg('Запрос отклонён')
    setTimeout(() => setDoneMsg(''), 2500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 20, color: 'var(--text3)', padding: 0 }}>←</button>
          <div>
            <h1 style={{ fontWeight: 700, fontSize: 18 }}>Запросы от врача</h1>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              Проверьте и примите назначения
            </div>
          </div>
        </div>
        {requests.length > 0 && (
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--danger)',
            color: 'white', fontWeight: 800, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {requests.length}
          </div>
        )}
      </div>

      <div className="page-content">
        {doneMsg && (
          <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            marginBottom: 12,
            background: doneMsg.startsWith('✅') ? 'var(--success-light)' : 'var(--surface2)',
            border: `1px solid ${doneMsg.startsWith('✅') ? '#A7F3D0' : 'var(--border)'}`,
            color: doneMsg.startsWith('✅') ? 'var(--success)' : 'var(--text2)',
          }}>
            {doneMsg}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>
            ⏳ Загрузка...
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Нет новых запросов
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              Когда врач отправит назначения, они появятся здесь для подтверждения
            </div>
          </div>
        ) : (
          requests.map(req => (
            <RequestCard
              key={req.id}
              request={req}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))
        )}
      </div>
    </div>
  )
}
