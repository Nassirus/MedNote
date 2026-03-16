import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Cell, CartesianGrid } from 'recharts'

export default function Analytics({ weekData, moodData, items, onReport }) {
  const avg = Math.round(weekData.reduce((s, d) => s + d.pct, 0) / weekData.length)
  const streak = weekData.filter(d => d.pct === 100).length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', background: 'white', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
        <h2 style={{ fontWeight: 700, fontSize: 20, color: '#0F172A' }}>Аналитика</h2>
        <p style={{ fontSize: 12, color: '#64748B' }}>Соблюдение назначений за неделю</p>
      </div>

      <div style={{ flex: 1, padding: '14px 14px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { l: 'Средний %', v: avg + '%', c: '#0369A1', bg: '#EFF6FF' },
            { l: 'Лучший день', v: '100%',  c: '#059669', bg: '#F0FDF4' },
            { l: 'Дней подряд', v: streak,  c: '#7C3AED', bg: '#F5F3FF' },
          ].map(s => (
            <div key={s.l} style={{ flex: 1, background: s.bg, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
              <p style={{ fontWeight: 800, fontSize: 22, color: s.c }}>{s.v}</p>
              <p style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{s.l}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div style={{ background: 'white', borderRadius: 14, padding: '14px 10px' }}>
          <p style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', marginBottom: 10, paddingLeft: 4 }}>Выполнение по дням (%)</p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={weekData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <Tooltip formatter={v => [v + '%', 'Выполнено']} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }} />
              <Bar dataKey="pct" radius={[5, 5, 0, 0]}>
                {weekData.map((e, i) => <Cell key={i} fill={e.pct === 100 ? '#059669' : e.pct >= 60 ? '#0369A1' : '#F59E0B'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart */}
        <div style={{ background: 'white', borderRadius: 14, padding: '14px 10px' }}>
          <p style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', marginBottom: 10, paddingLeft: 4 }}>Самочувствие (1–5)</p>
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={moodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis domain={[1, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <Tooltip formatter={v => [v, 'Самочувствие']} />
              <Line type="monotone" dataKey="mood" stroke="#7C3AED" strokeWidth={2.5} dot={{ fill: '#7C3AED', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <button onClick={onReport} style={{
          width: '100%', padding: 13, background: '#0369A1', color: 'white',
          border: 'none', borderRadius: 11, fontWeight: 700, fontSize: 14
        }}>📋 Сформировать отчёт для врача</button>
      </div>
    </div>
  )
}
