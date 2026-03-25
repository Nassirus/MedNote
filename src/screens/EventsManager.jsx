import { useState, useMemo } from 'react'
import { TYPE_CONFIG, EVENT_COLORS } from '../constants'
import { format, parseISO, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { isDoneToday } from '../lib/dateUtils'

function itemColor(item) {
  const c = EVENT_COLORS.find(c => c.id === item.color)
  if (c) return c
  const cfg = TYPE_CONFIG[item.type]
  return { hex: cfg?.color || '#2563EB', light: cfg?.bg || '#EFF6FF' }
}

// Group items by title+type (same "medication course")
function groupItems(items) {
  const groups = {}
  for (const item of items) {
    const key = `${item.type}__${item.title}`
    if (!groups[key]) {
      groups[key] = { key, type: item.type, title: item.title, items: [], color: item.color }
    }
    groups[key].items.push(item)
  }
  return Object.values(groups).sort((a, b) => a.title.localeCompare(b.title))
}

export default function EventsManager({ items, update, remove, removeGroup, removeDates, onBack }) {
  const [search, setSearch]     = useState('')
  const [filterType, setFilterType] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [editing, setEditing]   = useState(null)  // item id
  const [editForm, setEditForm] = useState({})
  const [selDates, setSelDates] = useState(new Set()) // for multi-date delete

  const filtered = useMemo(() => {
    const all = items.filter(i => {
      const matchType = filterType === 'all' || i.type === filterType
      const matchSearch = !search || i.title.toLowerCase().includes(search.toLowerCase())
      return matchType && matchSearch
    })
    return groupItems(all)
  }, [items, search, filterType])

  function startEdit(item) {
    setEditing(item.id)
    setEditForm({ title: item.title, time: item.time, endTime: item.endTime||'', notes: item.notes||'', freq: item.freq||'Ежедневно' })
  }
  function saveEdit(id) {
    update(id, editForm)
    setEditing(null)
  }

  function toggleDateSel(dateStr) {
    setSelDates(p => {
      const n = new Set(p)
      n.has(dateStr) ? n.delete(dateStr) : n.add(dateStr)
      return n
    })
  }

  const totalItems = items.length
  const doneToday  = items.filter(isDoneToday).length
  const courseItems = items.filter(i => i.date).length
  const recurItems  = items.filter(i => !i.date).length

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding:'6px 10px', fontSize:13 }}>← Назад</button>
          <div>
            <h1 style={{ fontWeight:700, fontSize:17 }}>Все события</h1>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{totalItems} записей</div>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
          {[
            ['Всего', totalItems, 'var(--primary)'],
            ['Курсы', courseItems, 'var(--purple)'],
            ['Регулярные', recurItems, 'var(--success)'],
          ].map(([l,v,c]) => (
            <div key={l} style={{ background:'white', borderRadius:10, padding:'10px 8px', textAlign:'center', border:'1px solid var(--border)', boxShadow:'var(--shadow)' }}>
              <div style={{ fontSize:20, fontWeight:800, color:c }}>{v}</div>
              <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <input className="input" placeholder="🔍 Поиск по названию..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ marginBottom:10 }} />

        {/* Type filter */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          <button onClick={() => setFilterType('all')} style={{
            padding:'5px 11px', borderRadius:20, border:'none', fontSize:11, fontWeight:600, cursor:'pointer',
            background: filterType==='all' ? 'var(--primary)' : 'var(--surface2)',
            color: filterType==='all' ? 'white' : 'var(--text3)'
          }}>Все</button>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setFilterType(k)} style={{
              padding:'5px 11px', borderRadius:20, border:'none', fontSize:11, fontWeight:600, cursor:'pointer',
              background: filterType===k ? v.color : 'var(--surface2)',
              color: filterType===k ? 'white' : 'var(--text3)'
            }}>{v.icon} {v.label}</button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text3)' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
            <div style={{ fontSize:14, fontWeight:600 }}>Ничего не найдено</div>
          </div>
        )}

        {/* Groups */}
        {filtered.map(group => {
          const cfg  = TYPE_CONFIG[group.type] || TYPE_CONFIG.routine
          const ic   = itemColor({ color: group.color, type: group.type })
          const isOpen = expanded === group.key
          const sortedItems = [...group.items].sort((a,b) => (a.date||'').localeCompare(b.date||'') || (a.time||'').localeCompare(b.time||''))
          const isCourse = group.items.some(i => i.date)
          const isRecur  = group.items.some(i => !i.date)

          return (
            <div key={group.key} style={{ marginBottom:10 }}>
              {/* Group header */}
              <div style={{
                display:'flex', alignItems:'center', gap:10, padding:'11px 13px',
                background:'white', borderRadius:isOpen ? '12px 12px 0 0' : 12,
                border:`1px solid ${ic.hex}33`, borderLeft:`4px solid ${ic.hex}`,
                boxShadow:'var(--shadow)', cursor:'pointer'
              }} onClick={() => { setExpanded(isOpen ? null : group.key); setSelDates(new Set()) }}>
                <div style={{ width:38, height:38, borderRadius:10, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{group.title}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:2, display:'flex', gap:8 }}>
                    <span>{cfg.label}</span>
                    {isCourse && <span style={{ color:'var(--purple)', fontWeight:600 }}>📆 {group.items.length} дн.</span>}
                    {isRecur  && <span style={{ color:'var(--success)', fontWeight:600 }}>🔄 Регулярно</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  {/* Delete whole group */}
                  <button onClick={e => { e.stopPropagation(); if(window.confirm(`Удалить все ${group.items.length} записей "${group.title}"?`)) removeGroup(group.title, group.type) }}
                    style={{ background:'var(--danger-light)', border:'none', borderRadius:7, width:28, height:28, color:'var(--danger)', fontSize:13, cursor:'pointer' }}>
                    🗑
                  </button>
                  <div style={{ color:'var(--text3)', fontSize:16 }}>{isOpen ? '▲' : '▼'}</div>
                </div>
              </div>

              {/* Expanded list of individual entries */}
              {isOpen && (
                <div style={{ background:'var(--surface2)', borderRadius:'0 0 12px 12px', border:`1px solid ${ic.hex}22`, borderTop:'none', padding:'8px 10px', display:'flex', flexDirection:'column', gap:6 }}>

                  {/* Multi-select delete bar */}
                  {selDates.size > 0 && (
                    <div style={{ display:'flex', gap:8, padding:'8px 10px', background:'var(--danger-light)', borderRadius:8, alignItems:'center' }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--danger)', flex:1 }}>
                        Выбрано: {selDates.size} дн.
                      </span>
                      <button onClick={() => { removeDates(group.title, group.type, [...selDates]); setSelDates(new Set()) }}
                        className="btn btn-danger" style={{ fontSize:11, padding:'5px 10px' }}>
                        🗑 Удалить выбранные
                      </button>
                      <button onClick={() => setSelDates(new Set())} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:13 }}>✕</button>
                    </div>
                  )}

                  {sortedItems.map(item => {
                    const isEditingThis = editing === item.id
                    const isSel = item.date && selDates.has(item.date)
                    const done  = isDoneToday(item)

                    if (isEditingThis) return (
                      <div key={item.id} style={{ background:'white', borderRadius:9, padding:'11px 12px', border:`1.5px solid ${ic.hex}` }}>
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          <input className="input" value={editForm.title} placeholder="Название"
                            onChange={e => setEditForm(p=>({...p,title:e.target.value}))} />
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                            <div>
                              <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>Начало</div>
                              <input type="time" className="input" value={editForm.time}
                                onChange={e=>setEditForm(p=>({...p,time:e.target.value}))} />
                            </div>
                            <div>
                              <div style={{ fontSize:10, color:'var(--text3)', marginBottom:3 }}>Конец</div>
                              <input type="time" className="input" value={editForm.endTime}
                                onChange={e=>setEditForm(p=>({...p,endTime:e.target.value}))} />
                            </div>
                          </div>
                          <input className="input" value={editForm.notes} placeholder="Примечание"
                            onChange={e=>setEditForm(p=>({...p,notes:e.target.value}))} />
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={() => setEditing(null)} className="btn btn-ghost" style={{ flex:1, fontSize:12 }}>Отмена</button>
                            <button onClick={() => saveEdit(item.id)} className="btn btn-primary" style={{ flex:2, fontSize:12 }}>✓ Сохранить</button>
                          </div>
                        </div>
                      </div>
                    )

                    return (
                      <div key={item.id} style={{
                        display:'flex', alignItems:'center', gap:10, padding:'9px 11px',
                        background: isSel ? '#FFF5F5' : 'white', borderRadius:9,
                        border:`1.5px solid ${isSel ? 'var(--danger)' : 'var(--border)'}`,
                        opacity: done ? 0.6 : 1
                      }}>
                        {/* Date checkbox for multi-select */}
                        {item.date && (
                          <button onClick={() => toggleDateSel(item.date)} style={{
                            width:18, height:18, borderRadius:4, border:`2px solid ${isSel?'var(--danger)':'var(--border2)'}`,
                            background: isSel ? 'var(--danger)' : 'white', flexShrink:0, cursor:'pointer',
                            display:'flex', alignItems:'center', justifyContent:'center'
                          }}>
                            {isSel && <span style={{ color:'white', fontSize:10, fontWeight:700 }}>✓</span>}
                          </button>
                        )}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>
                            {item.date ? format(parseISO(item.date),'EEEE, d MMM',{locale:ru}) : item.freq}
                          </div>
                          <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>
                            ⏰ {item.time}{item.endTime?'–'+item.endTime:''}
                            {done && <span style={{ color:'var(--success)', marginLeft:8 }}>✓</span>}
                          </div>
                        </div>
                        <button onClick={() => startEdit(item)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:14, padding:4 }}>✏️</button>
                        <button onClick={() => remove(item.id)} style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:14, padding:4 }}>🗑</button>
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
  )
}
