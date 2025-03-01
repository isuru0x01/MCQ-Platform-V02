import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import crypto from "crypto";

// Type Definitions
interface LemonWebhookEvent {
  meta: {
    event_name: string;
    custom_data?: {
      userId?: string;
      user_id?: string;
      email?: string;
    };
  };
  data: {
    id?: string;
    attributes: Record<string, any>;
  };
}

const WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!;

// Webhook Handler
export async function POST(req: NextRequest) {
  try {
    const { isValid, event } = await verifyWebhook(req);
    if (!isValid) return errorResponse("Invalid signature", 401);

    const result = await handleLemonEvent(event);
    return result ?? NextResponse.json({ message: "Event handled successfully" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return errorResponse("Internal server error", 500);
  }
}

// Verify Webhook Signature
async function verifyWebhook(req: NextRequest) {
  const reqText = await req.text();
  const signature = req.headers.get("X-Signature");

  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET).update(reqText).digest("hex");

  return {
    isValid: hmac === signature,
    event: JSON.parse(reqText) as LemonWebhookEvent,
  };
}

// Handle Different Events
async function handleLemonEvent(event: LemonWebhookEvent) {
  const eventHandlers: Record<string, (event: LemonWebhookEvent) => Promise<any>> = {
    order_created: handleOrderCreated,
    subscription_created: handleSubscriptionCreated,
    subscription_cancelled: handleSubscriptionCancelled,
    subscription_paused: handleSubscriptionPaused,
    subscription_payment_success: handleSubscriptionPaymentSuccess,
  };

  const handler = eventHandlers[event.meta.event_name];
  return handler ? handler(event) : null;
}

// Order Created Handler
async function handleOrderCreated(event: LemonWebhookEvent) {
  const { attributes } = event.data;
  const customData = event.meta.custom_data || {};
  const userId = getUserIdFromCustomData(customData);

  if (!userId) return errorResponse("Missing userId in webhook data", 400);

  // Insert into Payment table
  const paymentData = transformPaymentData(attributes, userId);
  const { error: paymentError } = await supabaseClient.from("Payment").insert([paymentData]);

  if (paymentError) {
    console.error("Error inserting payment:", paymentError);
    return errorResponse("Failed to insert payment", 500);
  }

  // Upsert Subscription table
  const subscriptionUpdate = createSubscriptionUpdate(attributes, userId);
  const { error: subError } = await supabaseClient.from("Subscription").upsert([subscriptionUpdate]);

  if (subError) {
    console.error("Error updating subscription:", subError);
    return errorResponse("Failed to update subscription", 500);
  }

  return successResponse();
}

// Subscription Created Handler
async function handleSubscriptionCreated(event: LemonWebhookEvent) {
  const subData = event.data.attributes;
  const customData = event.meta.custom_data || {};
  const userId = getUserIdFromCustomData(customData);

  if (!userId) return errorResponse("Missing userId in webhook data", 400);

  // Upsert Subscription
  const subscriptionData = transformSubscriptionData(subData, userId);
  const { error: subError } = await supabaseClient.from("Subscription").upsert([subscriptionData]);

  if (subError) {
    console.error("Error inserting subscription:", subError);
    return errorResponse("Failed to insert subscription", 500);
  }

  // Initialize user_usage with 100 points
  const periodStart = new Date(subData.created_at);
  const periodEnd = subData.renews_at ? new Date(subData.renews_at) : new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { error: usageError } = await supabaseClient.from("user_usage").upsert(
    [
      {
        user_id: userId,
        plan_type: "pro",
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        submission_count: 0,
        subscription_points: 100,
      },
    ],
    { onConflict: "user_id" }
  );

  if (usageError) {
    console.error("Error initializing user usage:", usageError);
    return errorResponse("Failed to initialize user usage", 500);
  }

  return successResponse();
}

// Subscription Cancelled Handler
async function handleSubscriptionCancelled(event: LemonWebhookEvent) {
  const subData = event.data.attributes;

  // Update Subscription
  const { error } = await supabaseClient.from("Subscription").update({
    status: "cancelled",
    cancelled: true,
    ends_at: subData.ends_at,
    updated_at: subData.updated_at,
  }).eq("id", event.data.id);

  if (error) {
    console.error("Error updating subscription:", error);
    return errorResponse("Failed to update subscription", 500);
  }

  return successResponse();
}

// Subscription Paused Handler
async function handleSubscriptionPaused(event: LemonWebhookEvent) {
  const subData = event.data.attributes;

  // Update Subscription
  const { error } = await supabaseClient.from("Subscription").update({
    status: "paused",
    pause: subData.pause,
    updated_at: subData.updated_at,
  }).eq("id", event.data.id);

  if (error) {
    console.error("Error updating subscription:", error);
    return errorResponse("Failed to update subscription", 500);
  }

  return successResponse();
}

// Subscription Payment Success Handler
async function handleSubscriptionPaymentSuccess(event: LemonWebhookEvent) {
  const invoiceData = event.data.attributes;
  const customData = event.meta.custom_data || {};
  const userId = getUserIdFromCustomData(customData);

  if (!userId) return errorResponse("Missing userId in webhook data", 400);

  // Insert into Payment table
  const paymentData = transformPaymentData(invoiceData, userId);
  const { error: paymentError } = await supabaseClient.from("Payment").insert([paymentData]);

  if (paymentError) {
    console.error("Error inserting payment:", paymentError);
    return errorResponse("Failed to insert payment", 500);
  }

  return successResponse();
}

// Data Transformation Functions
function getUserIdFromCustomData(customData: any): string | null {
  return customData?.userId || customData?.user_id || null;
}

function transformPaymentData(orderData: any, userId: string) {
  return {
    userId,
    created_at: orderData.created_at,
    updated_at: orderData.updated_at,
    amount: orderData.total,
    currency: orderData.currency,
    status: orderData.status,
    store_id: orderData.store_id,
    customer_id: orderData.customer_id,
    order_number: orderData.order_number,
  };
}

function transformSubscriptionData(subData: any, userId: string) {
  return {
    id: subData.id,
    userId,
    status: subData.status,
    product_name: subData.product_name,
    currency: subData.currency || "USD",
    interval: subData.interval || "monthly",
    renews_at: subData.renews_at,
    created_at: subData.created_at,
    updated_at: subData.updated_at,
  };
}

function createSubscriptionUpdate(orderData: any, userId: string) {
  return {
    userId,
    status: "active",
    product_name: orderData.first_order_item?.product_name || "Subscription",
    created_at: orderData.created_at,
    updated_at: orderData.updated_at,
  };
}

// Success and Error Responses
function successResponse() {
  return NextResponse.json({ success: true });
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
