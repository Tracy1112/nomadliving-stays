/**
 * Tests for utils/actions.ts
 *
 * This test file covers Server Actions which are critical business logic.
 * Focus areas:
 * - Profile management (create, update, fetch)
 * - Property management (create, update, delete)
 * - Booking operations
 * - Review system
 * - Error handling
 */

import {
  createProfileAction,
  fetchProfile,
  updateProfileAction,
  fetchProfileImage,
  fetchProperties,
  fetchPropertyDetails,
} from '@/utils/actions'
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '@/utils/errors'
import db from '@/utils/db'
import { currentUser, clerkClient } from '@clerk/nextjs/server'

// Mock dependencies
jest.mock('@/utils/db', () => ({
  __esModule: true,
  default: {
    profile: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    property: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      groupBy: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
    favorite: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock('@clerk/nextjs/server', () => ({
  currentUser: jest.fn(),
  clerkClient: {
    users: {
      updateUserMetadata: jest.fn(),
    },
  },
  auth: jest.fn(),
}))

jest.mock('@/utils/supabase', () => ({
  uploadImage: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: jest.fn((fn) => fn),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

describe('Profile Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createProfileAction', () => {
    const mockFormData = new FormData()
    mockFormData.append('firstName', 'John')
    mockFormData.append('lastName', 'Doe')
    mockFormData.append('username', 'johndoe')

    const mockUser = {
      id: 'user_123',
      emailAddresses: [{ emailAddress: 'john@example.com' }],
      imageUrl: 'https://example.com/avatar.jpg',
    }

    it('should create a profile successfully', async () => {
      const { redirect } = require('next/navigation')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.profile.findFirst as jest.Mock).mockResolvedValue(null)
      ;(db.profile.create as jest.Mock).mockResolvedValue({
        id: 'profile_123',
        clerkId: 'user_123',
        username: 'johndoe',
      })
      ;(clerkClient.users.updateUserMetadata as jest.Mock).mockResolvedValue({})

      await createProfileAction({}, mockFormData)

      expect(db.profile.findFirst).toHaveBeenCalledWith({
        where: { username: 'johndoe' },
      })
      expect(db.profile.create).toHaveBeenCalledWith({
        data: {
          clerkId: 'user_123',
          email: 'john@example.com',
          profileImage: 'https://example.com/avatar.jpg',
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
        },
      })
      expect(clerkClient.users.updateUserMetadata).toHaveBeenCalledWith(
        'user_123',
        {
          privateMetadata: {
            hasProfile: true,
          },
        }
      )
      // createProfileAction redirects on success
      expect(redirect).toHaveBeenCalledWith('/')
    })

    it('should throw ConflictError if username already exists', async () => {
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.profile.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing_profile',
        username: 'johndoe',
      })

      const result = await createProfileAction({}, mockFormData)

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('Username already exists')
      expect(db.profile.create).not.toHaveBeenCalled()
    })

    it('should handle authentication error when user is not logged in', async () => {
      ;(currentUser as jest.Mock).mockResolvedValue(null)

      const result = await createProfileAction({}, mockFormData)

      expect(result).toHaveProperty('message')
      expect(db.profile.create).not.toHaveBeenCalled()
    })

    it('should handle validation errors', async () => {
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const invalidFormData = new FormData()
      invalidFormData.append('firstName', '') // Invalid: empty

      const result = await createProfileAction({}, invalidFormData)

      expect(result).toHaveProperty('message')
      expect(db.profile.create).not.toHaveBeenCalled()
    })
  })

  describe('fetchProfile', () => {
    const mockUser = {
      id: 'user_123',
      privateMetadata: { hasProfile: true },
    }

    it('should fetch profile successfully', async () => {
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.profile.findUnique as jest.Mock).mockResolvedValue({
        id: 'profile_123',
        clerkId: 'user_123',
        username: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
      })

      const profile = await fetchProfile()

      expect(db.profile.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'user_123' },
      })
      expect(profile).toHaveProperty('username', 'johndoe')
    })

    it('should redirect if profile does not exist', async () => {
      const { redirect } = require('next/navigation')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.profile.findUnique as jest.Mock).mockResolvedValue(null)

      await fetchProfile()

      expect(redirect).toHaveBeenCalledWith('/profile/create')
    })

    it('should handle authentication error', async () => {
      ;(currentUser as jest.Mock).mockResolvedValue(null)

      await expect(fetchProfile()).rejects.toThrow(AuthenticationError)
    })
  })

  describe('updateProfileAction', () => {
    const mockUser = {
      id: 'user_123',
      privateMetadata: { hasProfile: true },
    }

    const mockFormData = new FormData()
    mockFormData.append('firstName', 'Jane')
    mockFormData.append('lastName', 'Smith')
    mockFormData.append('username', 'janesmith')

    it('should update profile successfully', async () => {
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.profile.findFirst as jest.Mock).mockResolvedValue(null) // No conflict
      ;(db.profile.update as jest.Mock).mockResolvedValue({
        id: 'profile_123',
        username: 'janesmith',
        firstName: 'Jane',
        lastName: 'Smith',
      })

      const result = await updateProfileAction({}, mockFormData)

      expect(db.profile.update).toHaveBeenCalledWith({
        where: { clerkId: 'user_123' },
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          username: 'janesmith',
        },
      })
      expect(result).toHaveProperty('message')
    })

    it('should throw ConflictError if username is taken by another user', async () => {
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.profile.findFirst as jest.Mock).mockResolvedValue({
        id: 'other_profile',
        username: 'janesmith',
      })

      const result = await updateProfileAction({}, mockFormData)

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('Username already exists')
      expect(db.profile.update).not.toHaveBeenCalled()
    })
  })

  describe('fetchProfileImage', () => {
    it('should return profile image when user is logged in', async () => {
      const mockUser = {
        id: 'user_123',
      }
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.profile.findUnique as jest.Mock).mockResolvedValue({
        profileImage: 'https://example.com/image.jpg',
      })

      const image = await fetchProfileImage()

      expect(image).toBe('https://example.com/image.jpg')
      expect(db.profile.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'user_123' },
        select: { profileImage: true },
      })
    })

    it('should return null when user is not logged in', async () => {
      ;(currentUser as jest.Mock).mockResolvedValue(null)

      const image = await fetchProfileImage()

      expect(image).toBeNull()
      expect(db.profile.findUnique).not.toHaveBeenCalled()
    })
  })
})

