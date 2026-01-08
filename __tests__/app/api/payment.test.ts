import { POST } from '@/app/api/payment/route'
import db from '@/utils/db'

// Mock rate limiting
jest.mock('@/utils/rate-limit', () => ({
  rateLimit: jest.fn(() => ({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 60000,
  })),
  getClientIP: jest.fn(() => '127.0.0.1'),
  RATE_LIMITS: {
    PAYMENT: { max: 10, window: 60 },
  },
}))

// Mock NextRequest
const createMockRequest = (url: string, options?: RequestInit) => {
  return {
    url,
    method: options?.method || 'GET',
    headers: new Headers(options?.headers),
    json: async () => {
      if (options?.body) {
        return typeof options.body === 'string'
          ? JSON.parse(options.body)
          : options.body
      }
      return {}
    },
  } as any
}

// Mock Stripe
jest.mock('stripe', () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  }
  return jest.fn().mockImplementation(() => mockStripe)
})

// Mock database
jest.mock('@/utils/db', () => ({
  booking: {
    findUnique: jest.fn(),
  },
}))

// Mock format utility
jest.mock('@/utils/format', () => ({
  formatDate: jest.fn((date) => date.toISOString().split('T')[0]),
}))

describe('/api/payment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
  })

  it('should create payment session successfully', async () => {
    const mockBooking = {
      id: 'booking-1',
      totalNights: 3,
      orderTotal: 391,
      checkIn: new Date('2024-01-01'),
      checkOut: new Date('2024-01-04'),
      property: {
        name: 'Beach House',
        image: '/images/beach-house.jpg',
      },
    }

    const mockSession = {
      client_secret: 'cs_test_mock_secret',
    }

    ;(db.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking)

    // Get the mocked Stripe instance
    const Stripe = require('stripe')
    const stripeInstance = new Stripe()
    stripeInstance.checkout.sessions.create.mockResolvedValue(mockSession)

    const request = createMockRequest('http://localhost:3000/api/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.clientSecret).toBe('cs_test_mock_secret')
    expect(db.booking.findUnique).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      include: {
        property: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    })
  })

  it('should return 404 when booking not found', async () => {
    ;(db.booking.findUnique as jest.Mock).mockResolvedValue(null)

    const request = createMockRequest('http://localhost:3000/api/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({ bookingId: 'non-existent' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(404)
    const Stripe = require('stripe')
    const stripeInstance = new Stripe()
    expect(stripeInstance.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('should handle Stripe errors gracefully', async () => {
    const mockBooking = {
      id: 'booking-1',
      totalNights: 3,
      orderTotal: 391,
      checkIn: new Date('2024-01-01'),
      checkOut: new Date('2024-01-04'),
      property: {
        name: 'Beach House',
        image: '/images/beach-house.jpg',
      },
    }

    ;(db.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking)

    // Get the mocked Stripe instance
    const Stripe = require('stripe')
    const stripeInstance = new Stripe()
    stripeInstance.checkout.sessions.create.mockRejectedValue(
      new Error('Stripe error')
    )

    const request = createMockRequest('http://localhost:3000/api/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(502) // ExternalServiceError returns 502
  })

  it('should return 500 when bookingId is missing', async () => {
    const request = createMockRequest('http://localhost:3000/api/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({}), // No bookingId
    })

    const response = await POST(request)
    const data = await response.json()

    // handleApiError converts generic Error to 500
    expect(response.status).toBe(500)
    expect(data.error.message).toContain('Booking ID is required')
    expect(db.booking.findUnique).not.toHaveBeenCalled()
  })

  it('should return 500 when origin header is missing', async () => {
    const request = createMockRequest('http://localhost:3000/api/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No origin header
      },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    // handleApiError converts generic Error to 500
    expect(response.status).toBe(500)
    expect(data.error.message).toContain('Origin header is required')
  })

  it('should return 402 when booking is already paid', async () => {
    const mockBooking = {
      id: 'booking-1',
      totalNights: 3,
      orderTotal: 391,
      paymentStatus: true, // Already paid
      checkIn: new Date('2024-01-01'),
      checkOut: new Date('2024-01-04'),
      property: {
        name: 'Beach House',
        image: '/images/beach-house.jpg',
      },
    }

    ;(db.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking)

    const request = createMockRequest('http://localhost:3000/api/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    // PaymentError returns 402
    expect(response.status).toBe(402)
    expect(data.error.message).toContain('already been paid')

    const Stripe = require('stripe')
    const stripeInstance = new Stripe()
    expect(stripeInstance.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('should return 402 when orderTotal is invalid', async () => {
    const mockBooking = {
      id: 'booking-1',
      totalNights: 3,
      orderTotal: 0, // Invalid: zero or negative
      checkIn: new Date('2024-01-01'),
      checkOut: new Date('2024-01-04'),
      property: {
        name: 'Beach House',
        image: '/images/beach-house.jpg',
      },
    }

    ;(db.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking)

    const request = createMockRequest('http://localhost:3000/api/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    // PaymentError returns 402
    expect(response.status).toBe(402)
    expect(data.error.message).toContain('Invalid order total')
  })

  it('should return 402 when Stripe client secret is missing', async () => {
    const mockBooking = {
      id: 'booking-1',
      totalNights: 3,
      orderTotal: 391,
      checkIn: new Date('2024-01-01'),
      checkOut: new Date('2024-01-04'),
      property: {
        name: 'Beach House',
        image: '/images/beach-house.jpg',
      },
    }

    const mockSession = {
      // Missing client_secret - PaymentError returns 402
    }

    ;(db.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking)

    const Stripe = require('stripe')
    const stripeInstance = new Stripe()
    stripeInstance.checkout.sessions.create.mockResolvedValue(mockSession)

    const request = createMockRequest('http://localhost:3000/api/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(402) // PaymentError returns 402
    expect(data.error.message).toContain('client secret')
  })

  it('should include correct metadata in Stripe session', async () => {
    const mockBooking = {
      id: 'booking-1',
      totalNights: 3,
      orderTotal: 391,
      checkIn: new Date('2024-01-01'),
      checkOut: new Date('2024-01-04'),
      property: {
        name: 'Beach House',
        image: '/images/beach-house.jpg',
      },
    }

    const mockSession = {
      client_secret: 'cs_test_mock_secret',
    }

    ;(db.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking)

    const Stripe = require('stripe')
    const stripeInstance = new Stripe()
    stripeInstance.checkout.sessions.create.mockResolvedValue(mockSession)

    const request = createMockRequest('http://localhost:3000/api/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({ bookingId: 'booking-1' }),
    })

    await POST(request)

    expect(stripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          bookingId: 'booking-1',
        },
        mode: 'payment',
        ui_mode: 'embedded',
      })
    )
  })
})
