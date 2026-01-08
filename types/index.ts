// Core domain types
export interface Property {
  id: string
  name: string
  tagline: string
  category: string
  image: string
  country: string
  description: string
  price: number
  guests: number
  bedrooms: number
  beds: number
  baths: number
  amenities: string
  createdAt: Date
  updatedAt: Date
  profileId: string
}

export interface Profile {
  id: string
  clerkId: string
  firstName: string
  lastName: string
  username: string
  email: string
  profileImage: string
  createdAt: Date
  updatedAt: Date
}

export interface Booking {
  id: string
  profileId: string
  propertyId: string
  orderTotal: number
  totalNights: number
  checkIn: Date
  checkOut: Date
  paymentStatus: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Review {
  id: string
  profileId: string
  propertyId: string
  rating: number
  comment: string
  createdAt: Date
  updatedAt: Date
}

export interface Favorite {
  id: string
  profileId: string
  propertyId: string
  createdAt: Date
  updatedAt: Date
}

// Component prop types
export interface PropertyCardProps {
  id: string
  name: string
  tagline: string
  image: string
  country: string
  price: number
}

export interface BookingDetails {
  checkIn: Date
  checkOut: Date
  price: number
}

export interface BookingTotals {
  totalNights: number
  subTotal: number
  cleaning: number
  service: number
  tax: number
  orderTotal: number
}

// Form types
export interface FormState {
  message: string
  success?: boolean
}

export type ServerAction<T = any> = (
  prevState: FormState,
  formData: FormData
) => Promise<FormState>

// API types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

// Utility types
export type DateRange = {
  from: Date | undefined
  to: Date | undefined
}

export type CategoryLabel =
  | 'all'
  | 'cabin'
  | 'tent'
  | 'caravan'
  | 'cottage'
  | 'barn'
  | 'airstream'
  | 'treehouse'

export type Amenity =
  | 'wifi'
  | 'parking'
  | 'pool'
  | 'kitchen'
  | 'gym'
  | 'hot-tub'
  | 'pet-friendly'

// Store types
export interface PropertyState {
  propertyId: string
  price: number
  bookings: Booking[]
  range: DateRange | undefined
}

// Search and filter types
export interface SearchParams {
  category?: string
  search?: string
}

export interface PropertyFilters {
  category?: CategoryLabel
  search?: string
  minPrice?: number
  maxPrice?: number
  guests?: number
  amenities?: Amenity[]
}

