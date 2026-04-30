import { NAV_ICONS, IcSettings } from './Icons'
export default function NavIcon({ name, size=22, color='currentColor', sw=1.8 }) {
  const C = NAV_ICONS[name] || IcSettings
  return <C size={size} color={color} sw={sw}/>
}
