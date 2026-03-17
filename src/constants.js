export const TYPE_CONFIG = {
  medication:  { icon: '💊', color: '#2563EB', bg: '#EFF6FF', label: 'Препарат' },
  exercise:    { icon: '🏃', color: '#0D9488', bg: '#F0FDFA', label: 'Упражнение' },
  procedure:   { icon: '🩺', color: '#7C3AED', bg: '#F5F3FF', label: 'Процедура' },
  appointment: { icon: '📅', color: '#DC2626', bg: '#FEF2F2', label: 'Визит к врачу' },
  restriction: { icon: '⚠️', color: '#D97706', bg: '#FFFBEB', label: 'Ограничение' },
  routine:     { icon: '✅', color: '#059669', bg: '#ECFDF5', label: 'Рутина' },
  nutrition:   { icon: '🥗', color: '#CA8A04', bg: '#FEFCE8', label: 'Питание' },
  sleep:       { icon: '😴', color: '#6D28D9', bg: '#EDE9FE', label: 'Сон' },
}

export const DEMO_ITEMS = [
  { id: 1, type: 'medication',  title: 'Аспирин 100мг',        time: '08:00', done: false, notes: 'После еды',                   freq: 'Ежедневно', date: null },
  { id: 2, type: 'procedure',   title: 'Измерение давления',    time: '08:30', done: true,  notes: 'Оба плеча, записать результат',freq: 'Ежедневно', date: null },
  { id: 3, type: 'routine',     title: 'Утренняя зарядка',      time: '07:00', done: true,  notes: '15 минут',                    freq: 'Ежедневно', date: null },
  { id: 4, type: 'medication',  title: 'Метформин 500мг',       time: '13:00', done: false, notes: 'Во время обеда',              freq: 'Ежедневно', date: null },
  { id: 5, type: 'nutrition',   title: 'Обед — диета №5',       time: '13:30', done: false, notes: 'Без жирного и острого',       freq: 'Ежедневно', date: null },
  { id: 6, type: 'exercise',    title: 'Прогулка 30 минут',     time: '17:00', done: false, notes: 'Умеренный темп',              freq: 'Ежедневно', date: null },
  { id: 7, type: 'medication',  title: 'Лизиноприл 10мг',       time: '21:00', done: false, notes: 'Перед сном',                  freq: 'Ежедневно', date: null },
  { id: 8, type: 'appointment', title: 'Визит к кардиологу',    time: '10:00', done: false, notes: 'ул. Ленина 45, каб. 12',      freq: '23 марта',  date: '2026-03-23' },
]

export const NAV_ITEMS = [
  { id: 'dashboard', icon: '🏠', label: 'Сегодня' },
  { id: 'calendar',  icon: '📅', label: 'Календарь' },
  { id: 'upload',    icon: '🤖', label: 'ИИ-анализ' },
  { id: 'notes',     icon: '📝', label: 'Заметки' },
  { id: 'profile',   icon: '⚙️', label: 'Профиль' },
]
