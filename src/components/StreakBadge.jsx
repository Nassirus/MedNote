/**
 * StreakBadge — fire streak display component
 * Shows fire emoji that evolves at 10, 50, 100, 200, 500 days
 */
import { useState } from 'react'

export default function StreakBadge({ streak, visual, milestone }) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (!visual || streak < 3) return null

  const sizes = {
    sm: { badge: 36, emoji: 18, font: 10 },
    md: { badge: 42, emoji: 22, font: 11 },
    lg: { badge: 50, emoji: 26, font: 12 },
    xl: { badge: 58, emoji: 30, font: 13 },
  }
  const sz = sizes[visual.size] || sizes.sm

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}
      onClick={() => setShowTooltip(p => !p)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}>

      {/* Badge */}
      <div style={{
        width:          sz.badge,
        height:         sz.badge,
        borderRadius:   '50%',
        background:     `radial-gradient(circle at 40% 35%, ${visual.glow}, ${visual.color})`,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        boxShadow:      `0 0 ${streak >= 100 ? 16 : streak >= 50 ? 10 : 6}px ${visual.glow}`,
        cursor:         'pointer',
        animation:      streak >= 50 ? 'streakPulse 2s ease-in-out infinite' : 'none',
        transition:     'transform .15s',
        flexShrink:     0,
      }}>
        <span style={{ fontSize: sz.emoji, lineHeight: 1, filter: streak >= 100 ? 'drop-shadow(0 0 4px white)' : 'none' }}>
          {visual.emoji}
        </span>
        <span style={{ fontSize: sz.font - 1, fontWeight: 800, color: 'white', lineHeight: 1, marginTop: 1 }}>
          {streak}
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div style={{
          position:    'absolute',
          bottom:      sz.badge + 8,
          left:        '50%',
          transform:   'translateX(-50%)',
          background:  '#1A3340',
          color:       'white',
          borderRadius: 10,
          padding:     '8px 12px',
          fontSize:    12,
          whiteSpace:  'nowrap',
          boxShadow:   '0 4px 16px rgba(0,0,0,0.25)',
          zIndex:      100,
          textAlign:   'center',
          lineHeight:  1.5,
        }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: visual.glow }}>{milestone}</div>
          <div>{streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'} подряд 🎯</div>
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>Пропуск 2+ дней — стрик сгорит</div>
          {/* Arrow */}
          <div style={{
            position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
            width: 10, height: 10, background: '#1A3340',
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)'
          }} />
        </div>
      )}

      <style>{`
        @keyframes streakPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 10px ${visual.glow}; }
          50%       { transform: scale(1.08); box-shadow: 0 0 20px ${visual.glow}; }
        }
      `}</style>
    </div>
  )
}
