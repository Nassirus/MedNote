import { useState } from 'react'
import { useNotes } from '../hooks/useNotes'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function Notes() {
  const { notes, create, save, remove } = useNotes()
  const [active, setActive] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content?.toLowerCase().includes(search.toLowerCase())
  )

  async function newNote() {
    const n = await create()
    if (n) setActive(n)
  }

  if (active) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => setActive(null)} style={{ fontSize: 13, padding: '7px 12px' }}>← Заметки</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-danger" onClick={() => { remove(active.id); setActive(null) }} style={{ fontSize: 13, padding: '7px 12px' }}>Удалить</button>
        </div>
      </div>
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <textarea className="note-title" value={active.title || ''}
          onChange={e => { const t = e.target.value; setActive(p => ({ ...p, title: t })); save(active.id, { title: t }) }}
          placeholder="Без названия" rows={1}
          style={{ overflow: 'hidden' }}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
        />
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
          {active.updated_at ? format(parseISO(active.updated_at), 'd MMMM yyyy, HH:mm', { locale: ru }) : 'Только что'}
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
        <textarea className="note-body" value={active.content || ''}
          onChange={e => { const c = e.target.value; setActive(p => ({ ...p, content: c })); save(active.id, { content: c }) }}
          placeholder="Начните писать..."
          style={{ flex: 1, minHeight: 300 }}
        />
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <h1 style={{ fontWeight: 700, fontSize: 18 }}>Заметки</h1>
        <button className="btn btn-primary" onClick={newNote} style={{ fontSize: 13, padding: '8px 14px' }}>+ Новая заметка</button>
      </div>
      <div className="page-content">
        {/* Search */}
        <input className="input" placeholder="🔍 Поиск по заметкам..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 16 }} />

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>{search ? '🔍' : '📝'}</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{search ? 'Ничего не найдено' : 'Нет заметок'}</div>
            {!search && <button className="btn btn-primary" onClick={newNote} style={{ marginTop: 10 }}>Создать первую</button>}
          </div>
        )}

        {/* Notes grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {filtered.map(n => (
            <div key={n.id} className="card" onClick={() => setActive(n)}
              style={{ padding: '16px', cursor: 'pointer', transition: 'box-shadow .15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.title || 'Без названия'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', lineHeight: 1.5, minHeight: '3.5em' }}>
                {n.content || 'Пустая заметка'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                {n.updated_at ? format(parseISO(n.updated_at), 'd MMM yyyy', { locale: ru }) : 'Сегодня'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
