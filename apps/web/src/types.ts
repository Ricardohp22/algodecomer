export type BranchSummary = {
  id: string
  name: string
  approvalStatus: string
  publicationStatus: string
  businessType: string
}

export type HourInterval = {
  weekday: number
  opensAt: string
  closesAt: string
}

export type CatalogProduct = {
  id: string
  categoryId: string
  name: string
  description: string
  basePrice: string
  availabilityStatus: string
  published: boolean
  variants: Array<{ id: string; name: string; priceDelta: string }>
}

export type BranchBundle = {
  id: string
  legalName: string
  name: string
  description: string
  businessType: string
  phone: string
  whatsapp: string | null
  addressPrivate: string | null
  addressPublic: string | null
  exposePublicAddress: boolean
  latitude: number
  longitude: number
  planCode: string
  approvalStatus: string
  publicationStatus: string
  rejectionReason: string | null
  hours: HourInterval[]
  amenities: string[]
  delivery: {
    dineIn: boolean
    pickup: boolean
    delivery: boolean
    fee: string
    minOrder: string | null
    radiusM: number | null
  }
  missing: string[]
  categories: Array<{ id: string; name: string; sortOrder: number }>
  modifierGroups: Array<{ id: string; name: string }>
  products: CatalogProduct[]
  photos: Array<{ id: string; url: string }>
  visualMenus: Array<{ id: string; assetId: string; mimeType: string; url: string }>
}

export type PublicBranch = {
  id: string
  name: string
  description: string
  businessType: string
  phone: string
  whatsapp: string | null
  addressPublic: string | null
  hours: HourInterval[]
  amenities: string[]
  categories: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string; description: string; basePrice: string; categoryId: string }>
  photos: Array<{ id: string; url: string }>
  visualMenus: Array<{ id: string; mimeType: string; url: string }>
}
