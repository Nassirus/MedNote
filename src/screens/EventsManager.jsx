import { useState, useMemo } from 'react'
import { TYPE_CONFIG, EVENT_COLORS } from '../constants'
import { isDoneToday } from '../lib/dateUtils'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

function getColor(item) {
  const c = EVENT_COLORS.find(c => c.id === item.color)
  if (c) return c
  const cfg = TYPE_CONFIG[item.type]
  return { hex: cfg?.color || '#2563EB', light: cfg?.bg || '#EFF6FF' }
}

// Group items by title+type
function groupItems(items) {
  const map = {}
  for (const item of items) {
    const key = `${item.type}__${item.title}`
    if (!map[key]) map[key] = { key, type: item.type, title: item.title, color: item.color, items: [] }
    map[key].items.push(item)
  }
  return Object.values(map).sort((a, b) => a.title.localeCompare(b.title, 'ru'))
}

// ── Inline edit row ──────────────────────────────────────────────────
function EditRow({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    title:   item.title || '',
    time:    item.time  || '08:00',
    endTime: item.endTime || '',
    notes:   item.notes || '',
    freq:    item.freq  || 'Ежедневно',
  })
  return (
    <div style={{ background: 'var(--primary-light)', borderRadius: 9, padding: '10px 12px',
      border: '1.5px solid var(--primary-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input className="input" value={form.title} placeholder="Название"
        onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>Начало</div>
          <input type="time" className="input" value={form.time}
            onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>Конец</div>
          <input type="time" className="input" value={form.endTime}
            onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} />
        </div>
      </div>
      <input className="input" value={form.notes} placeholder="Примечание"
        onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }}>Отмена</button>
        <button onClick={() => onSave(form)} className="btn btn-primary" style={{ flex: 2, fontSize: 12 }}>✓ Сохранить</button>
      </div>
    </div>
  )
}

