import { useState } from 'react'
import { TYPE_CONFIG } from '../constants'
import {
  format, addDays, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isToday, isBefore
} from 'date-fns'
import { ru } from 'date-fns/locale'

const EMPTY = { type: 'medication', title: '', time: '08:00', notes: '', freq: 'Ежедневно' }
const DOW   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

export default function AddItemModal({ onAdd, onClose, defaultDate }) {
  const [step, setStep]     = useState(1)
  const [form, setForm]     = useState(EMPTY)
  // Pre-select defaultDate if provided (e.g. from CalendarView)
  const [dates, setDates]   = useState(defaultDate ? [defaultDate] : [])
  const [recurring, setRecurring] = useState(defaultDate ? 'custom' : 'daily')
  const [err, setErr]       = useState('')
  const [month, setMonth]   = useState(defaultDate || new Date())

  const cfg      = TYPE_CONFIG[form.type] || TYPE_CONFIG.medication
  const calStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const calEnd   = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const calDays  = eachDayOfInterval({ start: calStart, end: calEnd })

  function toggleDate(day) {
    if (isBefore(day, addDays(new Date(), -1))) return
    setDates(prev => {
      const exists = prev.some(d => isSameDay(d, day))
      return exists ? prev.filter(d => !isSameDay(d, day)) : [...prev, day]
    })
    setErr('')
  }

  function next() {
    if (!form.title.trim()) { setErr('Введите название'); return }
    setErr('')
    setStep(2)
  }

  function submit() {
    if (recurring === 'custom' && dates.length === 0) {
      setErr('Выберите хотя бы одну дату')
      return
    }
    if (recurring === 'daily') {
      onAdd({ ...form, date: null })
    } else {
      dates.sort((a, b) => a - b).forEach(d => {
        onAdd({ ...form, date: format(d, 'yyyy-MM-dd'), freq: 'Разово' })
      })
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '92dvh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {step === 2 && (
              <button onClick={() => { setStep(1); setErr('') }}
                style={{ background: 'var(--surface2)', border: 'none', borderRadius: 8, width: 30, height: 30, fontSize: 16, color: 'var(--text2)' }}>←</button>
            )}
            <h3 style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>
              {step === 1 ? 'Что добавить?' : 'Когда?'}
            </h3>
          </div>
          <button onClick={onClose}
            style={{ background: 'var(--surface2)', border: 'none', borderRadius: '50%', width: 30, height: 30, fontSize: 15, color: 'var(--text2)' }}>✕</button>
        </div>

        {/* Step bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[1,2].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 99, background: s <= step ? 'var(--primary)' : 'var(--border)', transition: 'background .2s' }} />
          ))}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Type */}
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Тип</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <button key={k} onClick={() => setForm(p => ({ ...p, type: k }))} style={{
                    padding: '10px 4px', borderRadius: 10,
                    border: `2px solid ${form.type === k ? v.color : 'var(--border)'}`,
                    background: form.type === k ? v.bg : 'white',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    transition: 'all .12s'
                  }}>
                    <span style={{ fontSize: 20 }}>{v.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: form.type === k ? v.color : 'var(--text3)' }}>{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <div className="label">Название *</div>
              <input className="input" value={form.title} autoFocus
                onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setErr('') }}
                placeholder={`Например: ${cfg.label}...`}
                onKeyDown={e => e.key === 'Enter' && next()} />
              {err && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 5 }}>{err}</p>}
            </div>

            {/* Time + Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="label">Время</div>
                <input type="time" className="input" value={form.time}
                  onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
              </div>
              <div>
                <div className="label">Примечание</div>
                <input className="input" value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Дозировка, инструкция..." />
              </div>
            </div>

            <button className="btn btn-primary" onClick={next} style={{ width: '100%', padding: 12 }}>
              Далее — выбрать даты →
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Preview chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: cfg.bg, borderRadius: 10, border: `1px solid ${cfg.color}33` }}>
              <span style={{ fontSize: 20 }}>{cfg.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{form.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>⏰ {form.time} · {cfg.label}</div>
              </div>
            </div>

            {/* Mode toggle */}
            <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 10, padding: 3 }}>
              {[['daily','🔄 Регулярно'], ['custom','📅 Конкретные даты']].map(([k, l]) => (
                <button key={k} onClick={() => { setRecurring(k); setErr('') }} style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 12,
                  background: recurring === k ? 'white' : 'transparent',
                  color: recurring === k ? 'var(--primary)' : 'var(--text3)',
                  boxShadow: recurring === k ? 'var(--shadow)' : 'none', transition: 'all .15s'
                }}>{l}</button>
              ))}
            </div>

            {/* DAILY — frequency */}
            {recurring === 'daily' && (
              <div>
                <div className="label">Частота</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {['Ежедневно','По будням','По выходным','Раз в неделю','Раз в 2 дня'].map(f => (
                    <button key={f} onClick={() => setForm(p => ({ ...p, freq: f }))} style={{
                      padding: '7px 12px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600,
                      background: form.freq === f ? 'var(--primary)' : 'var(--surface2)',
                      color: form.freq === f ? 'white' : 'var(--text3)', transition: 'all .12s'
                    }}>{f}</button>
                  ))}
                </div>
              </div>
            )}

            {/* CUSTOM — multi-date calendar */}
            {recurring === 'custom' && (
              <div>
                {/* Month nav */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <button onClick={() => setMonth(p => new Date(p.getFullYear(), p.getMonth()-1, 1))}
                    style={{ background: 'var(--surface2)', border: 'none', borderRadius: 7, width: 28, height: 28, fontSize: 14, cursor: 'pointer' }}>‹</button>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', textTransform: 'capitalize' }}>
                    {format(month, 'LLLL yyyy', { locale: ru })}
                  </span>
                  <button onClick={() => setMonth(p => new Date(p.getFullYear(), p.getMonth()+1, 1))}
                    style={{ background: 'var(--surface2)', border: 'none', borderRadius: 7, width: 28, height: 28, fontSize: 14, cursor: 'pointer' }}>›</button>
                </div>

                {/* DOW row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
                  {DOW.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text3)', padding: '2px 0' }}>{d}</div>
                  ))}
                </div>

                {/* Days grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                  {calDays.map(day => {
                    const isPast   = isBefore(day, addDays(new Date(), -1))
                    const isSel    = dates.some(d => isSameDay(d, day))
                    const isCurMon = day.getMonth() === month.getMonth()
                    const itToday  = isToday(day)
                    return (
                      <button key={day.toISOString()} onClick={() => !isPast && toggleDate(day)} style={{
                        aspectRatio: '1', borderRadius: 7, border: 'none', fontSize: 12,
                        fontWeight: isSel || itToday ? 700 : 400,
                        background: isSel ? 'var(--primary)' : itToday ? 'var(--primary-light)' : 'transparent',
                        color: isSel ? 'white' : itToday ? 'var(--primary)' : isCurMon ? 'var(--text)' : 'var(--text3)',
                        opacity: isPast ? 0.3 : 1,
                        cursor: isPast ? 'not-allowed' : 'pointer',
                        transition: 'all .1s'
                      }}>{format(day, 'd')}</button>
                    )
                  })}
                </div>

                {/* Selected chips */}
                {dates.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {dates.sort((a,b) => a-b).map(d => (
                      <span key={d.toISOString()} onClick={() => toggleDate(d)} style={{
                        padding: '3px 9px', borderRadius: 20, background: 'var(--primary-light)',
                        color: 'var(--primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: '1px solid var(--primary-border)'
                      }}>
                        {format(d, 'd MMM', { locale: ru })} ✕
                      </span>
                    ))}
                  </div>
                )}

                {err && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{err}</p>}
              </div>
            )}

            <button className="btn btn-primary" onClick={submit} style={{ width: '100%', padding: 12, fontSize: 14 }}>
              {cfg.icon} Добавить{recurring === 'custom' && dates.length > 0 ? ` (${dates.length} ${dates.length === 1 ? 'день' : 'дней'})` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
