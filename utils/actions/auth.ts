/**
 * Authentication Helper Functions
 * 
 * Provides utilities for user authentication and authorization
 * @module actions/auth
 */

import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AuthenticationError } from '../errors';

/**
 * Get the currently authenticated user
 * 
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {Redirect} Redirects to /profile/create if user doesn't have a profile
 * @returns {Promise<User>} The authenticated Clerk user object
 * 
 * @example
 * ```ts
 * const user = await getAuthUser();
 * const userId = user.id;
 * ```
 */
export async function getAuthUser() {
  const user = await currentUser();
  if (!user) {
    throw new AuthenticationError();
  }
  if (!user.privateMetadata.hasProfile) {
    redirect('/profile/create');
  }
  return user;
}

/**
 * Get the admin user
 * 
 * Verifies that the current user is the admin user as defined by ADMIN_USER_ID
 * environment variable.
 * 
 * @throws {Error} If ADMIN_USER_ID is not set
 * @throws {Redirect} Redirects to home if user is not admin
 * @returns {Promise<User>} The authenticated admin user
 * 
 * @example
 * ```ts
 * const admin = await getAdminUser();
 * // User is confirmed to be admin
 * ```
 */
export async function getAdminUser() {
  const user = await getAuthUser();
  const adminUserId = process.env.ADMIN_USER_ID;
  
  if (!adminUserId) {
    throw new Error('ADMIN_USER_ID environment variable is not set');
  }
  
  if (user.id !== adminUserId) {
    redirect('/');
  }
  return user;
}

