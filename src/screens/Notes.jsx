import { useState, useRef, useEffect } from 'react'
import { IcPill, IcVisit, IcBarChart, IcActivity, IcHeartPulse } from '../components/Icons'
import { useNotes } from '../hooks/useNotes'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

const NOTE_COLORS = [
  { id: 'none',   bg: 'white',   border: 'var(--border)',   label: 'Белый' },
  { id: 'blue',   bg: '#EFF6FF', border: '#BFDBFE',         label: 'Синий' },
  { id: 'green',  bg: '#F0FDF4', border: '#BBF7D0',         label: 'Зелёный' },
  { id: 'yellow', bg: '#FEFCE8', border: '#FEF08A',         label: 'Жёлтый' },
  { id: 'red',    bg: '#FFF1F2', border: '#FECDD3',         label: 'Красный' },
  { id: 'purple', bg: '#F5F3FF', border: '#DDD6FE',         label: 'Фиолетовый' },
]

const TEMPLATES = [
  { Icon: IcPill,      label: 'Приём лекарств', title: 'Лог приёма лекарств', content: 'Дата: \nПрепарат: \nДоза: \nВремя приёма: \nСамочувствие после: \n\nЗаметки:' },
  { Icon: IcVisit,     label: 'Визит к врачу',  title: 'Визит к врачу',       content: 'Дата и время: \nВрач: \nКлиника: \n\nЖалобы:\n- \n\nНазначения:\n- \n\nСледующий визит:' },
  { Icon: IcBarChart,  label: 'Давление',       title: 'Дневник давления',    content: 'Дата: \nУтро:  / \nВечер: / \nЧСС: \n\nСамочувствие: ' },
  { Icon: IcActivity,  label: 'Упражнения',     title: 'Дневник упражнений',  content: 'Дата: \nУпражнения:\n- \n- \n- \n\nДлительность: \nОщущения: ' },
  { Icon: IcHeartPulse,label: 'Настроение',     title: 'Дневник самочувствия',content: 'Дата: \nНастроение (1-5): \nЭнергия (1-5): \nСон: \nБоль: \n\nЗаметки:' },
]

