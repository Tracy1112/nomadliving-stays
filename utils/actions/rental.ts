/**
 * Rental Actions
 * 
 * Server actions for managing user's rental properties
 * @module actions/rental
 */

'use server';

import { revalidatePath } from 'next/cache';
import db from '../db';
import { handleServerActionError, ensureExists } from '../errors';
import { getAuthUser } from './auth';

/**
 * Fetch all rental properties owned by the current user
 * 
 * Includes aggregated booking statistics (total nights and revenue).
 * Uses batch queries to avoid N+1 problem.
 * 
 * @returns {Promise<Rental[]>} Array of rental properties with booking statistics
 * 
 * @example
 * ```ts
 * const rentals = await fetchRentals();
 * // [{ id, name, price, totalNightsSum, orderTotalSum }, ...]
 * ```
 */
export async function fetchRentals() {
  const user = await getAuthUser();
  const rentals = await db.property.findMany({
    where: {
      profileId: user.id,
    },
    select: {
      id: true,
      name: true,
      price: true,
    },
  });

  // Optimization: Batch query all booking data to avoid N+1 problem
  if (rentals.length === 0) {
    return rentals.map((rental) => ({
      ...rental,
      totalNightsSum: 0,
      orderTotalSum: 0,
    }));
  }

  const propertyIds = rentals.map((rental) => rental.id);

  // Get all booking aggregates in one query
  const bookingsAggregate = await db.booking.groupBy({
    by: ['propertyId'],
    where: {
      propertyId: { in: propertyIds },
      paymentStatus: true,
    },
    _sum: {
      totalNights: true,
      orderTotal: true,
    },
  });

  // Create map for quick lookup
  const aggregateMap = new Map(
    bookingsAggregate.map((item) => [
      item.propertyId,
      {
        totalNights: item._sum.totalNights ?? 0,
        orderTotal: item._sum.orderTotal ?? 0,
      },
    ])
  );

  // Merge data
  return rentals.map((rental) => {
    const aggregate = aggregateMap.get(rental.id) || {
      totalNights: 0,
      orderTotal: 0,
    };
    return {
      ...rental,
      totalNightsSum: aggregate.totalNights,
      orderTotalSum: aggregate.orderTotal,
    };
  });
}

/**
 * Delete a rental property
 * 
 * Validates that the property exists and belongs to the current user.
 * 
 * @param {Object} prevState - Previous state containing propertyId
 * @param {string} prevState.propertyId - Property ID to delete
 * @returns {Promise<{message: string}>} Success message
 * @throws {NotFoundError} If property doesn't exist or doesn't belong to user
 * 
 * @example
 * ```ts
 * const result = await deleteRentalAction({ propertyId: 'prop_123' });
 * ```
 */
export async function deleteRentalAction(prevState: { propertyId: string }) {
  const { propertyId } = prevState;
  const user = await getAuthUser();

  try {
    // Verify property exists and belongs to current user
    const property = await db.property.findFirst({
      where: {
        id: propertyId,
        profileId: user.id,
      },
    });
    ensureExists(property, 'Property');

    await db.property.delete({
      where: {
        id: propertyId,
        profileId: user.id,
      },
    });

    revalidatePath('/rentals');
    return { message: 'Rental deleted successfully' };
  } catch (error) {
    return handleServerActionError(error);
  }
}

/**
 * Fetch detailed information for a rental property
 * 
 * @param {string} propertyId - Property ID
 * @returns {Promise<Property | null>} Property details or null if not found
 * @throws {NotFoundError} If property doesn't exist or doesn't belong to user
 * 
 * @example
 * ```ts
 * const rental = await fetchRentalDetails('prop_123');
 * ```
 */
export async function fetchRentalDetails(propertyId: string) {
  const user = await getAuthUser();

  return db.property.findUnique({
    where: {
      id: propertyId,
      profileId: user.id,
    },
  });
}