describe('Property Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchProperties', () => {
    it('should fetch properties with search and category filters', async () => {
      const mockProperties = [
        {
          id: 'prop_1',
          name: 'Beach House',
          price: 100,
          image: 'https://example.com/image.jpg',
        },
        {
          id: 'prop_2',
          name: 'Mountain Cabin',
          price: 150,
          image: 'https://example.com/image2.jpg',
        },
      ]

      ;(db.property.findMany as jest.Mock).mockResolvedValue(mockProperties)

      const properties = await fetchProperties({
        search: 'beach',
        category: 'house',
      })

      expect(db.property.findMany).toHaveBeenCalled()
      expect(properties).toHaveLength(2)
    })

    it('should return empty array when no properties found', async () => {
      ;(db.property.findMany as jest.Mock).mockResolvedValue([])

      const properties = await fetchProperties({})

      expect(properties).toEqual([])
    })
  })

  describe('fetchPropertyDetails', () => {
    it('should fetch property details with all relations', async () => {
      const mockProperty = {
        id: 'prop_123',
        name: 'Test Property',
        price: 100,
        profile: {
          id: 'profile_123',
          firstName: 'John',
          lastName: 'Doe',
        },
      }

      ;(db.property.findUnique as jest.Mock).mockResolvedValue(mockProperty)

      const property = await fetchPropertyDetails('prop_123')

      // Verify the function was called (exact structure may vary)
      expect(db.property.findUnique).toHaveBeenCalled()
      const callArgs = (db.property.findUnique as jest.Mock).mock.calls[0][0]
      expect(callArgs.where.id).toBe('prop_123')
      expect(callArgs.include).toBeDefined()
      expect(property).toEqual(mockProperty)
    })

    it('should return null when property not found', async () => {
      ;(db.property.findUnique as jest.Mock).mockResolvedValue(null)

      const property = await fetchPropertyDetails('nonexistent')

      expect(property).toBeNull()
    })
  })
})

