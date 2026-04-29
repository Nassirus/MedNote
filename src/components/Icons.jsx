/**
 * Icons.jsx — Centralized SVG icon library for MedNOTE
 * All icons are inline SVG, no external dependencies.
 * Size prop controls width/height. Color inherits from parent (currentColor).
 */

function Icon({ d, size = 20, color = 'currentColor', strokeWidth = 1.8, fill = 'none', viewBox = '0 0 24 24', style = {} }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill={fill}
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
      strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p}/>) : <path d={d}/>}
    </svg>
  )
}

function IconEl({ size = 20, color = 'currentColor', strokeWidth = 1.8, style = {}, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
      strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
      {children}
    </svg>
  )
}

// ── Navigation ────────────────────────────────────────────────────────────────
export const IconHome = ({ size, color, strokeWidth }) => <Icon size={size} color={color} strokeWidth={strokeWidth}
  d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10"/>

export const IconCalendar = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
  <line x1="3" y1="10" x2="21" y2="10"/>
</IconEl>

export const IconBot = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <rect x="3" y="11" width="18" height="10" rx="2"/>
  <circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/>
  <line x1="8" y1="15" x2="8" y2="15" strokeWidth="2.5"/>
  <line x1="12" y1="15" x2="12" y2="15" strokeWidth="2.5"/>
  <line x1="16" y1="15" x2="16" y2="15" strokeWidth="2.5"/>
</IconEl>

export const IconFileText = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
  <polyline points="14 2 14 8 20 8"/>
  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  <polyline points="10 9 9 9 8 9"/>
</IconEl>

export const IconSettings = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</IconEl>

// ── Medical types ─────────────────────────────────────────────────────────────
export const IconPill = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M10.5 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2.5"/>
  <path d="M15 21a6 6 0 0 0 6-6 4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4 6 6 0 0 0 6 6z"/>
  <path d="M16 15h2"/>
</IconEl>

export const IconActivity = ({ size, color, strokeWidth }) => <Icon size={size} color={color} strokeWidth={strokeWidth}
  d="M22 12h-4l-3 9L9 3l-3 9H2"/>

export const IconStethoscope = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
  <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
  <circle cx="20" cy="10" r="2"/>
</IconEl>

export const IconAlertTriangle = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
</IconEl>

export const IconLeaf = ({ size, color, strokeWidth }) => <Icon size={size} color={color} strokeWidth={strokeWidth}
  d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>

export const IconMoon = ({ size, color, strokeWidth }) => <Icon size={size} color={color} strokeWidth={strokeWidth}
  d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>

export const IconClipboard = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
</IconEl>

export const IconVisit = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
  <line x1="3" y1="10" x2="21" y2="10"/>
  <path d="M12 14v4M10 16h4"/>
</IconEl>

// ── UI Actions ────────────────────────────────────────────────────────────────
export const IconBell = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
</IconEl>

export const IconBellOff = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  <path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/>
  <path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/>
</IconEl>

export const IconFlame = ({ size, color, strokeWidth }) => <Icon size={size} color={color} strokeWidth={strokeWidth}
  d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>

export const IconCamera = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
  <circle cx="12" cy="13" r="4"/>
</IconEl>

export const IconPencil = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
</IconEl>

export const IconSave = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
  <polyline points="17 21 17 13 7 13 7 21"/>
  <polyline points="7 3 7 8 15 8"/>
</IconEl>

export const IconMail = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
  <polyline points="22,6 12,13 2,6"/>
</IconEl>

export const IconSearch = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
</IconEl>

export const IconLock = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
</IconEl>

export const IconBuilding = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  <rect x="9" y="15" width="6" height="7"/>
</IconEl>

export const IconUser = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
  <circle cx="12" cy="7" r="4"/>
</IconEl>

export const IconUsers = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
  <circle cx="9" cy="7" r="4"/>
  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
</IconEl>

export const IconBarChart = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <line x1="18" y1="20" x2="18" y2="10"/>
  <line x1="12" y1="20" x2="12" y2="4"/>
  <line x1="6" y1="20" x2="6" y2="14"/>
</IconEl>

export const IconSmartphone = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
  <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3"/>
</IconEl>

export const IconRefresh = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <polyline points="23 4 23 10 17 10"/>
  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
</IconEl>

export const IconCheck = ({ size, color, strokeWidth }) => <Icon size={size} color={color} strokeWidth={strokeWidth}
  d="M20 6L9 17l-5-5"/>

export const IconCheckCircle = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
  <polyline points="22 4 12 14.01 9 11.01"/>
</IconEl>

export const IconXCircle = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <circle cx="12" cy="12" r="10"/>
  <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
</IconEl>

export const IconX = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
</IconEl>

export const IconLoader = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
  <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
</IconEl>

