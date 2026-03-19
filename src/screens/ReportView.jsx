import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { TYPE_CONFIG } from '../constants'

export default function ReportView({ items, profile, weekData, onBack }) {
  const now      = new Date()
  const patName  = profile?.name   || 'Пациент'
  const patEmail = profile?.email  || ''
  const done     = items.filter(i => i.done).length
  const total    = items.length
  const pct      = total ? Math.round(done / total * 100) : 0

  const byType = Object.entries(
    items.reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc }, {})
  )

  const avg = weekData?.length
    ? Math.round(weekData.reduce((s, d) => s + d.pct, 0) / weekData.length)
    : pct

  function print() {
    window.print()
  }

  function copyText() {
    const lines = [
      `МЕДИЦИНСКИЙ ОТЧЁТ — MedSchedule`,
      `Пациент: ${patName}`,
      `Дата: ${format(now, 'd MMMM yyyy', { locale: ru })}`,
      ``,
      `СТАТИСТИКА СОБЛЮДЕНИЯ:`,
      `Выполнено сегодня: ${done}/${total} (${pct}%)`,
      `Среднее за неделю: ${avg}%`,
      ``,
      `НАЗНАЧЕНИЯ:`,
      ...items.map(i => {
        const cfg = TYPE_CONFIG[i.type] || TYPE_CONFIG.routine
        return `[${i.done ? '✓' : ' '}] ${cfg.label}: ${i.title} — ${i.time}, ${i.freq}${i.notes ? ` (${i.notes})` : ''}`
      }),
      ``,
      `Сформировано: ${format(now, 'd MMMM yyyy, HH:mm', { locale: ru })}`,
    ]
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => alert('Текст отчёта скопирован!'))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header" style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ padding: '7px 12px', fontSize: 13 }}>← Назад</button>
        <h1 style={{ fontWeight: 700, fontSize: 17, flex: 1 }}>Отчёт для врача</h1>
        <button className="btn btn-ghost" onClick={copyText} style={{ fontSize: 12, padding: '7px 12px' }}>📋 Копировать</button>
        <button className="btn btn-primary" onClick={print} style={{ fontSize: 12, padding: '7px 14px' }}>🖨️ Печать</button>
      </div>

      <div className="page-content">
        {/* Report card */}
        <div id="report-content" style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg,#1A56DB,#0D9488)', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Медицинский отчёт</div>
                <div style={{ fontWeight: 800, fontSize: 20 }}>MedSchedule</div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>AI-помощник по назначениям</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Дата формирования</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{format(now, 'd MMMM yyyy', { locale: ru })}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{format(now, 'HH:mm')}</div>
              </div>
            </div>
          </div>

          {/* Patient */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: 'var(--primary)', flexShrink: 0 }}>
              {patName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{patName}</div>
              {patEmail && <div style={{ fontSize: 13, color: 'var(--text3)' }}>{patEmail}</div>}
            </div>
          </div>

          {/* Stats */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Сводка соблюдения</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                ['Выполнено сегодня', `${done}/${total}`, pct === 100 ? 'var(--success)' : 'var(--primary)'],
                ['% сегодня',         `${pct}%`,           pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'],
                ['Ср. за неделю',     `${avg}%`,           avg >= 80 ? 'var(--success)' : avg >= 50 ? 'var(--warning)' : 'var(--danger)'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 22, color: c }}>{v}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 5 }}>
                <span>Общий прогресс</span><span>{pct}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 999 }}>
                <div style={{ height: 8, width: pct + '%', borderRadius: 999, background: pct === 100 ? 'var(--success)' : 'linear-gradient(90deg,var(--primary),#0D9488)', transition: 'width .5s' }} />
              </div>
            </div>
          </div>

          {/* Items table */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Назначения врача</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px', padding: '6px 10px', background: 'var(--surface2)', borderRadius: '8px 8px 0 0', gap: 8 }}>
                {['Назначение','Время','Частота','Статус'].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>
              {items.map((item, i) => {
                const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.routine
                return (
                  <div key={item.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px', gap: 8,
                    padding: '10px 10px', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                    background: i % 2 === 0 ? 'white' : 'var(--surface2)',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{cfg.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                        {item.notes && <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes}</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>⏰ {item.time}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.freq}</div>
                    <div style={{ padding: '3px 8px', borderRadius: 20, background: item.done ? '#D1FAE5' : '#FEE2E2', fontSize: 10, fontWeight: 700, color: item.done ? '#059669' : '#DC2626', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {item.done ? '✓ Выполнено' : '○ Ожидает'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Weekly chart bars */}
          {weekData && (
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Соблюдение по дням</div>
              {weekData.map(d => (
                <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                  <span style={{ fontSize: 12, width: 24, color: 'var(--text3)', flexShrink: 0 }}>{d.day}</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 999 }}>
                    <div style={{ height: 8, width: d.pct + '%', background: d.pct === 100 ? '#059669' : d.pct >= 60 ? '#2563EB' : '#F59E0B', borderRadius: 999, transition: 'width .4s' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', width: 34 }}>{d.pct}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer disclaimer */}
          <div style={{ padding: '14px 24px', background: 'var(--surface2)' }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6, textAlign: 'center' }}>
              Данный отчёт сформирован автоматически приложением MedSchedule на основе данных, введённых пациентом.
              Не является медицинским заключением. Для интерпретации результатов обратитесь к лечащему врачу.
            </p>
          </div>
        </div>

        {/* Print styles injected */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #report-content, #report-content * { visibility: visible; }
            #report-content { position: fixed; top: 0; left: 0; width: 100%; }
          }
        `}</style>
      </div>
    </div>
  )
}
