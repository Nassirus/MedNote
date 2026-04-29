/**
 * NavIcon — renders the correct SVG icon for a given iconName string.
 * Used in Layout bottom nav and sidebar.
 */
import {
  IconHome, IconCalendar, IconBot, IconFileText, IconSettings,
  IconPill, IconActivity, IconStethoscope, IconVisit, IconAlertTriangle,
  IconLeaf, IconMoon, IconClipboard, IconUsers, IconBarChart, IconDoctor,
  IconBell, IconFlame, IconSearch, IconPlus, IconTrash, IconClock,
  IconMail, IconCamera, IconPencil, IconSave, IconUser, IconQR,
  IconCheck, IconCheckCircle, IconXCircle, IconX, IconInfo,
  IconRefresh, IconLock, IconBuilding, IconChevronLeft, IconChevronRight,
  IconChevronDown, IconChevronUp, IconArrowLeft, IconArrowRight,
  IconLogOut, IconPrinter, IconBookOpen, IconSparkles, IconCalendarX,
  IconImage, IconPaperclip, IconSend, IconDna, IconFilter, IconTarget,
  TypeIcon,
} from './Icons'

const MAP = {
  home:         IconHome,
  calendar:     IconCalendar,
  bot:          IconBot,
  notes:        IconFileText,
  settings:     IconSettings,
  pill:         IconPill,
  activity:     IconActivity,
  stethoscope:  IconStethoscope,
  visit:        IconVisit,
  alert:        IconAlertTriangle,
  leaf:         IconLeaf,
  moon:         IconMoon,
  clipboard:    IconClipboard,
  users:        IconUsers,
  chart:        IconBarChart,
  doctor:       IconDoctor,
  bell:         IconBell,
  flame:        IconFlame,
  search:       IconSearch,
  plus:         IconPlus,
  trash:        IconTrash,
  clock:        IconClock,
  mail:         IconMail,
  camera:       IconCamera,
  pencil:       IconPencil,
  save:         IconSave,
  user:         IconUser,
  qr:           IconQR,
  check:        IconCheck,
  checkCircle:  IconCheckCircle,
  xCircle:      IconXCircle,
  x:            IconX,
  info:         IconInfo,
  refresh:      IconRefresh,
  lock:         IconLock,
  building:     IconBuilding,
  chevronLeft:  IconChevronLeft,
  chevronRight: IconChevronRight,
  chevronDown:  IconChevronDown,
  chevronUp:    IconChevronUp,
  arrowLeft:    IconArrowLeft,
  arrowRight:   IconArrowRight,
  logout:       IconLogOut,
  printer:      IconPrinter,
  book:         IconBookOpen,
  sparkles:     IconSparkles,
  calendarX:    IconCalendarX,
  image:        IconImage,
  paperclip:    IconPaperclip,
  send:         IconSend,
  dna:          IconDna,
  filter:       IconFilter,
  target:       IconTarget,
}

export default function NavIcon({ name, size = 22, color = 'currentColor', strokeWidth = 1.8 }) {
  const Comp = MAP[name]
  if (!Comp) return null
  return <Comp size={size} color={color} strokeWidth={strokeWidth}/>
}

export { TypeIcon, MAP as ICON_MAP }
