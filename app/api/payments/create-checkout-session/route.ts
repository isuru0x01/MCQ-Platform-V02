// pages/api/payments/create-checkout-session.ts

import { NextRequest, NextResponse } from "next/server";
import { createCheckout, type NewCheckout, lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';

export async function POST(req: NextRequest) {
  // Initialize LemonSqueezy with API key
  lemonSqueezySetup({
    apiKey: process.env.LEMON_SQUEEZY_API_KEY!,
  });

  try {
    // Log environment variables (redacted for security)
    console.log('API Key exists:', !!process.env.LEMON_SQUEEZY_API_KEY);
    console.log('Store ID exists:', !!process.env.LEMON_SQUEEZY_STORE_ID);
    
    const { userId, name, email, priceId } = await req.json();

    // Validate required fields
    if (!userId || !email || !priceId) {
      console.error('Missing required parameters:', { userId, email, priceId });
      return NextResponse.json(
        { error: 'Missing required parameters.' },
        { status: 400 }
      );
    }

    // Log checkout attempt
    console.log('Creating checkout for:', { userId, email, priceId });

    const newCheckout: NewCheckout = {
      productOptions: {
        name: 'MCQ Lab Pro',
        description: 'Upgrade to Pro plan',
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
      },
      checkoutOptions: {
        embed: false,
        media: true,
        logo: true,
        dark: true, // Enable dark mode support
      },
      checkoutData: {
        email,
        custom: {
          userId,
          email, // Include email in custom data for webhook
        },
        name,
      },
      testMode: process.env.NODE_ENV === 'development',
    };

    // Log checkout configuration
    console.log('Checkout configuration:', {
      storeId: process.env.LEMON_SQUEEZY_STORE_ID,
      priceId,
      options: newCheckout
    });

    const response = await createCheckout(
      process.env.LEMON_SQUEEZY_STORE_ID!,
      priceId,
      newCheckout
    );

    // Log successful response
    console.log('Checkout created successfully:', response.data?.data.attributes.url);

    const checkoutUrl = response.data?.data.attributes.url;

    if (!checkoutUrl) {
      throw new Error('Checkout URL not found in response');
    }

    return NextResponse.json({ checkoutUrl });

  } catch (error: any) {
    // Enhanced error logging
    console.error('Checkout creation failed:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });

    // Return more detailed error message
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error.response?.data?.message || error.message
      },
      { status: error.response?.status || 500 }
    );
  }
}
