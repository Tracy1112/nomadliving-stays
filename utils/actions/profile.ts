/**
 * Profile Actions
 * 
 * Server actions for user profile management
 * @module actions/profile
 */

'use server';

import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { profileSchema, imageSchema, validateWithZodSchema } from '../schemas';
import db from '../db';
import { uploadImage } from '../supabase';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
  ConflictError,
  ExternalServiceError,
  handleServerActionError,
} from '../errors';
import { getAuthUser } from './auth';

/**
 * Create a new user profile
 * 
 * Creates a profile for the authenticated user with validated form data.
 * Also updates Clerk metadata to mark the user as having a profile.
 * 
 * @param {any} prevState - Previous form state (unused)
 * @param {FormData} formData - Form data containing firstName, lastName, username
 * @returns {Promise<void>} Redirects to home page on success
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {ConflictError} If username already exists
 * 
 * @example
 * ```ts
 * await createProfileAction({}, formData);
 * ```
 */
export async function createProfileAction(
  prevState: any,
  formData: FormData
) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new AuthenticationError('Please login to create a profile');
    }

    const rawData = Object.fromEntries(formData);
    const validatedFields = validateWithZodSchema(profileSchema, rawData);

    // Check if username already exists
    const existingProfile = await db.profile.findFirst({
      where: { username: validatedFields.username },
    });
    if (existingProfile) {
      throw new ConflictError('Username already exists');
    }

    await db.profile.create({
      data: {
        clerkId: user.id,
        email: user.emailAddresses[0].emailAddress,
        profileImage: user.imageUrl ?? '',
        ...validatedFields,
      },
    });
    
    await clerkClient.users.updateUserMetadata(user.id, {
      privateMetadata: {
        hasProfile: true,
      },
    });
  } catch (error) {
    return handleServerActionError(error);
  }
  redirect('/');
}

/**
 * Fetch the current user's profile image URL
 * 
 * @returns {Promise<string | null>} Profile image URL or null if not found
 * 
 * @example
 * ```ts
 * const imageUrl = await fetchProfileImage();
 * ```
 */
export async function fetchProfileImage(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;

  const profile = await db.profile.findUnique({
    where: {
      clerkId: user.id,
    },
    select: {
      profileImage: true,
    },
  });

  return profile?.profileImage ?? null;
}

/**
 * Fetch the current user's complete profile
 * 
 * @throws {Redirect} Redirects to /profile/create if profile doesn't exist
 * @returns {Promise<Profile>} The user's profile
 * 
 * @example
 * ```ts
 * const profile = await fetchProfile();
 * ```
 */
export async function fetchProfile() {
  const user = await getAuthUser();
  const profile = await db.profile.findUnique({
    where: {
      clerkId: user.id,
    },
  });
  if (!profile) redirect('/profile/create');
  return profile;
}

/**
 * Update user profile information
 * 
 * @param {any} prevState - Previous form state (unused)
 * @param {FormData} formData - Form data containing profile fields to update
 * @returns {Promise<{message: string}>} Success message
 * @throws {ConflictError} If username is already taken by another user
 * @throws {NotFoundError} If profile doesn't exist
 * 
 * @example
 * ```ts
 * const result = await updateProfileAction({}, formData);
 * ```
 */
export async function updateProfileAction(
  prevState: any,
  formData: FormData
): Promise<{ message: string }> {
  const user = await getAuthUser();

  try {
    const rawData = Object.fromEntries(formData);
    const validatedFields = validateWithZodSchema(profileSchema, rawData);

    // Check for username conflicts (excluding current user)
    if (validatedFields.username) {
      const existingProfile = await db.profile.findFirst({
        where: {
          username: validatedFields.username,
          clerkId: { not: user.id },
        },
      });
      if (existingProfile) {
        throw new ConflictError('Username already exists');
      }
    }

    const profile = await db.profile.update({
      where: {
        clerkId: user.id,
      },
      data: validatedFields,
    });

    if (!profile) {
      throw new NotFoundError('Profile');
    }

    revalidatePath('/profile');
    return { message: 'Profile updated successfully' };
  } catch (error) {
    return handleServerActionError(error);
  }
}

/**
 * Update user profile image
 * 
 * Uploads a new profile image to Supabase and updates the profile record.
 * 
 * @param {any} prevState - Previous form state (unused)
 * @param {FormData} formData - Form data containing the image file
 * @returns {Promise<{message: string}>} Success message
 * @throws {ValidationError} If image is missing or invalid
 * @throws {ExternalServiceError} If image upload fails
 * @throws {NotFoundError} If profile doesn't exist
 * 
 * @example
 * ```ts
 * const result = await updateProfileImageAction({}, formData);
 * ```
 */
export async function updateProfileImageAction(
  prevState: any,
  formData: FormData
): Promise<{ message: string }> {
  const user = await getAuthUser();
  try {
    const image = formData.get('image') as File;
    if (!image) {
      throw new ValidationError('Image is required', 'image');
    }
    
    const validatedFields = validateWithZodSchema(imageSchema, { image });
    let fullPath: string;
    
    try {
      fullPath = await uploadImage(validatedFields.image);
    } catch (error) {
      throw new ExternalServiceError('Supabase', 'Failed to upload image', { error });
    }

    const profile = await db.profile.update({
      where: {
        clerkId: user.id,
      },
      data: {
        profileImage: fullPath,
      },
    });

    if (!profile) {
      throw new NotFoundError('Profile');
    }

    revalidatePath('/profile');
    return { message: 'Profile image updated successfully' };
  } catch (error) {
    return handleServerActionError(error);
  }
}

