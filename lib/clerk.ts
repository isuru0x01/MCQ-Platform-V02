"use server"
import { createClerkClient } from '@clerk/nextjs/server';

export const getClerkClient = async () => {
    return createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
};