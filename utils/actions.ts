'use server';

import {
  imageSchema,
  profileSchema,
  propertySchema,
  validateWithZodSchema,
  createReviewSchema,
} from './schemas';
import db from './db';
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { redirect } from 'next/navigation';
import { uploadImage } from './supabase';
import { calculateTotals } from './calculateTotals';
import { formatDate } from './format';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  handleServerActionError,
  ensureExists,
} from './errors';

// 获取认证用户（使用新的错误类）
const getAuthUser = async () => {
  const user = await currentUser();
  if (!user) {
    throw new AuthenticationError();
  }
  if (!user.privateMetadata.hasProfile) {
    redirect('/profile/create');
  }
  return user;
};

// 获取管理员用户
const getAdminUser = async () => {
  const user = await getAuthUser();
  const adminUserId = process.env.ADMIN_USER_ID;
  
  if (!adminUserId) {
    throw new Error('ADMIN_USER_ID environment variable is not set');
  }
  
  if (user.id !== adminUserId) {
    redirect('/');
  }
  return user;
};

export const createProfileAction = async (
  prevState: any,
  formData: FormData
) => {
  try {
    const user = await currentUser();
    if (!user) {
      throw new AuthenticationError('Please login to create a profile');
    }

    const rawData = Object.fromEntries(formData);
    const validatedFields = validateWithZodSchema(profileSchema, rawData);

    // 检查用户名是否已存在
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
};

export const fetchProfileImage = async () => {
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

  return profile?.profileImage;
};

export const fetchProfile = async () => {
  const user = await getAuthUser();
  const profile = await db.profile.findUnique({
    where: {
      clerkId: user.id,
    },
  });
  if (!profile) redirect('/profile/create');
  return profile;
};

export const updateProfileAction = async (
  prevState: any,
  formData: FormData
): Promise<{ message: string }> => {
  const user = await getAuthUser();

  try {
    const rawData = Object.fromEntries(formData);
    const validatedFields = validateWithZodSchema(profileSchema, rawData);

    // 检查用户名冲突（排除当前用户）
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
};

export const updateProfileImageAction = async (
  prevState: any,
  formData: FormData
): Promise<{ message: string }> => {
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
};

export const createPropertyAction = async (
  prevState: any,
  formData: FormData
): Promise<{ message: string }> => {
  const user = await getAuthUser();
  try {
    const rawData = Object.fromEntries(formData);
    const file = formData.get('image') as File;
    
    if (!file) {
      throw new ValidationError('Property image is required', 'image');
    }

    const validatedFields = validateWithZodSchema(propertySchema, rawData);
    const validatedFile = validateWithZodSchema(imageSchema, { image: file });
    
    let fullPath: string;
    try {
      fullPath = await uploadImage(validatedFile.image);
    } catch (error) {
      throw new ExternalServiceError('Supabase', 'Failed to upload property image', { error });
    }

    try {
      await db.property.create({
        data: {
          ...validatedFields,
          image: fullPath,
          profileId: user.id,
        },
      });
      // 清除房源列表缓存
      revalidateTag('properties');
    } catch (error) {
      throw new DatabaseError('Failed to create property', { error, validatedFields });
    }
  } catch (error) {
    return handleServerActionError(error);
  }
  redirect('/');
};

export const fetchProperties = async ({
  search = '',
  category,
}: {
  search?: string;
  category?: string;
}) => {
  // 使用缓存优化频繁查询（缓存5分钟）
  const getCachedProperties = unstable_cache(
    async (searchParam: string, categoryParam?: string) => {
      return db.property.findMany({
        where: {
          ...(categoryParam && { category: categoryParam }),
          ...(searchParam && {
            OR: [
              { name: { contains: searchParam, mode: 'insensitive' } },
              { tagline: { contains: searchParam, mode: 'insensitive' } },
            ],
          }),
        },
        select: {
          id: true,
          name: true,
          tagline: true,
          country: true,
          price: true,
          image: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        // 限制结果数量，避免返回过多数据
        take: 100,
      });
    },
    ['properties'],
    {
      revalidate: 300, // 5分钟缓存
      tags: ['properties'],
    }
  );

  return getCachedProperties(search, category);
};

export const fetchFavoriteId = async ({
  propertyId,
}: {
  propertyId: string;
}) => {
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
};

export const toggleFavoriteAction = async (prevState: {
  propertyId: string;
  favoriteId: string | null;
  pathname: string;
}) => {
  const user = await getAuthUser();
  const { propertyId, favoriteId, pathname } = prevState;
  
  try {
    // 验证房源存在
    const property = await db.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    });
    ensureExists(property, 'Property');

    if (favoriteId) {
      await db.favorite.delete({
        where: {
          id: favoriteId,
        },
      });
    } else {
      // 检查是否已收藏
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
};

export const fetchFavorites = async () => {
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
};

export const fetchPropertyDetails = (id: string) => {
  // 使用缓存优化房源详情查询（缓存10分钟）
  const getCachedPropertyDetails = unstable_cache(
    async (propertyId: string) => {
      return db.property.findUnique({
        where: {
          id: propertyId,
        },
        include: {
          profile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              clerkId: true,
            },
          },
          bookings: {
            select: {
              checkIn: true,
              checkOut: true,
            },
            where: {
              paymentStatus: true, // 只获取已支付的预订
            },
          },
        },
      });
    },
    ['property-details'],
    {
      revalidate: 600, // 10分钟缓存
      tags: ['property-details', `property-${id}`],
    }
  );

  return getCachedPropertyDetails(id);
};

export async function createReviewAction(prevState: any, formData: FormData) {
  const user = await getAuthUser();
  try {
    const rawData = Object.fromEntries(formData);
    const validatedFields = validateWithZodSchema(createReviewSchema, rawData);

    // 验证房源存在
    const property = await db.property.findUnique({
      where: { id: validatedFields.propertyId },
      select: { id: true },
    });
    ensureExists(property, 'Property');

    // 检查是否已评价
    const existingReview = await db.review.findFirst({
      where: {
        propertyId: validatedFields.propertyId,
        profileId: user.id,
      },
    });
    if (existingReview) {
      throw new ConflictError('You have already reviewed this property');
    }

    await db.review.create({
      data: {
        ...validatedFields,
        profileId: user.id,
      },
    });
    // 清除相关缓存
    revalidatePath(`/properties/${validatedFields.propertyId}`);
    revalidateTag('property-reviews');
    revalidateTag('property-rating');
    revalidateTag(`property-${validatedFields.propertyId}`);
    return { message: 'Review submitted successfully' };
  } catch (error) {
    return handleServerActionError(error);
  }
}

export async function fetchPropertyReviews(propertyId: string) {
  // 使用缓存优化评价查询（缓存10分钟）
  const getCachedReviews = unstable_cache(
    async (id: string) => {
      return db.review.findMany({
        where: {
          propertyId: id,
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          profile: {
            select: {
              firstName: true,
              profileImage: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        // 限制返回数量，避免加载过多评价
        take: 50,
      });
    },
    ['property-reviews'],
    {
      revalidate: 600, // 10分钟缓存
      tags: ['property-reviews', `property-${propertyId}`],
    }
  );

  return getCachedReviews(propertyId);
}

export const fetchPropertyReviewsByUser = async () => {
  const user = await getAuthUser();
  const reviews = await db.review.findMany({
    where: {
      profileId: user.id,
    },
    select: {
      id: true,
      rating: true,
      comment: true,
      property: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });
  return reviews;
};

export const deleteReviewAction = async (prevState: { reviewId: string }) => {
  const { reviewId } = prevState;
  const user = await getAuthUser();

  try {
    // 验证评价存在且属于当前用户
    const review = await db.review.findFirst({
      where: {
        id: reviewId,
        profileId: user.id,
      },
    });
    ensureExists(review, 'Review');

    await db.review.delete({
      where: {
        id: reviewId,
        profileId: user.id,
      },
    });

    revalidatePath('/reviews');
    return { message: 'Review deleted successfully' };
  } catch (error) {
    return handleServerActionError(error);
  }
};

export const findExistingReview = async (
  userId: string,
  propertyId: string
) => {
  return db.review.findFirst({
    where: {
      profileId: userId,
      propertyId: propertyId,
    },
  });
};

export async function fetchPropertyRating(propertyId: string) {
  // 使用缓存优化评分查询（缓存15分钟）
  const getCachedRating = unstable_cache(
    async (id: string) => {
      const result = await db.review.groupBy({
        by: ['propertyId'],
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
        where: {
          propertyId: id,
        },
      });

      // empty array if no reviews
      return {
        rating: result[0]?._avg.rating?.toFixed(1) ?? 0,
        count: result[0]?._count.rating ?? 0,
      };
    },
    ['property-rating'],
    {
      revalidate: 900, // 15分钟缓存
      tags: ['property-rating', `property-${propertyId}`],
    }
  );

  return getCachedRating(propertyId);
}

export const createBookingAction = async (prevState: {
  propertyId: string;
  checkIn: Date;
  checkOut: Date;
}) => {
  const user = await getAuthUser();
  
  try {
    // 清理未支付的旧预订
    await db.booking.deleteMany({
      where: {
        profileId: user.id,
        paymentStatus: false,
      },
    });

    const { propertyId, checkIn, checkOut } = prevState;
    
    // 验证日期范围
    if (checkOut <= checkIn) {
      throw new ValidationError('Check-out date must be after check-in date', 'dateRange');
    }

    // 验证房源存在
    const property = await db.property.findUnique({
      where: { id: propertyId },
      select: { price: true },
    });
    const existingProperty = ensureExists(property, 'Property');

    // 检查日期冲突
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
};

export const fetchBookings = async () => {
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
};

export async function deleteBookingAction(prevState: { bookingId: string }) {
  const { bookingId } = prevState;
  const user = await getAuthUser();

  try {
    // 先检查预订是否存在且属于当前用户
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

export const fetchRentals = async () => {
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

  // 优化：批量查询所有预订数据，避免N+1问题
  if (rentals.length === 0) {
    return rentals.map((rental) => ({
      ...rental,
      totalNightsSum: 0,
      orderTotalSum: 0,
    }));
  }

  const propertyIds = rentals.map((rental) => rental.id);

  // 一次性获取所有预订的聚合数据
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

  // 创建映射以便快速查找
  const aggregateMap = new Map(
    bookingsAggregate.map((item) => [
      item.propertyId,
      {
        totalNights: item._sum.totalNights ?? 0,
        orderTotal: item._sum.orderTotal ?? 0,
      },
    ])
  );

  // 合并数据
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
};

export async function deleteRentalAction(prevState: { propertyId: string }) {
  const { propertyId } = prevState;
  const user = await getAuthUser();

  try {
    // 验证房源存在且属于当前用户
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

export const fetchRentalDetails = async (propertyId: string) => {
  const user = await getAuthUser();

  return db.property.findUnique({
    where: {
      id: propertyId,
      profileId: user.id,
    },
  });
};

export const updatePropertyAction = async (
  prevState: any,
  formData: FormData
): Promise<{ message: string }> => {
  const user = await getAuthUser();
  const propertyId = formData.get('id') as string;

  try {
    if (!propertyId) {
      throw new ValidationError('Property ID is required', 'id');
    }

    // 验证房源存在且属于当前用户
    const property = await db.property.findFirst({
      where: {
        id: propertyId,
        profileId: user.id,
      },
    });
    ensureExists(property, 'Property');

    const rawData = Object.fromEntries(formData);
    const validatedFields = validateWithZodSchema(propertySchema, rawData);
    
    await db.property.update({
      where: {
        id: propertyId,
        profileId: user.id,
      },
      data: {
        ...validatedFields,
      },
    });

    revalidatePath(`/rentals/${propertyId}/edit`);
    return { message: 'Update Successful' };
  } catch (error) {
    return handleServerActionError(error);
  }
};

export const updatePropertyImageAction = async (
  prevState: any,
  formData: FormData
): Promise<{ message: string }> => {
  const user = await getAuthUser();
  const propertyId = formData.get('id') as string;

  try {
    if (!propertyId) {
      throw new ValidationError('Property ID is required', 'id');
    }

    // 验证房源存在且属于当前用户
    const property = await db.property.findFirst({
      where: {
        id: propertyId,
        profileId: user.id,
      },
    });
    ensureExists(property, 'Property');

    const image = formData.get('image') as File;
    if (!image) {
      throw new ValidationError('Image is required', 'image');
    }

    const validatedFields = validateWithZodSchema(imageSchema, { image });
    
    let fullPath: string;
    try {
      fullPath = await uploadImage(validatedFields.image);
    } catch (error) {
      throw new ExternalServiceError('Supabase', 'Failed to upload property image', { error });
    }

    await db.property.update({
      where: {
        id: propertyId,
        profileId: user.id,
      },
      data: {
        image: fullPath,
      },
    });
    revalidatePath(`/rentals/${propertyId}/edit`);
    return { message: 'Property Image Updated Successful' };
  } catch (error) {
    return handleServerActionError(error);
  }
};

export const fetchReservations = async () => {
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
};

export const fetchStats = async () => {
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
};

export const fetchChartsData = async () => {
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
};

export const fetchReservationStats = async () => {
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
};
