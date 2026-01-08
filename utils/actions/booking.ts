/**
 * Booking Actions
 * 
 * Server actions for property bookings and reservations
 * @module actions/booking
 */

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import db from '../db';
import { calculateTotals } from '../calculateTotals';
import {
  ValidationError,
  ConflictError,
  handleServerActionError,
  ensureExists,
} from '../errors';
import { getAuthUser } from './auth';

/**
 * Create a new booking
 * 
 * Validates date range, checks for conflicts with existing bookings,
 * calculates totals, and creates the booking. Cleans up unpaid bookings
 * for the user before creating a new one.
 * 
 * @param {Object} prevState - Previous state containing booking details
 * @param {string} prevState.propertyId - Property ID to book
 * @param {Date} prevState.checkIn - Check-in date
 * @param {Date} prevState.checkOut - Check-out date
 * @returns {Promise<void>} Redirects to checkout page on success
 * @throws {ValidationError} If date range is invalid
 * @throws {ConflictError} If dates conflict with existing bookings
 * @throws {NotFoundError} If property doesn't exist
 * 
 * @example
 * ```ts
 * await createBookingAction({
 *   propertyId: 'prop_123',
 *   checkIn: new Date('2024-01-01'),
 *   checkOut: new Date('2024-01-05')
 * });
 * ```
 */
export async function createBookingAction(prevState: {
  propertyId: string;
  checkIn: Date;
  checkOut: Date;
}) {
  const user = await getAuthUser();
  
  try {
    // Clean up unpaid old bookings
    await db.booking.deleteMany({
      where: {
        profileId: user.id,
        paymentStatus: false,
      },
    });

    const { propertyId, checkIn, checkOut } = prevState;
    
    // Validate date range
    if (checkOut <= checkIn) {
      throw new ValidationError('Check-out date must be after check-in date', 'dateRange');
    }

    // Verify property exists
    const property = await db.property.findUnique({
      where: { id: propertyId },
      select: { price: true },
    });
    const existingProperty = ensureExists(property, 'Property');

    // Check for date conflicts
    const conflictingBooking = await db.booking.findFirst({
      where: {
        propertyId,
        paymentStatus: true,
        OR: [
          {
            AND: [
              { checkIn: { lte: checkIn } },
              { checkOut: { gt: checkIn } },
            ],
          },
          {
            AND: [
              { checkIn: { lt: checkOut } },
              { checkOut: { gte: checkOut } },
            ],
          },
          {
            AND: [
              { checkIn: { gte: checkIn } },
              { checkOut: { lte: checkOut } },
            ],
          },
        ],
      },
    });

    if (conflictingBooking) {
      throw new ConflictError('These dates are already booked');
    }

    const { orderTotal, totalNights } = calculateTotals({
      checkIn,
      checkOut,
      price: existingProperty.price,
    });

    const booking = await db.booking.create({
      data: {
        checkIn,
        checkOut,
        orderTotal,
        totalNights,
        profileId: user.id,
        propertyId,
      },
    });

    redirect(`/checkout?bookingId=${booking.id}`);
  } catch (error) {
    return handleServerActionError(error);
  }
}

/**
 * Fetch all confirmed bookings for the current user
 * 
 * Only returns bookings with paymentStatus: true (confirmed bookings).
 * 
 * @returns {Promise<Booking[]>} Array of confirmed bookings with property information
 * 
 * @example
 * ```ts
 * const bookings = await fetchBookings();
 * ```
 */
export async function fetchBookings() {
  const user = await getAuthUser();
  const bookings = await db.booking.findMany({
    where: {
      profileId: user.id,
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
    orderBy: {
      checkIn: 'desc',
    },
  });
  return bookings;
}

/**
 * Delete a booking
 * 
 * Validates that the booking exists and belongs to the current user.
 * 
 * @param {Object} prevState - Previous state containing bookingId
 * @param {string} prevState.bookingId - Booking ID to delete
 * @returns {Promise<{message: string}>} Success message
 * @throws {NotFoundError} If booking doesn't exist or doesn't belong to user
 * 
 * @example
 * ```ts
 * const result = await deleteBookingAction({ bookingId: 'booking_123' });
 * ```
 */
export async function deleteBookingAction(prevState: { bookingId: string }) {
  const { bookingId } = prevState;
  const user = await getAuthUser();

  try {
    // Verify booking exists and belongs to current user
    const booking = await db.booking.findFirst({
      where: {
        id: bookingId,
        profileId: user.id,
      },
    });
    ensureExists(booking, 'Booking');

    await db.booking.delete({
      where: {
        id: bookingId,
        profileId: user.id,
      },
    });

    revalidatePath('/bookings');
    return { message: 'Booking deleted successfully' };
  } catch (error) {
    return handleServerActionError(error);
  }
}