describe('Booking Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user_123',
    privateMetadata: { hasProfile: true },
  }

  describe('createBookingAction', () => {
    it('should create booking successfully', async () => {
      const { createBookingAction } = require('@/utils/actions')
      const { redirect } = require('next/navigation')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockProperty = {
        id: 'prop_123',
        price: 100,
      }

      const prevState = {
        propertyId: 'prop_123',
        checkIn: new Date('2024-01-01'),
        checkOut: new Date('2024-01-04'),
      }

      ;(db.booking.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(db.property.findUnique as jest.Mock).mockResolvedValue(mockProperty)
      ;(db.booking.findFirst as jest.Mock).mockResolvedValue(null) // No conflict
      ;(db.booking.create as jest.Mock).mockResolvedValue({
        id: 'booking_123',
        propertyId: 'prop_123',
        totalNights: 3,
      })

      await createBookingAction(prevState, new FormData())

      expect(db.property.findUnique).toHaveBeenCalled()
      expect(db.booking.create).toHaveBeenCalled()
      expect(redirect).toHaveBeenCalled()
    })

    it('should handle property not found', async () => {
      const { createBookingAction } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const prevState = {
        propertyId: 'nonexistent',
        checkIn: new Date('2024-01-01'),
        checkOut: new Date('2024-01-04'),
      }

      ;(db.booking.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(db.property.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await createBookingAction(prevState, new FormData())

      expect(result).toHaveProperty('message')
      expect(db.booking.create).not.toHaveBeenCalled()
    })

    it('should handle booking conflicts', async () => {
      const { createBookingAction } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockProperty = {
        id: 'prop_123',
        price: 100,
      }

      const prevState = {
        propertyId: 'prop_123',
        checkIn: new Date('2024-01-01'),
        checkOut: new Date('2024-01-04'),
      }

      ;(db.booking.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(db.property.findUnique as jest.Mock).mockResolvedValue(mockProperty)
      ;(db.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing_booking',
      }) // Conflict exists

      const result = await createBookingAction(prevState, new FormData())

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('booked')
      expect(db.booking.create).not.toHaveBeenCalled()
    })

    it('should validate date range', async () => {
      const { createBookingAction } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const prevState = {
        propertyId: 'prop_123',
        checkIn: new Date('2024-01-04'),
        checkOut: new Date('2024-01-01'), // Invalid: checkOut before checkIn
      }

      ;(db.booking.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })

      const result = await createBookingAction(prevState, new FormData())

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('after')
      expect(db.booking.create).not.toHaveBeenCalled()
    })
  })
})

describe('Review Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user_123',
    privateMetadata: { hasProfile: true },
  }

  describe('createReviewAction', () => {
    const mockFormData = new FormData()
    mockFormData.append('propertyId', 'prop_123')
    mockFormData.append('rating', '5')
    mockFormData.append('comment', 'Great place!')

    it('should create review successfully', async () => {
      const { createReviewAction } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.property.findUnique as jest.Mock).mockResolvedValue({
        id: 'prop_123',
      })
      ;(db.review.findFirst as jest.Mock).mockResolvedValue(null) // No existing review
      ;(db.review.create as jest.Mock).mockResolvedValue({
        id: 'review_123',
        rating: 5,
      })

      const result = await createReviewAction({}, mockFormData)

      expect(db.review.create).toHaveBeenCalled()
      expect(result).toHaveProperty('message')
    })

    it('should prevent duplicate reviews', async () => {
      const { createReviewAction } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.property.findUnique as jest.Mock).mockResolvedValue({
        id: 'prop_123',
      })
      ;(db.review.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing_review',
      }) // Review already exists

      const result = await createReviewAction({}, mockFormData)

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('already')
      expect(db.review.create).not.toHaveBeenCalled()
    })

    it('should handle property not found', async () => {
      const { createReviewAction } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.property.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await createReviewAction({}, mockFormData)

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('not found')
      expect(db.review.create).not.toHaveBeenCalled()
    })
  })
})

