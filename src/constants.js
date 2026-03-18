export const TYPE_CONFIG = {
  medication:  { icon: '💊', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Препарат' },
  exercise:    { icon: '🏃', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Упражнение' },
  procedure:   { icon: '🩺', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', label: 'Процедура' },
  appointment: { icon: '📅', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Визит к врачу' },
  restriction: { icon: '⚠️', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Ограничение' },
  routine:     { icon: '✅', color: '#0D9488', bg: '#F0FDFA', border: '#99F6E4', label: 'Рутина' },
  nutrition:   { icon: '🥗', color: '#CA8A04', bg: '#FEFCE8', border: '#FEF08A', label: 'Питание' },
  sleep:       { icon: '😴', color: '#6D28D9', bg: '#EDE9FE', border: '#C4B5FD', label: 'Сон' },
}

// Palette for user-chosen event colors
export const EVENT_COLORS = [
  { id: 'blue',   hex: '#2563EB', light: '#EFF6FF', label: 'Синий'       },
  { id: 'green',  hex: '#059669', light: '#ECFDF5', label: 'Зелёный'     },
  { id: 'purple', hex: '#7C3AED', light: '#F5F3FF', label: 'Фиолетовый'  },
  { id: 'red',    hex: '#DC2626', light: '#FEF2F2', label: 'Красный'      },
  { id: 'orange', hex: '#D97706', light: '#FFFBEB', label: 'Оранжевый'   },
  { id: 'teal',   hex: '#0D9488', light: '#F0FDFA', label: 'Бирюзовый'   },
  { id: 'pink',   hex: '#DB2777', light: '#FDF2F8', label: 'Розовый'      },
  { id: 'gray',   hex: '#475569', light: '#F1F5F9', label: 'Серый'        },
]

export const DEMO_ITEMS = [
  { id:'1', type:'medication',  title:'Аспирин 100мг',      time:'08:00', done:false, notes:'После еды',                    freq:'Ежедневно', date:null, color:'blue'   },
  { id:'2', type:'procedure',   title:'Измерение давления',  time:'08:30', done:true,  notes:'Оба плеча',                    freq:'Ежедневно', date:null, color:'purple' },
  { id:'3', type:'routine',     title:'Утренняя зарядка',    time:'07:00', done:true,  notes:'15 минут',                     freq:'Ежедневно', date:null, color:'green'  },
  { id:'4', type:'medication',  title:'Метформин 500мг',     time:'13:00', done:false, notes:'Во время обеда',               freq:'Ежедневно', date:null, color:'blue'   },
  { id:'5', type:'exercise',    title:'Прогулка 30 минут',   time:'17:00', done:false, notes:'Умеренный темп',               freq:'Ежедневно', date:null, color:'green'  },
  { id:'6', type:'medication',  title:'Лизиноприл 10мг',     time:'21:00', done:false, notes:'Перед сном',                   freq:'Ежедневно', date:null, color:'blue'   },
  { id:'7', type:'appointment', title:'Визит к кардиологу',  time:'10:00', done:false, notes:'ул. Ленина 45, каб. 12',       freq:'Разово',    date:'2026-03-23', color:'red' },
]

export const NAV_ITEMS = [
  { id:'dashboard', icon:'🏠', label:'Сегодня'   },
  { id:'calendar',  icon:'📅', label:'Календарь' },
  { id:'upload',    icon:'🤖', label:'ИИ-анализ' },
  { id:'notes',     icon:'📝', label:'Заметки'   },
  { id:'profile',   icon:'⚙️', label:'Профиль'   },
]