export const IconDna = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/>
  <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/>
  <path d="m17 6-2.5-2.5"/><path d="m14 8-1-1"/><path d="m7 18 2.5 2.5"/>
  <path d="m3.5 14.5.5.5"/><path d="m20 9 .5.5"/>
  <path d="m6.5 12.5 1 1"/><path d="m16.5 10.5 1 1"/><path d="m10 16 1.5 1.5"/>
</IconEl>

export const IconPlus = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
</IconEl>

export const IconTrash = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <polyline points="3 6 5 6 21 6"/>
  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
</IconEl>

export const IconClock = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <circle cx="12" cy="12" r="10"/>
  <polyline points="12 6 12 12 16 14"/>
</IconEl>

export const IconInfo = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <circle cx="12" cy="12" r="10"/>
  <line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
</IconEl>

export const IconDoctor = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
  <circle cx="12" cy="7" r="4"/>
  <path d="M16 14v3a2 2 0 0 0 4 0v-3"/>
  <circle cx="18" cy="17" r="1" fill={color} stroke="none"/>
</IconEl>

export const IconLogOut = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
  <polyline points="16 17 21 12 16 7"/>
  <line x1="21" y1="12" x2="9" y2="12"/>
</IconEl>

export const IconArrowLeft = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
</IconEl>

export const IconArrowRight = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
</IconEl>

export const IconChevronLeft = ({ size, color, strokeWidth }) => <Icon size={size} color={color} strokeWidth={strokeWidth} d="M15 18l-6-6 6-6"/>
export const IconChevronRight = ({ size, color, strokeWidth }) => <Icon size={size} color={color} strokeWidth={strokeWidth} d="M9 18l6-6-6-6"/>
export const IconChevronDown = ({ size, color, strokeWidth }) => <Icon size={size} color={color} strokeWidth={strokeWidth} d="M6 9l6 6 6-6"/>
export const IconChevronUp = ({ size, color, strokeWidth }) => <Icon size={size} color={color} strokeWidth={strokeWidth} d="M18 15l-6-6-6 6"/>

export const IconQR = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
  <rect x="3" y="14" width="7" height="7"/>
  <rect x="5" y="5" width="3" height="3" fill={color} stroke="none"/>
  <rect x="16" y="5" width="3" height="3" fill={color} stroke="none"/>
  <rect x="5" y="16" width="3" height="3" fill={color} stroke="none"/>
  <line x1="14" y1="14" x2="14" y2="14" strokeWidth="3"/><line x1="17" y1="14" x2="17" y2="14" strokeWidth="3"/>
  <line x1="20" y1="14" x2="20" y2="14" strokeWidth="3"/><line x1="17" y1="17" x2="17" y2="17" strokeWidth="3"/>
  <line x1="20" y1="20" x2="20" y2="20" strokeWidth="3"/>
</IconEl>

export const IconEye = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
  <circle cx="12" cy="12" r="3"/>
</IconEl>

export const IconEyeOff = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
  <line x1="1" y1="1" x2="23" y2="23"/>
</IconEl>

export const IconPrinter = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <polyline points="6 9 6 2 18 2 18 9"/>
  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
  <rect x="6" y="14" width="12" height="8"/>
</IconEl>

export const IconBookOpen = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
</IconEl>

export const IconStar = ({ size, color, strokeWidth }) => <Icon size={size} color={color} strokeWidth={strokeWidth}
  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>

export const IconTarget = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
</IconEl>

export const IconSparkles = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/>
  <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
</IconEl>

export const IconCalendarX = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
  <line x1="3" y1="10" x2="21" y2="10"/>
  <line x1="10" y1="14" x2="14" y2="18"/><line x1="14" y1="14" x2="10" y2="18"/>
</IconEl>

export const IconImage = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
  <circle cx="8.5" cy="8.5" r="1.5"/>
  <polyline points="21 15 16 10 5 21"/>
</IconEl>

export const IconPaperclip = ({ size, color, strokeWidth }) => <Icon size={size} color={color} strokeWidth={strokeWidth}
  d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>

export const IconPin = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
  <circle cx="12" cy="10" r="3"/>
</IconEl>

export const IconSend = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <line x1="22" y1="2" x2="11" y2="13"/>
  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
</IconEl>

export const IconFilter = ({ size, color, strokeWidth }) => <IconEl size={size} color={color} strokeWidth={strokeWidth}>
  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
</IconEl>

// Icon map for type-based rendering
export const TYPE_ICON_MAP = {
  medication:  IconPill,
  exercise:    IconActivity,
  procedure:   IconStethoscope,
  appointment: IconVisit,
  restriction: IconAlertTriangle,
  nutrition:   IconLeaf,
  sleep:       IconMoon,
  routine:     IconClipboard,
}

export function TypeIcon({ type, size = 18, color = 'currentColor' }) {
  const Comp = TYPE_ICON_MAP[type] || IconClipboard
  return <Comp size={size} color={color}/>
}
