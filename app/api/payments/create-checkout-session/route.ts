// pages/api/payments/create-checkout-session.ts

import { NextRequest, NextResponse } from "next/server";
import { createCheckout, type NewCheckout, lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

interface CheckoutResponse {
  data: {
    attributes: {
      url: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

// Initialize LemonSqueezy with API key
if (!process.env.LEMON_SQUEEZY_API_KEY || !process.env.LEMON_SQUEEZY_STORE_ID) {
  throw new Error("Missing required environment variables: LEMON_SQUEEZY_API_KEY or LEMON_SQUEEZY_STORE_ID");
}

lemonSqueezySetup({
  apiKey: process.env.LEMON_SQUEEZY_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { userId, name, email, priceId } = await req.json();

    // Validate required fields
    if (!userId || !email || !priceId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const newCheckout: NewCheckout = {
      productOptions: {
        name: "MCQ Lab Pro",
        description: "Upgrade to Pro plan",
        redirectUrl: process.env.NEXT_PUBLIC_APP_URL 
          ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`
          : 'http://mcqlab.click/dashboard/settings',
      },
      checkoutOptions: {
        embed: false,
        media: true,
        logo: true,
        dark: true,
      },
      checkoutData: {
        email,
        custom: {
          user_id: userId,
          email,
        },
        name,
      },
      testMode: process.env.NODE_ENV === "development",
    };

    const response = await createCheckout(
      process.env.LEMON_SQUEEZY_STORE_ID!,
      priceId,
      newCheckout
    );

    console.log('Checkout response:', JSON.stringify(response, null, 2));

    // Handle validation errors
    if (response.statusCode === 422) {
      const error = (response as any).data?.errors?.[0];
      throw new Error(error?.detail || "Validation error in checkout creation");
    }

    // For successful creation (201), get the URL from the correct path
    const checkoutUrl = (response as any).data?.data?.attributes?.url;
    if (!checkoutUrl) {
      console.error('Invalid checkout response structure:', response);
      throw new Error("Failed to get checkout URL from response");
    }

    return NextResponse.json({ checkoutUrl });

  } catch (error: any) {
    console.error("Checkout creation failed:", error);

    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        details: error.message,
        debug: process.env.NODE_ENV === "development" ? error : undefined
      },
      { status: 500 }
    );
  }
}