describe('Favorite Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user_123',
    privateMetadata: { hasProfile: true },
  }

  describe('fetchFavoriteId', () => {
    it('should return favorite ID if exists', async () => {
      const { fetchFavoriteId } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.favorite.findFirst as jest.Mock).mockResolvedValue({
        id: 'favorite_123',
      })

      const favoriteId = await fetchFavoriteId({ propertyId: 'prop_123' })

      expect(favoriteId).toBe('favorite_123')
      expect(db.favorite.findFirst).toHaveBeenCalledWith({
        where: {
          propertyId: 'prop_123',
          profileId: 'user_123',
        },
        select: { id: true },
      })
    })

    it('should return null if favorite does not exist', async () => {
      const { fetchFavoriteId } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.favorite.findFirst as jest.Mock).mockResolvedValue(null)

      const favoriteId = await fetchFavoriteId({ propertyId: 'prop_123' })

      expect(favoriteId).toBeNull()
    })
  })

  describe('toggleFavoriteAction', () => {
    it('should add favorite when not exists', async () => {
      const { toggleFavoriteAction } = require('@/utils/actions')
      const { revalidatePath } = require('next/cache')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.property.findUnique as jest.Mock).mockResolvedValue({
        id: 'prop_123',
      })
      ;(db.favorite.findFirst as jest.Mock).mockResolvedValue(null)
      ;(db.favorite.create as jest.Mock).mockResolvedValue({
        id: 'favorite_123',
      })

      const result = await toggleFavoriteAction({
        propertyId: 'prop_123',
        favoriteId: null,
        pathname: '/properties/prop_123',
      })

      expect(db.favorite.create).toHaveBeenCalled()
      expect(result).toHaveProperty('message', 'Added to Faves')
      expect(revalidatePath).toHaveBeenCalled()
    })

    it('should remove favorite when exists', async () => {
      const { toggleFavoriteAction } = require('@/utils/actions')
      const { revalidatePath } = require('next/cache')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.property.findUnique as jest.Mock).mockResolvedValue({
        id: 'prop_123',
      })
      ;(db.favorite.delete as jest.Mock).mockResolvedValue({
        id: 'favorite_123',
      })

      const result = await toggleFavoriteAction({
        propertyId: 'prop_123',
        favoriteId: 'favorite_123',
        pathname: '/properties/prop_123',
      })

      expect(db.favorite.delete).toHaveBeenCalledWith({
        where: { id: 'favorite_123' },
      })
      expect(result).toHaveProperty('message', 'Removed from Faves')
      expect(revalidatePath).toHaveBeenCalled()
    })

    it('should handle property not found', async () => {
      const { toggleFavoriteAction } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.property.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await toggleFavoriteAction({
        propertyId: 'nonexistent',
        favoriteId: null,
        pathname: '/properties/nonexistent',
      })

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('not found')
      expect(db.favorite.create).not.toHaveBeenCalled()
    })
  })

  describe('fetchFavorites', () => {
    it('should fetch user favorites', async () => {
      const { fetchFavorites } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockFavorites = [
        {
          property: {
            id: 'prop_1',
            name: 'Beach House',
            tagline: 'Beautiful beach house',
            country: 'AU',
            price: 100,
            image: 'image1.jpg',
          },
        },
        {
          property: {
            id: 'prop_2',
            name: 'Mountain Cabin',
            tagline: 'Cozy mountain cabin',
            country: 'AU',
            price: 150,
            image: 'image2.jpg',
          },
        },
      ]

      ;(db.favorite.findMany as jest.Mock).mockResolvedValue(mockFavorites)

      const favorites = await fetchFavorites()

      // Verify the function was called (exact structure may vary)
      expect(db.favorite.findMany).toHaveBeenCalled()
      const callArgs = (db.favorite.findMany as jest.Mock).mock.calls[0][0]
      expect(callArgs.where.profileId).toBe('user_123')
      expect(callArgs.select).toBeDefined()
      // The function maps favorites to return only properties
      expect(favorites).toHaveLength(2)
      expect(favorites[0]).toHaveProperty('name')
    })
  })
})

