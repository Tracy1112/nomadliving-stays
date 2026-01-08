import { formatDate, formatCurrency, formatQuantity } from '@/utils/format'

describe('formatDate', () => {
  it('should format date with day and month (Australian format)', () => {
    const date = new Date('2024-01-15')
    const result = formatDate(date)
    expect(result).toBe('15 January 2024') // Australian format: DD Month YYYY
  })

  it('should format date with only month when onlyMonth is true', () => {
    const date = new Date('2024-01-15')
    const result = formatDate(date, true)
    expect(result).toBe('January 2024')
  })

  it('should handle different months correctly', () => {
    const date = new Date('2024-12-25')
    const result = formatDate(date)
    expect(result).toBe('25 December 2024') // Australian format
  })

  it('should handle leap year correctly', () => {
    const date = new Date('2024-02-29')
    const result = formatDate(date)
    expect(result).toBe('29 February 2024') // Australian format
  })
})

describe('formatCurrency', () => {
  it('should format positive numbers as AUD currency', () => {
    expect(formatCurrency(100)).toBe('$100') // Australian Dollar format (en-AU uses $)
    expect(formatCurrency(1000)).toBe('$1,000')
    expect(formatCurrency(1234.56)).toBe('$1,235') // Rounds to nearest dollar
  })

  it('should format zero as AUD currency', () => {
    expect(formatCurrency(0)).toBe('$0')
  })

  it('should handle null values', () => {
    expect(formatCurrency(null)).toBe('$0')
  })

  it('should handle negative numbers', () => {
    expect(formatCurrency(-100)).toBe('-$100')
  })

  it('should handle decimal numbers correctly', () => {
    expect(formatCurrency(99.99)).toBe('$100') // Rounds up
    expect(formatCurrency(99.49)).toBe('$99') // Rounds down
  })

  it('should handle large numbers with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000')
  })
})

describe('formatQuantity', () => {
  it('should return singular form for quantity of 1', () => {
    expect(formatQuantity(1, 'night')).toBe('1 night')
    expect(formatQuantity(1, 'guest')).toBe('1 guest')
    expect(formatQuantity(1, 'bedroom')).toBe('1 bedroom')
  })

  it('should return plural form for quantity greater than 1', () => {
    expect(formatQuantity(2, 'night')).toBe('2 nights')
    expect(formatQuantity(5, 'guest')).toBe('5 guests')
    expect(formatQuantity(3, 'bedroom')).toBe('3 bedrooms')
  })

  it('should handle zero quantity', () => {
    expect(formatQuantity(0, 'night')).toBe('0 nights')
  })

  it('should handle irregular plurals', () => {
    expect(formatQuantity(1, 'person')).toBe('1 person')
    expect(formatQuantity(2, 'person')).toBe('2 persons')
  })
})

