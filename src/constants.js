export const TYPE_CONFIG = {
  medication:   { e: '💊', c: '#0369A1', bg: '#EFF6FF', l: 'Препарат' },
  exercise:     { e: '🏃', c: '#0D9488', bg: '#F0FDFA', l: 'Упражнение' },
  procedure:    { e: '🩺', c: '#7C3AED', bg: '#F5F3FF', l: 'Процедура' },
  appointment:  { e: '📅', c: '#DC2626', bg: '#FEF2F2', l: 'Визит к врачу' },
  restriction:  { e: '⚠️', c: '#D97706', bg: '#FFFBEB', l: 'Ограничение' },
}

export const DEMO_ITEMS = [
  { id: 1, type: 'medication',  title: 'Аспирин 100мг',          time: '08:00', done: false, notes: 'После еды',                   freq: 'Ежедневно' },
  { id: 2, type: 'procedure',   title: 'Измерение давления',      time: '08:30', done: true,  notes: 'Оба плеча, записать результат', freq: 'Ежедневно' },
  { id: 3, type: 'medication',  title: 'Метформин 500мг',         time: '13:00', done: true,  notes: 'Во время обеда',               freq: 'Ежедневно' },
  { id: 4, type: 'exercise',    title: 'Прогулка 30 минут',       time: '17:00', done: false, notes: 'Умеренный темп',               freq: 'Ежедневно' },
  { id: 5, type: 'medication',  title: 'Лизиноприл 10мг',         time: '21:00', done: false, notes: 'Перед сном',                   freq: 'Ежедневно' },
  { id: 6, type: 'appointment', title: 'Визит к кардиологу',      time: '10:00', done: false, notes: 'ул. Ленина 45, каб. 12',       freq: '23 марта'  },
]

export const WEEK_DATA = [
  { day: 'Пн', pct: 67 }, { day: 'Вт', pct: 100 }, { day: 'Ср', pct: 50  },
  { day: 'Чт', pct: 83 }, { day: 'Пт', pct: 100 }, { day: 'Сб', pct: 33  }, { day: 'Вс', pct: 67 },
]

export const MOOD_DATA = [
  { day: 'Пн', mood: 3 }, { day: 'Вт', mood: 4 }, { day: 'Ср', mood: 3 },
  { day: 'Чт', mood: 4 }, { day: 'Пт', mood: 5 }, { day: 'Сб', mood: 2 }, { day: 'Вс', mood: 4 },
]
