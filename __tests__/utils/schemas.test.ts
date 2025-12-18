import {
  profileSchema,
  propertySchema,
  createReviewSchema,
  imageSchema,
  validateWithZodSchema,
} from '@/utils/schemas'
import { ValidationError } from '@/utils/errors'

describe('Zod Schemas', () => {
  describe('profileSchema', () => {
    it('should validate valid profile data', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      }
      expect(() => validateWithZodSchema(profileSchema, validData)).not.toThrow()
    })

    it('should throw for short firstName', () => {
      const invalidData = {
        firstName: 'J',
        lastName: 'Doe',
        username: 'johndoe',
      }
      expect(() => validateWithZodSchema(profileSchema, invalidData)).toThrow(
        ValidationError
      )
    })

    it('should throw for missing required fields', () => {
      const invalidData = {
        firstName: 'John',
        // missing lastName and username
      }
      expect(() => validateWithZodSchema(profileSchema, invalidData)).toThrow(
        ValidationError
      )
    })
  })

  describe('propertySchema', () => {
    it('should validate valid property data', () => {
      const validData = {
        name: 'Beach House',
        tagline: 'Beautiful beachfront property',
        price: 150,
        category: 'house',
        description: 'This is a beautiful beach house with amazing ocean views and modern amenities',
        country: 'US',
        guests: 4,
        bedrooms: 2,
        beds: 3,
        baths: 2,
        amenities: 'wifi,pool,parking',
      }
      expect(() => validateWithZodSchema(propertySchema, validData)).not.toThrow()
    })

    it('should throw for price less than 0', () => {
      const invalidData = {
        name: 'Beach House',
        tagline: 'Beautiful beachfront property',
        price: -10,
        category: 'house',
        description: 'This is a beautiful beach house',
        country: 'US',
        guests: 4,
        bedrooms: 2,
        beds: 3,
        baths: 2,
        amenities: 'wifi',
      }
      expect(() => validateWithZodSchema(propertySchema, invalidData)).toThrow(
        ValidationError
      )
    })

    it('should throw for description too short', () => {
      const invalidData = {
        name: 'Beach House',
        tagline: 'Beautiful beachfront property',
        price: 150,
        category: 'house',
        description: 'Short', // less than 10 words
        country: 'US',
        guests: 4,
        bedrooms: 2,
        beds: 3,
        baths: 2,
        amenities: 'wifi',
      }
      expect(() => validateWithZodSchema(propertySchema, invalidData)).toThrow(
        ValidationError
      )
    })

    it('should coerce string numbers to numbers', () => {
      const data = {
        name: 'Beach House',
        tagline: 'Beautiful beachfront property',
        price: '150', // string
        category: 'house',
        description: 'This is a beautiful beach house with amazing ocean views',
        country: 'US',
        guests: '4', // string
        bedrooms: '2', // string
        beds: '3', // string
        baths: '2', // string
        amenities: 'wifi',
      }
      const result = validateWithZodSchema(propertySchema, data)
      expect(typeof result.price).toBe('number')
      expect(typeof result.guests).toBe('number')
    })
  })

  describe('createReviewSchema', () => {
    it('should validate valid review data', () => {
      const validData = {
        propertyId: 'prop-123',
        rating: 5,
        comment: 'This is a great property with amazing amenities and location',
      }
      expect(() => validateWithZodSchema(createReviewSchema, validData)).not.toThrow()
    })

    it('should throw for rating less than 1', () => {
      const invalidData = {
        propertyId: 'prop-123',
        rating: 0,
        comment: 'This is a great property',
      }
      expect(() => validateWithZodSchema(createReviewSchema, invalidData)).toThrow(
        ValidationError
      )
    })

    it('should throw for rating greater than 5', () => {
      const invalidData = {
        propertyId: 'prop-123',
        rating: 6,
        comment: 'This is a great property',
      }
      expect(() => validateWithZodSchema(createReviewSchema, invalidData)).toThrow(
        ValidationError
      )
    })

    it('should throw for comment too short', () => {
      const invalidData = {
        propertyId: 'prop-123',
        rating: 5,
        comment: 'Short', // less than 10 characters
      }
      expect(() => validateWithZodSchema(createReviewSchema, invalidData)).toThrow(
        ValidationError
      )
    })
  })

  describe('imageSchema', () => {
    it('should validate valid image file', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 500 * 1024 }) // 500KB

      const validData = { image: file }
      expect(() => validateWithZodSchema(imageSchema, validData)).not.toThrow()
    })

    it('should throw for file too large', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 2 * 1024 * 1024 }) // 2MB

      const invalidData = { image: file }
      expect(() => validateWithZodSchema(imageSchema, invalidData)).toThrow(
        ValidationError
      )
    })

    it('should throw for non-image file', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      Object.defineProperty(file, 'size', { value: 100 * 1024 })

      const invalidData = { image: file }
      expect(() => validateWithZodSchema(imageSchema, invalidData)).toThrow(
        ValidationError
      )
    })
  })

  describe('validateWithZodSchema', () => {
    it('should throw ValidationError on validation failure', () => {
      const invalidData = { name: 'A' } // too short
      expect(() => validateWithZodSchema(profileSchema, invalidData)).toThrow(
        ValidationError
      )
    })

    it('should return validated data on success', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      }
      const result = validateWithZodSchema(profileSchema, validData)
      expect(result).toEqual(validData)
    })
  })
})