describe('Booking Management Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user_123',
    privateMetadata: { hasProfile: true },
  }

  describe('fetchBookings', () => {
    it('should fetch user bookings', async () => {
      const { fetchBookings } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockBookings = [
        {
          id: 'booking_1',
          checkIn: new Date('2024-01-01'),
          checkOut: new Date('2024-01-04'),
          property: {
            id: 'prop_1',
            name: 'Beach House',
          },
        },
      ]

      ;(db.booking.findMany as jest.Mock).mockResolvedValue(mockBookings)

      const bookings = await fetchBookings()

      expect(db.booking.findMany).toHaveBeenCalledWith({
        where: {
          profileId: 'user_123',
          paymentStatus: true,
        },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              country: true,
            },
          },
        },
        orderBy: { checkIn: 'desc' },
      })
      expect(bookings).toHaveLength(1)
    })
  })

  describe('deleteBookingAction', () => {
    it('should delete booking successfully', async () => {
      const { deleteBookingAction } = require('@/utils/actions')
      const { revalidatePath } = require('next/cache')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockBooking = {
        id: 'booking_123',
        profileId: 'user_123',
      }

      ;(db.booking.findFirst as jest.Mock).mockResolvedValue(mockBooking)
      ;(db.booking.delete as jest.Mock).mockResolvedValue(mockBooking)

      const result = await deleteBookingAction({ bookingId: 'booking_123' })

      expect(db.booking.delete).toHaveBeenCalledWith({
        where: {
          id: 'booking_123',
          profileId: 'user_123',
        },
      })
      expect(result).toHaveProperty('message', 'Booking deleted successfully')
      expect(revalidatePath).toHaveBeenCalledWith('/bookings')
    })

    it('should handle booking not found', async () => {
      const { deleteBookingAction } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.booking.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await deleteBookingAction({ bookingId: 'nonexistent' })

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('not found')
      expect(db.booking.delete).not.toHaveBeenCalled()
    })

    it('should prevent deleting other users bookings', async () => {
      const { deleteBookingAction } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.booking.findFirst as jest.Mock).mockResolvedValue(null) // Not found for this user

      const result = await deleteBookingAction({
        bookingId: 'other_user_booking',
      })

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('not found')
      expect(db.booking.delete).not.toHaveBeenCalled()
    })
  })
})

describe('Review Management Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user_123',
    privateMetadata: { hasProfile: true },
  }

  describe('fetchPropertyReviews', () => {
    it('should fetch property reviews', async () => {
      const { fetchPropertyReviews } = require('@/utils/actions')

      const mockReviews = [
        {
          id: 'review_1',
          rating: 5,
          comment: 'Great place!',
          profile: {
            firstName: 'John',
            profileImage: 'image.jpg',
          },
        },
      ]

      ;(db.review.findMany as jest.Mock).mockResolvedValue(mockReviews)

      const reviews = await fetchPropertyReviews('prop_123')

      expect(reviews).toHaveLength(1)
      expect(reviews[0].rating).toBe(5)
    })
  })

  describe('fetchPropertyRating', () => {
    it('should calculate average rating', async () => {
      const { fetchPropertyRating } = require('@/utils/actions')

      const mockGroupByResult = [
        {
          propertyId: 'prop_123',
          _avg: {
            rating: 4.67,
          },
          _count: {
            rating: 3,
          },
        },
      ]

      ;(db.review.groupBy as jest.Mock).mockResolvedValue(mockGroupByResult)

      const result = await fetchPropertyRating('prop_123')

      // The function returns { rating: string, count: number }
      expect(result).toBeDefined()
      expect(result).toHaveProperty('rating')
      expect(result).toHaveProperty('count')
      // rating is a string from toFixed(1)
      expect(String(result.rating)).toBe('4.7')
      expect(result.count).toBe(3)
      expect(db.review.groupBy).toHaveBeenCalled()
    })

    it('should return 0 when no reviews', async () => {
      const { fetchPropertyRating } = require('@/utils/actions')
      ;(db.review.groupBy as jest.Mock).mockResolvedValue([])

      const result = await fetchPropertyRating('prop_123')

      expect(result).toBeDefined()
      expect(result).toHaveProperty('rating')
      expect(result).toHaveProperty('count')
      // When result[0] is undefined, rating defaults to 0 (number)
      // The code uses: result[0]?._avg.rating?.toFixed(1) ?? '0'
      // So it returns '0' (string) when no reviews (toFixed returns string)
      expect(result.rating).toBe('0')
      expect(result.count).toBe(0)
    })
  })

  describe('deleteReviewAction', () => {
    it('should delete review successfully', async () => {
      const { deleteReviewAction } = require('@/utils/actions')
      const { revalidatePath } = require('next/cache')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockReview = {
        id: 'review_123',
        profileId: 'user_123',
        propertyId: 'prop_123',
      }

      ;(db.review.findFirst as jest.Mock).mockResolvedValue(mockReview)
      ;(db.review.delete as jest.Mock).mockResolvedValue(mockReview)

      const result = await deleteReviewAction({ reviewId: 'review_123' })

      expect(db.review.delete).toHaveBeenCalledWith({
        where: {
          id: 'review_123',
          profileId: 'user_123',
        },
      })
      expect(result).toHaveProperty('message')
      expect(revalidatePath).toHaveBeenCalled()
    })

    it('should handle review not found', async () => {
      const { deleteReviewAction } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.review.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await deleteReviewAction({ reviewId: 'nonexistent' })

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('not found')
      expect(db.review.delete).not.toHaveBeenCalled()
    })
  })
})

