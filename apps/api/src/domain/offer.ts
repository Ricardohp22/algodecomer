export const PLAN_CODES = ['BASIC', 'PRO'] as const
export type PlanCode = (typeof PLAN_CODES)[number]

export const BUSINESS_TYPES = [
  'restaurante',
  'fonda',
  'puesto',
  'cocina_en_casa',
  'reposteria',
  'solo_pedidos',
] as const
export type BusinessType = (typeof BUSINESS_TYPES)[number]

export const AMENITY_CODES = ['parking', 'restroom', 'music', 'wifi'] as const
export type AmenityCode = (typeof AMENITY_CODES)[number]

export const AVAILABILITY_STATUSES = ['available', 'sold_out', 'scheduled', 'on_request'] as const
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number]

export const APPROVAL_STATUSES = ['draft', 'pending_review', 'approved', 'rejected'] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

export const PUBLICATION_STATUSES = ['unpublished', 'published'] as const
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number]

export const MODERATION_STATUSES = ['clear', 'suspended'] as const

export const ACCEPTING_ORDERS = ['accepting', 'busy', 'inquiries_only', 'closed'] as const

export const ZONE_STATUSES = ['planned', 'waitlist', 'pilot', 'active', 'suspended'] as const
export type ZoneStatus = (typeof ZONE_STATUSES)[number]

export const PUBLISHABLE_ZONE_STATUSES = ['pilot', 'active'] as const

export const SELECTION_TYPES = ['single', 'multiple'] as const
export type SelectionType = (typeof SELECTION_TYPES)[number]

export const MEDIA_KINDS = ['photo', 'visual_menu'] as const
export type MediaKind = (typeof MEDIA_KINDS)[number]

export const SCAN_STATUSES = ['not_scanned', 'clean', 'rejected'] as const

export const WAITLIST_CONTACT_TYPES = ['business', 'customer'] as const

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  restaurante: 'Restaurante',
  fonda: 'Fonda',
  puesto: 'Puesto',
  cocina_en_casa: 'Cocina en casa',
  reposteria: 'Repostería',
  solo_pedidos: 'Solo pedidos',
}

export const AMENITY_LABELS: Record<AmenityCode, string> = {
  parking: 'Estacionamiento',
  restroom: 'Baño',
  music: 'Música',
  wifi: 'Wi-Fi',
}

export const WEEKDAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
] as const