export default function EventsManager({ items, update, remove, removeGroup, removeDates, onBack }) {
  const [search, setSearch]         = useState('')
  const [filterType, setFilterType] = useState('all')
  const [expanded, setExpanded]     = useState(null)
  const [editingId, setEditingId]   = useState(null)
  const [selDates, setSelDates]     = useState(new Set())
  const [confirmDelete, setConfirmDelete] = useState(null) // { type:'group'|'single', id?, title?, itemType? }

  const filtered = useMemo(() => {
    return groupItems(
      items.filter(i => {
        const matchType   = filterType === 'all' || i.type === filterType
        const matchSearch = !search || i.title.toLowerCase().includes(search.toLowerCase())
        return matchType && matchSearch
      })
    )
  }, [items, search, filterType])

  const totalItems  = items.length
  const courseItems = items.filter(i => i.date).length
  const recurItems  = items.filter(i => !i.date).length

  function saveEdit(id, form) {
    update(id, form)
    setEditingId(null)
  }

  function toggleDate(dateStr) {
    setSelDates(p => { const n = new Set(p); n.has(dateStr) ? n.delete(dateStr) : n.add(dateStr); return n })
  }

  function toggleExpandGroup(key) {
    setExpanded(p => p === key ? null : key)
    setSelDates(new Set())
    setEditingId(null)
  }

  // Confirm delete modal
  const ConfirmModal = confirmDelete ? (
    <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🗑️</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', textAlign: 'center', marginBottom: 8 }}>
          {confirmDelete.type === 'group' ? 'Удалить весь курс?' : 'Удалить событие?'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>
          {confirmDelete.type === 'group'
            ? `Будет удалено ${confirmDelete.count} записей "${confirmDelete.title}". Действие необратимо.`
            : `Будет удалена запись "${confirmDelete.title}".`}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setConfirmDelete(null)} className="btn btn-ghost" style={{ flex: 1 }}>Отмена</button>
          <button onClick={() => {
            if (confirmDelete.type === 'group') {
              removeGroup(confirmDelete.title, confirmDelete.itemType)
              setExpanded(null)
            } else {
              remove(confirmDelete.id)
            }
            setConfirmDelete(null)
          }} className="btn" style={{ flex: 1, background: 'var(--danger)', color: 'white' }}>
            Удалить
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }}>←</button>
          <div>
            <h1 style={{ fontWeight: 700, fontSize: 17 }}>Управление событиями</h1>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{totalItems} записей</div>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
          {[['Всего', totalItems, 'var(--primary)'], ['Курсы', courseItems, 'var(--purple)'], ['Регулярные', recurItems, 'var(--success)']].map(([l,v,c]) => (
            <div key={l} style={{ background: 'white', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <input className="input" placeholder="🔍 Поиск по названию..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 10 }} />

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
          <button onClick={() => setFilterType('all')} style={{
            padding: '4px 10px', borderRadius: 20, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: filterType === 'all' ? 'var(--primary)' : 'var(--surface2)',
            color: filterType === 'all' ? 'white' : 'var(--text3)'
          }}>Все</button>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setFilterType(filterType === k ? 'all' : k)} style={{
              padding: '4px 10px', borderRadius: 20, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: filterType === k ? v.color : 'var(--surface2)',
              color: filterType === k ? 'white' : 'var(--text3)'
            }}>{v.icon} {v.label}</button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Ничего не найдено</div>
          </div>
        )}

        {/* Groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(group => {
            const cfg    = TYPE_CONFIG[group.type] || TYPE_CONFIG.routine
            const ic     = getColor({ color: group.color, type: group.type })
            const isOpen = expanded === group.key
            const sorted = [...group.items].sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''))
            const isCourse = group.items.some(i => i.date)

            return (
              <div key={group.key}>
                {/* Group header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px',
                  background: 'white', borderRadius: isOpen ? '12px 12px 0 0' : 12,
                  border: `1px solid ${ic.hex}33`, borderLeft: `4px solid ${ic.hex}`,
                  boxShadow: 'var(--shadow)', cursor: 'pointer'
                }} onClick={() => toggleExpandGroup(group.key)}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {group.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, display: 'flex', gap: 8 }}>
                      <span>{cfg.label}</span>
                      {isCourse
                        ? <span style={{ color: 'var(--purple)', fontWeight: 600 }}>📆 {group.items.length} дн.</span>
                        : <span style={{ color: 'var(--success)', fontWeight: 600 }}>🔄 Регулярно</span>}
                    </div>
                  </div>
                  {/* Delete whole group */}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setConfirmDelete({ type: 'group', title: group.title, itemType: group.type, count: group.items.length })
                    }}
                    style={{ background: 'var(--danger-light)', border: 'none', borderRadius: 7,
                      width: 30, height: 30, color: 'var(--danger)', fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>
                    🗑
                  </button>
                  <div style={{ color: 'var(--text3)', fontSize: 14, flexShrink: 0 }}>
                    {isOpen ? '▲' : '▼'}
                  </div>
                </div>

                {/* Expanded entries */}
                {isOpen && (
                  <div style={{ background: 'var(--surface2)', borderRadius: '0 0 12px 12px',
                    border: `1px solid ${ic.hex}22`, borderTop: 'none', padding: '8px 10px',
                    display: 'flex', flexDirection: 'column', gap: 6 }}>

                    {/* Multi-date delete bar */}
                    {selDates.size > 0 && (
                      <div style={{ display: 'flex', gap: 8, padding: '8px 10px',
                        background: 'var(--danger-light)', borderRadius: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)', flex: 1 }}>
                          Выбрано: {selDates.size} дн.
                        </span>
                        <button onClick={() => { removeDates(group.title, group.type, [...selDates]); setSelDates(new Set()) }}
                          className="btn btn-danger" style={{ fontSize: 11, padding: '5px 10px' }}>
                          🗑 Удалить выбранные
                        </button>
                        <button onClick={() => setSelDates(new Set())}
                          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>✕</button>
                      </div>
                    )}

                    {sorted.map(item => {
                      const isEditing = editingId === item.id
                      const isSel     = item.date && selDates.has(item.date)
                      const done      = isDoneToday(item)

                      if (isEditing) {
                        return (
                          <EditRow key={item.id} item={item}
                            onSave={form => saveEdit(item.id, form)}
                            onCancel={() => setEditingId(null)} />
                        )
                      }

                      return (
                        <div key={item.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px',
                          background: isSel ? '#FFF5F5' : 'white', borderRadius: 9,
                          border: `1.5px solid ${isSel ? 'var(--danger)' : 'var(--border)'}`,
                          opacity: done ? 0.6 : 1, transition: 'all .15s'
                        }}>
                          {/* Checkbox for multi-select (date items only) */}
                          {item.date ? (
                            <button onClick={() => toggleDate(item.date)} style={{
                              width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                              border: `2px solid ${isSel ? 'var(--danger)' : 'var(--border2)'}`,
                              background: isSel ? 'var(--danger)' : 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {isSel && <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>✓</span>}
                            </button>
                          ) : (
                            <div style={{ width: 18, flexShrink: 0 }} />
                          )}

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.date
                                ? format(parseISO(item.date), 'EEEE, d MMM yyyy', { locale: ru })
                                : `${item.freq || 'Регулярно'}`}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, display: 'flex', gap: 8 }}>
                              <span>⏰ {item.time}{item.endTime ? '–' + item.endTime : ''}</span>
                              {item.notes && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{item.notes}</span>}
                              {done && <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓</span>}
                            </div>
                          </div>

                          {/* Edit */}
                          <button onClick={() => setEditingId(item.id)} style={{
                            background: 'var(--primary-light)', border: 'none', borderRadius: 6,
                            width: 28, height: 28, color: 'var(--primary)', fontSize: 13, cursor: 'pointer', flexShrink: 0
                          }}>✏️</button>

                          {/* Delete single */}
                          <button onClick={() => setConfirmDelete({ type: 'single', id: item.id, title: item.title })} style={{
                            background: 'var(--danger-light)', border: 'none', borderRadius: 6,
                            width: 28, height: 28, color: 'var(--danger)', fontSize: 13, cursor: 'pointer', flexShrink: 0
                          }}>🗑</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirm modal */}
      {ConfirmModal}
    </div>
  )
}
