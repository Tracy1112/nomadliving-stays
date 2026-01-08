/**
 * Admin Actions
 * 
 * Server actions for admin-only operations and analytics
 * @module actions/admin
 */

'use server';

import { formatDate } from '../format';
import db from '../db';
import { getAdminUser, getAuthUser } from './auth';

/**
 * Fetch admin dashboard statistics
 * 
 * Returns counts of users, properties, and confirmed bookings.
 * Requires admin authentication.
 * 
 * @returns {Promise<{usersCount: number, propertiesCount: number, bookingsCount: number}>} Dashboard statistics
 * @throws {Error} If user is not admin
 * 
 * @example
 * ```ts
 * const stats = await fetchStats();
 * // { usersCount: 100, propertiesCount: 50, bookingsCount: 200 }
 * ```
 */
export async function fetchStats() {
  await getAdminUser();

  const usersCount = await db.profile.count();
  const propertiesCount = await db.property.count();
  const bookingsCount = await db.booking.count({
    where: {
      paymentStatus: true,
    },
  });

  return {
    usersCount,
    propertiesCount,
    bookingsCount,
  };
}

/**
 * Fetch chart data for admin dashboard
 * 
 * Returns booking counts per month for the last 6 months.
 * Requires admin authentication.
 * 
 * @returns {Promise<Array<{date: string, count: number}>>} Monthly booking counts
 * @throws {Error} If user is not admin
 * 
 * @example
 * ```ts
 * const chartData = await fetchChartsData();
 * // [{ date: '2024-01', count: 10 }, { date: '2024-02', count: 15 }, ...]
 * ```
 */
export async function fetchChartsData() {
  await getAdminUser();
  const date = new Date();
  date.setMonth(date.getMonth() - 6);
  const sixMonthsAgo = date;

  const bookings = await db.booking.findMany({
    where: {
      paymentStatus: true,
      createdAt: {
        gte: sixMonthsAgo,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
  
  const bookingsPerMonth = bookings.reduce((total, current) => {
    const date = formatDate(current.createdAt, true);
    const existingEntry = total.find((entry) => entry.date === date);
    if (existingEntry) {
      existingEntry.count += 1;
    } else {
      total.push({ date, count: 1 });
    }
    return total;
  }, [] as Array<{ date: string; count: number }>);
  
  return bookingsPerMonth;
}

/**
 * Fetch all reservations for properties owned by the current user
 * 
 * Returns confirmed bookings for the user's rental properties.
 * 
 * @returns {Promise<Booking[]>} Array of reservations with property information
 * 
 * @example
 * ```ts
 * const reservations = await fetchReservations();
 * ```
 */
export async function fetchReservations() {
  const user = await getAuthUser();

  const reservations = await db.booking.findMany({
    where: {
      paymentStatus: true,
      property: {
        profileId: user.id,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      property: {
        select: {
          id: true,
          name: true,
          price: true,
          country: true,
        },
      },
    },
  });
  return reservations;
}

/**
 * Fetch reservation statistics for the current user's properties
 * 
 * Returns aggregated statistics including property count, total nights booked,
 * and total revenue.
 * 
 * @returns {Promise<{properties: number, nights: number, amount: number}>} Reservation statistics
 * 
 * @example
 * ```ts
 * const stats = await fetchReservationStats();
 * // { properties: 5, nights: 100, amount: 10000 }
 * ```
 */
export async function fetchReservationStats() {
  const user = await getAuthUser();

  const properties = await db.property.count({
    where: {
      profileId: user.id,
    },
  });

  const totals = await db.booking.aggregate({
    _sum: {
      orderTotal: true,
      totalNights: true,
    },
    where: {
      property: {
        profileId: user.id,
      },
    },
  });

  return {
    properties,
    nights: totals._sum.totalNights || 0,
    amount: totals._sum.orderTotal || 0,
  };
}