describe('Property Management Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user_123',
    privateMetadata: { hasProfile: true },
  }

  describe('createPropertyAction', () => {
    it('should create property successfully', async () => {
      const { createPropertyAction } = require('@/utils/actions')
      const { uploadImage } = require('@/utils/supabase')
      const { redirect } = require('next/navigation')

      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const mockFormData = new FormData()
      mockFormData.append('name', 'Test Property')
      mockFormData.append('tagline', 'Great place')
      // Description needs at least 10 words
      mockFormData.append(
        'description',
        'This is a wonderful place to stay with amazing views and great amenities for your perfect vacation experience.'
      )
      mockFormData.append('price', '100')
      mockFormData.append('country', 'AU')
      mockFormData.append('category', 'house')
      mockFormData.append('bedrooms', '2')
      mockFormData.append('beds', '2')
      mockFormData.append('baths', '1')
      mockFormData.append('guests', '4')
      mockFormData.append('amenities', 'WiFi, Parking, Pool')
      mockFormData.append('image', mockFile)
      ;(uploadImage as jest.Mock).mockResolvedValue(
        'https://example.com/image.jpg'
      )
      ;(db.property.create as jest.Mock).mockResolvedValue({
        id: 'prop_123',
        name: 'Test Property',
      })

      const result = await createPropertyAction({}, mockFormData)

      // Check if there was a validation error
      if (result && result.message && !result.message.includes('success')) {
        // If we got an error, log it to understand what went wrong
        console.error('Action returned error:', result.message)
        // This test expects success, so fail if we got an error
        throw new Error(`Expected success but got error: ${result.message}`)
      }

      // If redirect throws (as it does in tests), the function returns early
      // So we check if uploadImage was called before redirect
      // In a real scenario, redirect would happen, but in tests it throws
      expect(uploadImage).toHaveBeenCalled()
      expect(db.property.create).toHaveBeenCalled()
      expect(redirect).toHaveBeenCalledWith('/')
    })

    it('should handle missing image file', async () => {
      const { createPropertyAction } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockFormData = new FormData()
      mockFormData.append('name', 'Test Property')
      // No image file

      const result = await createPropertyAction({}, mockFormData)

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('image')
      expect(db.property.create).not.toHaveBeenCalled()
    })

    it('should handle image upload failure', async () => {
      const { createPropertyAction } = require('@/utils/actions')
      const { uploadImage } = require('@/utils/supabase')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const mockFormData = new FormData()
      mockFormData.append('name', 'Test Property')
      mockFormData.append('tagline', 'Great place')
      // Description needs at least 10 words
      mockFormData.append(
        'description',
        'This is a wonderful place to stay with amazing views and great amenities for your perfect vacation experience.'
      )
      mockFormData.append('price', '100')
      mockFormData.append('country', 'AU')
      mockFormData.append('category', 'house')
      mockFormData.append('bedrooms', '2')
      mockFormData.append('beds', '2')
      mockFormData.append('baths', '1')
      mockFormData.append('guests', '4')
      mockFormData.append('amenities', 'WiFi, Parking, Pool')
      mockFormData.append('image', mockFile)

      uploadImage.mockRejectedValue(new Error('Upload failed'))

      const result = await createPropertyAction({}, mockFormData)

      expect(result).toHaveProperty('message')
      // ExternalServiceError message format: "Supabase error: Failed to upload property image"
      // The message should indicate an error occurred
      expect(result.message).toBeDefined()
      expect(typeof result.message).toBe('string')
      expect(result.message.length).toBeGreaterThan(0)
      expect(db.property.create).not.toHaveBeenCalled()
    })
  })

  describe('updateProfileImageAction', () => {
    it('should update profile image successfully', async () => {
      const { updateProfileImageAction } = require('@/utils/actions')
      const { uploadImage } = require('@/utils/supabase')
      const { revalidatePath } = require('next/cache')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      const mockFormData = new FormData()
      mockFormData.append('image', mockFile)

      uploadImage.mockResolvedValue('https://example.com/new-avatar.jpg')
      ;(db.profile.update as jest.Mock).mockResolvedValue({
        id: 'profile_123',
        profileImage: 'https://example.com/new-avatar.jpg',
      })

      const result = await updateProfileImageAction({}, mockFormData)

      expect(uploadImage).toHaveBeenCalled()
      expect(db.profile.update).toHaveBeenCalledWith({
        where: { clerkId: 'user_123' },
        data: { profileImage: 'https://example.com/new-avatar.jpg' },
      })
      expect(result).toHaveProperty(
        'message',
        'Profile image updated successfully'
      )
      expect(revalidatePath).toHaveBeenCalledWith('/profile')
    })

    it('should handle missing image', async () => {
      const { updateProfileImageAction } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockFormData = new FormData()
      // No image

      const result = await updateProfileImageAction({}, mockFormData)

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('Image is required')
      expect(db.profile.update).not.toHaveBeenCalled()
    })
  })
})

