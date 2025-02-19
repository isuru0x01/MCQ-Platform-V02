'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'

export async function getUserById(userId: string) {
  try {
    const client = await clerkClient()

    const user = await client.users.getUser(userId);
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Anonymous User';
  } catch (error) {
    console.error('Error fetching user:', error);
    return 'Anonymous User';
  }
} 