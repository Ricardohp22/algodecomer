export const businessTypes = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'fonda', label: 'Fonda' },
  { value: 'puesto', label: 'Puesto' },
  { value: 'cocina_en_casa', label: 'Cocina en casa' },
  { value: 'reposteria', label: 'Repostería' },
  { value: 'solo_pedidos', label: 'Solo pedidos' },
] as const

export const amenities = [
  { value: 'parking', label: 'Estacionamiento' },
  { value: 'restroom', label: 'Baño' },
  { value: 'music', label: 'Música' },
  { value: 'wifi', label: 'Wi-Fi' },
] as const

export const weekdays = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
] as const

export const zoneStatuses = [
  { value: 'planned', label: 'Planeada' },
  { value: 'waitlist', label: 'Lista de espera' },
  { value: 'pilot', label: 'Piloto' },
  { value: 'active', label: 'Activa' },
  { value: 'suspended', label: 'Suspendida' },
] as const

const approvalLabels: Record<string, string> = {
  draft: 'Borrador',
  pending_review: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

const publicationLabels: Record<string, string> = {
  unpublished: 'Sin publicar',
  published: 'Publicada',
}

export function approvalLabel(status: string): string {
  return approvalLabels[status] ?? status
}

export function publicationLabel(status: string): string {
  return publicationLabels[status] ?? status
}

export function businessTypeLabel(value: string): string {
  return businessTypes.find((item) => item.value === value)?.label ?? value
}

export function weekdayLabel(value: number): string {
  return weekdays.find((item) => item.value === value)?.label ?? String(value)
}

export function zoneStatusLabel(value: string): string {
  return zoneStatuses.find((item) => item.value === value)?.label ?? value
}