describe('Rental Management Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user_123',
    privateMetadata: { hasProfile: true },
  }

  describe('fetchRentals', () => {
    it('should fetch rentals with aggregated booking data', async () => {
      const { fetchRentals } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockRentals = [
        { id: 'prop_1', name: 'Property 1', price: 100 },
        { id: 'prop_2', name: 'Property 2', price: 150 },
      ]

      const mockAggregate = [
        {
          propertyId: 'prop_1',
          _sum: { totalNights: 10, orderTotal: 1000 },
        },
      ]

      ;(db.property.findMany as jest.Mock).mockResolvedValue(mockRentals)
      ;(db.booking.groupBy as jest.Mock).mockResolvedValue(mockAggregate)

      const rentals = await fetchRentals()

      expect(rentals).toHaveLength(2)
      expect(rentals[0]).toHaveProperty('totalNightsSum', 10)
      expect(rentals[0]).toHaveProperty('orderTotalSum', 1000)
      expect(rentals[1]).toHaveProperty('totalNightsSum', 0)
    })

    it('should handle empty rentals list', async () => {
      const { fetchRentals } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.property.findMany as jest.Mock).mockResolvedValue([])

      const rentals = await fetchRentals()

      expect(rentals).toEqual([])
      expect(db.booking.groupBy).not.toHaveBeenCalled()
    })
  })

  describe('deleteRentalAction', () => {
    it('should delete rental successfully', async () => {
      const { deleteRentalAction } = require('@/utils/actions')
      const { revalidatePath } = require('next/cache')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockProperty = {
        id: 'prop_123',
        profileId: 'user_123',
      }

      ;(db.property.findFirst as jest.Mock).mockResolvedValue(mockProperty)
      ;(db.property.delete as jest.Mock).mockResolvedValue(mockProperty)

      const result = await deleteRentalAction({ propertyId: 'prop_123' })

      expect(db.property.delete).toHaveBeenCalledWith({
        where: {
          id: 'prop_123',
          profileId: 'user_123', // deleteRentalAction includes profileId for security
        },
      })
      expect(result).toHaveProperty('message')
      expect(revalidatePath).toHaveBeenCalled()
    })

    it('should handle property not found', async () => {
      const { deleteRentalAction } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.property.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await deleteRentalAction({ propertyId: 'nonexistent' })

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('not found')
      expect(db.property.delete).not.toHaveBeenCalled()
    })

    it('should prevent deleting other users properties', async () => {
      const { deleteRentalAction } = require('@/utils/actions')
      ;(currentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(db.property.findFirst as jest.Mock).mockResolvedValue(null) // Not found for this user

      const result = await deleteRentalAction({
        propertyId: 'other_user_property',
      })

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('not found')
      expect(db.property.delete).not.toHaveBeenCalled()
    })
  })
})
