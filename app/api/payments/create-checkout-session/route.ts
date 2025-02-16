// pages/api/payments/create-checkout-session.ts

import { NextRequest, NextResponse } from "next/server";
import { createCheckout, type NewCheckout, lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';

// Initialize LemonSqueezy with API key at the top level
lemonSqueezySetup({
  apiKey: process.env.LEMON_SQUEEZY_API_KEY!
});

export async function POST(req: NextRequest) {
  try {
    const { userId, email, priceId } = await req.json();

    if (!userId || !email || !priceId) {
      return NextResponse.json(
        { error: 'Missing required parameters.' },
        { status: 400 }
      );
    }

    const newCheckout: NewCheckout = {
      productOptions: {
        name: 'MCQ Lab Pro',
        description: 'Upgrade to Pro plan',
        redirectUrl: `${process.env.FRONTEND_URL}/success`,
      },
      checkoutOptions: {
        embed: false,
        media: true,
        logo: true,
      },
      checkoutData: {
        email,
        custom: { userId },
      },
      testMode: process.env.NODE_ENV === 'development',
    };

    const response = await createCheckout(
      process.env.LEMON_SQUEEZY_STORE_ID!,
      priceId,
      newCheckout
    );

    if (response.error) throw response.error;
    console.log('LemonSqueezy API Key:', process.env.LEMON_SQUEEZY_API_KEY!);
    // Debug: log the entire response to inspect its structure.
    console.log('Full response:', response);

    // Try accessing the URL from a possible "links" property.
    const checkoutUrl = response.data?.data.attributes.url

    if (!checkoutUrl) {
      throw new Error('Checkout URL not found in response.');
    }
    
    return NextResponse.json({ 
      checkoutUrl 
    });
  } catch (error: any) {
    // Log detailed error information.
    console.error('Error creating checkout:', error.response?.data || error.message);
    return NextResponse.json(
      { error: error.response?.data?.message || error.message },
      { status: 500 }
    );
  }
}
