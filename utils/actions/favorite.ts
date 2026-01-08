/**
 * Favorite Actions
 * 
 * Server actions for managing user favorites/bookmarks
 * @module actions/favorite
 */

'use server';

import { revalidatePath } from 'next/cache';
import db from '../db';
import { handleServerActionError, ensureExists } from '../errors';
import { getAuthUser } from './auth';

/**
 * Get the favorite ID for a property if the user has favorited it
 * 
 * @param {Object} options - Query options
 * @param {string} options.propertyId - Property ID to check
 * @returns {Promise<string | null>} Favorite ID if exists, null otherwise
 * 
 * @example
 * ```ts
 * const favoriteId = await fetchFavoriteId({ propertyId: 'prop_123' });
 * ```
 */
export async function fetchFavoriteId({
  propertyId,
}: {
  propertyId: string;
}): Promise<string | null> {
  const user = await getAuthUser();
  const favorite = await db.favorite.findFirst({
    where: {
      propertyId,
      profileId: user.id,
    },
    select: {
      id: true,
    },
  });
  return favorite?.id || null;
}

/**
 * Toggle favorite status for a property
 * 
 * Adds the property to favorites if not favorited, removes it if already favorited.
 * 
 * @param {Object} prevState - Previous state containing propertyId, favoriteId, and pathname
 * @param {string} prevState.propertyId - Property ID to toggle
 * @param {string | null} prevState.favoriteId - Current favorite ID (if exists)
 * @param {string} prevState.pathname - Current pathname for cache invalidation
 * @returns {Promise<{message: string}>} Success message
 * @throws {NotFoundError} If property doesn't exist
 * 
 * @example
 * ```ts
 * const result = await toggleFavoriteAction({
 *   propertyId: 'prop_123',
 *   favoriteId: null,
 *   pathname: '/properties/prop_123'
 * });
 * ```
 */
export async function toggleFavoriteAction(prevState: {
  propertyId: string;
  favoriteId: string | null;
  pathname: string;
}): Promise<{ message: string }> {
  const user = await getAuthUser();
  const { propertyId, favoriteId, pathname } = prevState;
  
  try {
    // Verify property exists
    const property = await db.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    });
    ensureExists(property, 'Property');

    if (favoriteId) {
      // Remove from favorites
      await db.favorite.delete({
        where: {
          id: favoriteId,
        },
      });
    } else {
      // Add to favorites (check if already exists to prevent duplicates)
      const existing = await db.favorite.findFirst({
        where: {
          propertyId,
          profileId: user.id,
        },
      });
      if (!existing) {
        await db.favorite.create({
          data: {
            propertyId,
            profileId: user.id,
          },
        });
      }
    }
    revalidatePath(pathname);
    return { message: favoriteId ? 'Removed from Faves' : 'Added to Faves' };
  } catch (error) {
    return handleServerActionError(error);
  }
}

/**
 * Fetch all favorited properties for the current user
 * 
 * @returns {Promise<Property[]>} Array of favorited properties
 * 
 * @example
 * ```ts
 * const favorites = await fetchFavorites();
 * ```
 */
export async function fetchFavorites() {
  const user = await getAuthUser();
  const favorites = await db.favorite.findMany({
    where: {
      profileId: user.id,
    },
    select: {
      property: {
        select: {
          id: true,
          name: true,
          tagline: true,
          country: true,
          price: true,
          image: true,
        },
      },
    },
  });
  return favorites.map((favorite) => favorite.property);
}

