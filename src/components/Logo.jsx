export default function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#1A56DB"/>
      <circle cx="24" cy="24" r="22" fill="#1E429F"/>
      {/* Medical cross */}
      <rect x="20" y="11" width="8" height="26" rx="3" fill="white"/>
      <rect x="11" y="20" width="26" height="8" rx="3" fill="white"/>
      {/* Schedule dots */}
      <circle cx="32" cy="32" r="2.5" fill="#93C5FD"/>
      <circle cx="38" cy="32" r="2.5" fill="#93C5FD"/>
      <circle cx="32" cy="38" r="2.5" fill="#93C5FD"/>
      <circle cx="38" cy="38" r="2.5" fill="#93C5FD"/>
    </svg>
  )
}