export default function Notes() {
  const { notes, create, save, remove } = useNotes()
  const [active, setActive]   = useState(null)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')  // all | pinned
  const [showTemplates, setShowTemplates] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [saveIndicator, setSaveIndicator] = useState(false)
  const saveTimer = useRef(null)
  const titleRef  = useRef(null)

  const filtered = notes.filter(n => {
    const matchSearch = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.content?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || (filter === 'pinned' && n.pinned)
    return matchSearch && matchFilter
  })

  useEffect(() => {
    if (active && titleRef.current) titleRef.current.focus()
  }, [active?.id])

  function autoSave(id, updates) {
    save(id, updates)
    setSaveIndicator(true)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaveIndicator(false), 1500)
  }

  async function newNote(template) {
    const n = await create(template?.title, template?.content || '')
    if (n) setActive(n)
    setShowTemplates(false)
  }

  function togglePin() {
    if (!active) return
    const pinned = !active.pinned
    setActive(p => ({ ...p, pinned }))
    autoSave(active.id, { pinned })
  }

  function setColor(colorId) {
    if (!active) return
    setActive(p => ({ ...p, color: colorId }))
    autoSave(active.id, { color: colorId })
    setShowColorPicker(false)
  }

  function insertBlock(type) {
    if (!active) return
    const additions = {
      todo:     '\n☐ ',
      divider:  '\n---\n',
      date:     '\n📅 ' + format(new Date(), 'd MMMM yyyy', { locale: ru }) + '\n',
      bp:       '\n🩺 Давление: / мм рт.ст.\n',
      symptom:  '\n😷 Симптом: \n',
    }
    const add = additions[type] || ''
    const newContent = (active.content || '') + add
    setActive(p => ({ ...p, content: newContent }))
    autoSave(active.id, { content: newContent })
  }

  const activeBg = NOTE_COLORS.find(c => c.id === (active?.color || 'none'))

  if (active) return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background: activeBg?.bg || 'white' }}>
      {/* Editor header */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:8, alignItems:'center', background: activeBg?.bg || 'white', flexShrink:0 }}>
        <button className="btn btn-ghost" onClick={() => setActive(null)} style={{ fontSize:13, padding:'6px 10px' }}>← Заметки</button>

        <div style={{ flex:1 }} />

        {saveIndicator && <span style={{ fontSize:11, color:'var(--success)', fontWeight:600 }}>✓ Сохранено</span>}

        {/* Pin */}
        <button onClick={togglePin} title={active.pinned ? 'Открепить' : 'Закрепить'} style={{
          background: active.pinned ? 'var(--warning-light)' : 'var(--surface2)',
          border:`1px solid ${active.pinned ? '#FDE68A' : 'var(--border)'}`,
          borderRadius:8, width:30, height:30, fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'
        }}>📌</button>

        {/* Color */}
        <div style={{ position:'relative' }}>
          <button onClick={() => setShowColorPicker(p=>!p)} style={{
            background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8,
            width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15
          }}>🎨</button>
          {showColorPicker && (
            <div style={{ position:'absolute', right:0, top:36, background:'white', border:'1px solid var(--border)', borderRadius:10, padding:8, display:'flex', gap:6, zIndex:50, boxShadow:'var(--shadow-md)' }}>
              {NOTE_COLORS.map(c => (
                <button key={c.id} onClick={() => setColor(c.id)} title={c.label} style={{
                  width:22, height:22, borderRadius:'50%', background:c.bg,
                  border:`2px solid ${active.color===c.id ? 'var(--primary)' : c.border}`,
                  cursor:'pointer'
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Delete */}
        <button onClick={() => { remove(active.id); setActive(null) }} style={{
          background:'var(--danger-light)', border:'none', borderRadius:8, width:30, height:30, fontSize:14, cursor:'pointer', color:'var(--danger)', display:'flex', alignItems:'center', justifyContent:'center'
        }}>🗑</button>
      </div>

      {/* Quick insert toolbar */}
      <div style={{ padding:'6px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:5, overflowX:'auto', flexShrink:0, background: activeBg?.bg || 'white' }}>
        {[
          ['todo',    '☐ Задача'],
          ['date',    '📅 Дата'],
          ['divider', '― Разделитель'],
          ['bp',      '🩺 Давление'],
          ['symptom', '😷 Симптом'],
        ].map(([type, label]) => (
          <button key={type} onClick={() => insertBlock(type)} style={{
            padding:'4px 10px', borderRadius:20, border:'1px solid var(--border)', background:'white',
            fontSize:11, fontWeight:600, color:'var(--text2)', whiteSpace:'nowrap', cursor:'pointer',
            transition:'background .1s'
          }}>{label}</button>
        ))}
      </div>

      {/* Editor */}
      <div style={{ flex:1, padding:'20px 20px', overflow:'auto', display:'flex', flexDirection:'column', gap:8 }}>
        {active.pinned && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', background:'var(--warning-light)', border:'1px solid #FDE68A', borderRadius:20, fontSize:11, fontWeight:600, color:'var(--warning)', marginBottom:4, alignSelf:'flex-start' }}>
            📌 Закреплено
          </div>
        )}
        <textarea
          ref={titleRef}
          className="note-title"
          value={active.title || ''}
          placeholder="Заголовок..."
          rows={1}
          style={{ fontSize:22, fontWeight:700, overflow:'hidden', background:'transparent', lineHeight:1.3 }}
          onChange={e => {
            const t = e.target.value
            setActive(p => ({ ...p, title: t }))
            autoSave(active.id, { title: t })
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
        />
        <div style={{ fontSize:12, color:'var(--text3)' }}>
          {active.updated_at
            ? format(typeof active.updated_at === 'string' ? parseISO(active.updated_at) : new Date(), 'd MMM yyyy, HH:mm', { locale: ru })
            : 'Только что'
          }
        </div>
        <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'4px 0' }} />
        <textarea
          className="note-body"
          value={active.content || ''}
          placeholder={'Начните писать...\n\nИспользуйте панель выше для быстрой вставки блоков'}
          style={{ flex:1, minHeight:300, background:'transparent', lineHeight:1.8 }}
          onChange={e => {
            const c = e.target.value
            setActive(p => ({ ...p, content: c }))
            autoSave(active.id, { content: c })
          }}
        />
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div className="page-header">
        <h1 style={{ fontWeight:700, fontSize:18 }}>Заметки</h1>
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn btn-ghost" onClick={() => setShowTemplates(p=>!p)} style={{ fontSize:13, padding:'8px 12px' }}>
            📋 Шаблоны
          </button>
          <button className="btn btn-primary" onClick={() => newNote()} style={{ fontSize:13, padding:'8px 14px' }}>
            + Новая
          </button>
        </div>
      </div>

      {/* Templates panel */}
      {showTemplates && (
        <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', background:'var(--surface2)' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Шаблоны</div>
          <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
            {TEMPLATES.map(t => (
              <button key={t.label} onClick={() => newNote(t)} style={{
                padding:'9px 13px', borderRadius:10, border:'1px solid var(--border)',
                background:'white', cursor:'pointer', display:'flex', alignItems:'center', gap:7,
                whiteSpace:'nowrap', transition:'box-shadow .15s', flexShrink:0
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow='var(--shadow-md)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                <span style={{ fontSize:18 }}>{t.Icon ? <t.Icon size={18} color='currentColor'/> : null}</span>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="page-content">
        {/* Search + filter */}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <input className="input" placeholder="🔍 Поиск..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex:1 }} />
          <div style={{ display:'flex', background:'var(--surface2)', borderRadius:8, padding:2 }}>
            {[['all','Все'],['pinned','📌']].map(([k,l]) => (
              <button key={k} onClick={() => setFilter(k)} style={{
                padding:'6px 10px', borderRadius:6, border:'none', fontSize:12, fontWeight:600,
                background: filter===k ? 'white' : 'transparent',
                color: filter===k ? 'var(--primary)' : 'var(--text3)',
                boxShadow: filter===k ? 'var(--shadow)' : 'none', transition:'all .12s'
              }}>{l}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px 0', color:'var(--text3)' }}>
            <div style={{ fontSize:44, marginBottom:12 }}>{search ? '🔍' : '📝'}</div>
            <div style={{ fontWeight:600, fontSize:15, marginBottom:6 }}>{search ? 'Ничего не найдено' : 'Нет заметок'}</div>
            <p style={{ fontSize:13, marginBottom:16, lineHeight:1.6, maxWidth:260, margin:'0 auto 16px' }}>
              {!search && 'Создайте заметку или выберите шаблон для быстрого старта'}
            </p>
            {!search && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
                <button className="btn btn-primary" onClick={() => newNote()} style={{ fontSize:13 }}>+ Пустая заметка</button>
                {TEMPLATES.slice(0,3).map(t => (
                  <button key={t.label} className="btn btn-ghost" onClick={() => newNote(t)} style={{ fontSize:13 }}>
                    {t.Icon ? <t.Icon size={18} color='currentColor'/> : null} {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
          {/* Pinned first */}
          {[...filtered].sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map(n => {
            const colorCfg = NOTE_COLORS.find(c => c.id === (n.color || 'none')) || NOTE_COLORS[0]
            return (
              <div key={n.id} className="card" onClick={() => setActive(n)}
                style={{ padding:16, cursor:'pointer', background:colorCfg.bg, border:`1px solid ${colorCfg.border}`, transition:'box-shadow .15s, transform .1s', position:'relative' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow='var(--shadow-md)'; e.currentTarget.style.transform='translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow='var(--shadow)'; e.currentTarget.style.transform='translateY(0)' }}>
                {n.pinned && (
                  <div style={{ position:'absolute', top:10, right:10, fontSize:13 }}>📌</div>
                )}
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight: n.pinned ? 20 : 0 }}>
                  {n.title || 'Без названия'}
                </div>
                <div style={{ fontSize:12, color:'var(--text2)', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical', lineHeight:1.6, minHeight:'3.2em' }}>
                  {n.content || 'Пустая заметка'}
                </div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:10, borderTop:`1px solid ${colorCfg.border}`, paddingTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>{n.updated_at ? format(parseISO(n.updated_at), 'd MMM', { locale: ru }) : 'Сегодня'}</span>
                  {n.content && <span>{n.content.length} симв.</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
