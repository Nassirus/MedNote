/**
 * roles.js — Role system for MedNOTE
 * Roles: 'patient' | 'doctor' | 'admin'
 * Stored in Firestore: profiles/{uid}.role
 */

// Admin emails — hardcoded, for testing
export const ADMIN_EMAILS = [
  'akzhol.nasyr@mail.ru',
]

// Partner clinic IDs — doctors enter this during registration
// Format: { id: 'CODE', name: 'Clinic Name' }
export const PARTNER_CLINICS = [
  { id: 'RYADOM2026',  name: 'Стоматология «Рядом с Вами»' },
  { id: 'AERH2026',    name: 'Ассоциация эстетических и реконструктивных хирургов РК' },
  { id: 'MEDNOTE2026', name: 'MedNOTE — Тестовая клиника' },
]

export function isAdmin(email) {
  return ADMIN_EMAILS.includes((email || '').toLowerCase())
}

export function findClinic(partnerId) {
  return PARTNER_CLINICS.find(c =>
    c.id.toLowerCase() === (partnerId || '').trim().toLowerCase()
  ) || null
}

export function getRoleLabel(role) {
  return { patient:'Пациент', doctor:'Врач', admin:'Администратор' }[role] || 'Пациент'
}
