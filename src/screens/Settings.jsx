export default function Settings({ notifyDelay, setNotifyDelay, quietStart, setQuietStart, quietEnd, setQuietEnd, notifOn, setNotifOn }) {
  const DELAYS = [5, 10, 15, 30, 45, 60, 120]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', background: 'white', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
        <h2 style={{ fontWeight: 700, fontSize: 20, color: '#0F172A' }}>Настройки</h2>
      </div>

      <div style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Notifications toggle */}
        <div style={{ background: 'white', borderRadius: 13, padding: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 12 }}>🔔 Уведомления</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>Включить напоминания</p>
              <p style={{ fontSize: 11, color: '#94A3B8' }}>Push-уведомления о приёмах</p>
            </div>
            <button onClick={() => setNotifOn(!notifOn)} style={{
              width: 48, height: 27, borderRadius: 14,
              background: notifOn ? '#0369A1' : '#CBD5E1',
              border: 'none', position: 'relative', transition: 'background .2s'
            }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 3.5, left: notifOn ? 24 : 4, transition: 'left .2s' }} />
            </button>
          </div>
        </div>

        {/* Delay */}
        <div style={{ background: 'white', borderRadius: 13, padding: 14 }}>
          <p style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', marginBottom: 2 }}>⏱ Повторное напоминание</p>
          <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12 }}>Если галочка не поставлена — напомнить через:</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DELAYS.map(m => (
              <button key={m} onClick={() => setNotifyDelay(m)} style={{
                padding: '7px 12px', borderRadius: 20, border: 'none',
                background: notifyDelay === m ? '#0369A1' : '#F1F5F9',
                color: notifyDelay === m ? 'white' : '#64748B',
                fontWeight: 600, fontSize: 12, transition: 'all .15s'
              }}>{m} мин</button>
            ))}
          </div>
        </div>

        {/* Quiet hours */}
        <div style={{ background: 'white', borderRadius: 13, padding: 14 }}>
          <p style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', marginBottom: 2 }}>🌙 Режим тишины</p>
          <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12 }}>Не беспокоить в это время</p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>С</p>
              <input type="time" value={quietStart} onChange={e => setQuietStart(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 15, fontWeight: 600, color: '#0F172A' }} />
            </div>
            <span style={{ color: '#CBD5E1', paddingBottom: 10, fontSize: 18 }}>—</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>До</p>
              <input type="time" value={quietEnd} onChange={e => setQuietEnd(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 15, fontWeight: 600, color: '#0F172A' }} />
            </div>
          </div>
        </div>

        {/* Menu */}
        <div style={{ background: 'white', borderRadius: 13, overflow: 'hidden' }}>
          {[
            ['👤 Профиль', 'Имя, дата рождения'],
            ['🩺 Мой врач', 'Добавить контакт врача'],
            ['👨‍👩‍👦 Режим опекуна', 'Добавить наблюдателя'],
            ['📤 Экспорт данных', 'Выгрузить историю'],
          ].map(([t, sub], i, arr) => (
            <div key={t} style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{t}</p>
                <p style={{ fontSize: 11, color: '#94A3B8' }}>{sub}</p>
              </div>
              <span style={{ color: '#CBD5E1', fontSize: 20 }}>›</span>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#CBD5E1' }}>MedSchedule MVP v1.0 · Gemini AI</p>
      </div>
    </div>
  )
}
