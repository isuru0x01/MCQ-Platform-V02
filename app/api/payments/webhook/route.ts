import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import crypto from 'crypto';

// Type Definitions
interface LemonWebhookEvent {
  meta: {
    event_name: string;
    custom_data?: { userId?: string };
  };
  data: {
    id?: string;
    attributes: Record<string, any>;
  };
}

interface PaymentData {
  test_mode: boolean;
  currency_rate: string;
  subtotal: number;
  discount_total: number;
  tax: number;
  total: number;
  subtotal_usd: number;
  discount_total_usd: number;
  tax_usd: number;
  total_usd: number;
  refunded: boolean;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
  amount: number;
  paymentDate: string;
  userId: string;
  store_id: number;
  customer_id: number;
  order_number: number;
  stripeId: null;
  email: string;
  tax_rate: string;
  currency: string;
  status: string;
  status_formatted: string;
  tax_formatted: string;
  total_formatted: string;
  identifier: string;
  subtotal_formatted: string;
  user_name: string;
  user_email: string;
  discount_total_formatted: string;
  tax_name: string;
}

interface SubscriptionData {
  id?: string;
  userId?: string;
  status: string;
  planId?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string | null;
  canceledAt?: string | null;
  subscriptionId?: string;
  order_item_id?: number;
  product_id?: number;
  variant_id?: number;
  pause?: any;
  cancelled?: boolean;
  billing_anchor?: number;
  renews_at?: string;
  ends_at?: string;
  created_at?: string;
  updated_at?: string;
  test_mode?: boolean;
  price?: number;
  store_id?: number;
  customer_id?: number;
  order_id?: number;
  name?: string;
  description?: string;
  variant_name?: string;
  currency?: string;
  interval?: string;
  card_brand?: string;
  card_last_four?: string;
  product_name?: string;
  user_name?: string;
  user_email?: string;
  status_formatted?: string;
}

const WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { isValid, event } = await verifyWebhook(req);
    if (!isValid) return errorResponse('Invalid signature', 401);

    const result = await handleLemonEvent(event);
    return result ? result : NextResponse.json({ message: 'Unhandled event type' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// Webhook Verification
async function verifyWebhook(req: NextRequest) {
  const reqText = await req.text();
  const signature = req.headers.get('X-Signature');

  const hmac = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(reqText)
    .digest('hex');

  return {
    isValid: hmac === signature,
    event: JSON.parse(reqText) as LemonWebhookEvent,
  };
}

// Event Handling
async function handleLemonEvent(event: LemonWebhookEvent) {
  const eventHandlers = {
    'order_created': handleOrderCreated,
    'subscription_created': handleSubscriptionCreated,
    'subscription_cancelled': handleSubscriptionCancelled,
    'subscription_paused': handleSubscriptionPaused,
    'subscription_payment_success': handleSubscriptionPaymentSuccess,
  };

  const handler = eventHandlers[event.meta.event_name];
  return handler ? handler(event) : null;
}

// Event Handlers
async function handleOrderCreated(event: LemonWebhookEvent) {
  const { attributes } = event.data;
  const customData = attributes.first_order_item.custom_data || {};

  const paymentData = transformPaymentData(attributes, customData);
  const { error: paymentError } = await supabaseClient
    .from('Payment')
    .insert([paymentData]);

  if (paymentError) {
    console.error('Error inserting payment:', paymentError);
    return errorResponse('Failed to insert payment', 500);
  }

  const subscriptionUpdate = createSubscriptionUpdate(attributes, customData);
  const { error: userError } = await supabaseClient
    .from('Subscription')
    .upsert(subscriptionUpdate);

  if (userError) {
    console.error('Error updating subscription:', userError);
    return errorResponse('Failed to update subscription', 500);
  }

  return successResponse();
}

async function handleSubscriptionCreated(event: LemonWebhookEvent) {
  const subData = event.data.attributes;
  const subscriptionData = transformSubscriptionData(subData);

  const { error: subscriptionError } = await supabaseClient
    .from('Subscription')
    .upsert([subscriptionData], { onConflict: 'id' });

  if (subscriptionError) {
    console.error('Error inserting subscription:', subscriptionError);
    return errorResponse('Failed to insert subscription', 500);
  }

  const userSubUpdate = createUserSubscriptionUpdate(subData);
  const { error: userSubError } = await supabaseClient
    .from('Subscription')
    .upsert(userSubUpdate);

  if (userSubError) {
    console.error('Error updating user subscription:', userSubError);
    return errorResponse('Failed to update user subscription', 500);
  }

  return successResponse();
}

async function handleSubscriptionCancelled(event: LemonWebhookEvent) {
  const subData = event.data.attributes;

  // Update the subscription record in Supabase
  const { error: subscriptionError } = await supabaseClient
    .from('Subscription')
    .update({
      status: subData.status,
      status_formatted: subData.status_formatted,
      cancelled: subData.cancelled,
      ends_at: subData.ends_at,
      updated_at: subData.updated_at,
      renews_at: subData.renews_at,
    })
    .eq('id', event.data.id);

  if (subscriptionError) {
    console.error('Error updating subscription:', subscriptionError);
    return errorResponse('Failed to update subscription', 500);
  }

  // Update the UserSubscription table
  const { error: userSubError } = await supabaseClient
    .from('Subscription')
    .update({
      status: 'cancelled',
      canceledAt: subData.updated_at,
      currentPeriodEnd: subData.ends_at,
    })
    .eq('subscriptionId', event.data.id);

  if (userSubError) {
    console.error('Error updating user subscription:', userSubError);
    return errorResponse('Failed to update user subscription', 500);
  }

  return successResponse();
}

async function handleSubscriptionPaused(event: LemonWebhookEvent) {
  const subData = event.data.attributes;

  // Update the subscription record in Supabase
  const { error: subscriptionError } = await supabaseClient
    .from('Subscription')
    .update({
      status: subData.status,
      status_formatted: subData.status_formatted,
      pause: subData.pause,
      updated_at: subData.updated_at,
      renews_at: subData.renews_at,
      ends_at: subData.ends_at,
    })
    .eq('id', event.data.id);

  if (subscriptionError) {
    console.error('Error updating subscription:', subscriptionError);
    return errorResponse('Failed to update subscription', 500);
  }

  // Update the UserSubscription table
  const { error: userSubError } = await supabaseClient
    .from('Subscription')
    .update({
      status: 'paused',
      pausedAt: subData.updated_at,
      resumesAt: subData.pause?.resumes_at || null,
    })
    .eq('subscriptionId', event.data.id);

  if (userSubError) {
    console.error('Error updating user subscription:', userSubError);
    return errorResponse('Failed to update user subscription', 500);
  }

  return successResponse();
}

async function handleSubscriptionPaymentSuccess(event: LemonWebhookEvent) {
  const invoiceData = event.data.attributes;
  const customData = event.meta.custom_data || {};

  // Prepare payment data for Supabase
  const paymentData = {
    test_mode: invoiceData.test_mode,
    currency_rate: invoiceData.currency_rate,
    subtotal: invoiceData.subtotal,
    discount_total: invoiceData.discount_total,
    tax: invoiceData.tax,
    total: invoiceData.total,
    subtotal_usd: invoiceData.subtotal_usd,
    discount_total_usd: invoiceData.discount_total_usd,
    tax_usd: invoiceData.tax_usd,
    total_usd: invoiceData.total_usd,
    refunded: invoiceData.refunded,
    refunded_at: invoiceData.refunded_at,
    created_at: invoiceData.created_at,
    updated_at: invoiceData.updated_at,
    amount: invoiceData.total,
    paymentDate: invoiceData.created_at,
    userId: customData.userId || invoiceData.user_email, // Fallback to email if userId is not provided
    store_id: invoiceData.store_id,
    customer_id: invoiceData.customer_id,
    order_number: null,
    stripeId: null,
    email: invoiceData.user_email,
    tax_rate: "0",
    currency: invoiceData.currency,
    status: invoiceData.status,
    status_formatted: invoiceData.status_formatted,
    tax_formatted: invoiceData.tax_formatted,
    total_formatted: invoiceData.total_formatted,
    identifier: event.data.id,
    subtotal_formatted: invoiceData.subtotal_formatted,
    user_name: invoiceData.user_name,
    user_email: invoiceData.user_email,
    discount_total_formatted: invoiceData.discount_total_formatted,
    tax_name: null,
  };

  // Insert payment record into Supabase
  const { error: paymentError } = await supabaseClient
    .from('Payment')
    .insert([paymentData]);

  if (paymentError) {
    console.error('Error inserting payment:', paymentError);
    return errorResponse('Failed to insert payment', 500);
  }

  // Update subscription renewal date if applicable
  if (invoiceData.subscription_id) {
    const { error: subscriptionError } = await supabaseClient
      .from('Subscription')
      .update({
        renews_at: invoiceData.created_at, // Update renewal date to the payment date
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceData.subscription_id);

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError);
      return errorResponse('Failed to update subscription', 500);
    }
  }

  return successResponse();
}

// Data Transformers
function transformPaymentData(orderData: any, customData: any): PaymentData {
  return {
    test_mode: orderData.test_mode,
    currency_rate: orderData.currency_rate,
    subtotal: orderData.subtotal,
    discount_total: orderData.discount_total,
    tax: orderData.tax,
    total: orderData.total,
    subtotal_usd: orderData.subtotal_usd,
    discount_total_usd: orderData.discount_total_usd,
    tax_usd: orderData.tax_usd,
    total_usd: orderData.total_usd,
    refunded: orderData.refunded,
    refunded_at: orderData.refunded_at,
    created_at: orderData.created_at,
    updated_at: orderData.updated_at,
    amount: orderData.total,
    paymentDate: orderData.created_at,
    userId: customData.userId,
    store_id: orderData.store_id,
    customer_id: orderData.customer_id,
    order_number: orderData.order_number,
    stripeId: null,
    email: orderData.user_email,
    tax_rate: orderData.tax_rate,
    currency: orderData.currency,
    status: orderData.status,
    status_formatted: orderData.status_formatted,
    tax_formatted: orderData.tax_formatted,
    total_formatted: orderData.total_formatted,
    identifier: orderData.identifier,
    subtotal_formatted: orderData.subtotal_formatted,
    user_name: orderData.user_name,
    user_email: orderData.user_email,
    discount_total_formatted: orderData.discount_total_formatted,
    tax_name: orderData.tax_name,
  };
}

function transformSubscriptionData(subData: any): SubscriptionData {
  const firstItem = subData.first_subscription_item;
  return {
    id: subData.id,
    order_item_id: subData.order_item_id,
    product_id: subData.product_id,
    variant_id: subData.variant_id,
    pause: subData.pause,
    cancelled: subData.cancelled,
    trialEndsAt: subData.trial_ends_at,
    billing_anchor: subData.billing_anchor,
    renews_at: subData.renews_at,
    ends_at: subData.ends_at,
    created_at: subData.created_at,
    updated_at: subData.updated_at,
    test_mode: subData.test_mode,
    price: firstItem?.quantity,
    store_id: subData.store_id,
    customer_id: subData.customer_id,
    order_id: subData.order_id,
    name: subData.product_name,
    description: '',
    variant_name: subData.variant_name,
    currency: 'USD',
    interval: 'monthly',
    user_name: subData.user_name,
    user_email: subData.user_email,
    status: subData.status,
    status_formatted: subData.status_formatted,
    card_brand: subData.card_brand,
    card_last_four: subData.card_last_four,
    product_name: subData.product_name,
  };
}

// Helper Functions
function createSubscriptionUpdate(orderData: any, customData: any): SubscriptionData {
  return {
    userId: customData.userId,
    status: 'active',
    planId: orderData.first_order_item.variant_id,
    currentPeriodEnd: calculatePeriodEnd(orderData),
  };
}

function createUserSubscriptionUpdate(subData: any): SubscriptionData {
  return {
    userId: subData.user_email,
    status: subData.status,
    planId: subData.variant_id,
    subscriptionId: subData.id,
    currentPeriodEnd: subData.renews_at,
    trialEndsAt: subData.trial_ends_at,
    canceledAt: subData.cancelled ? subData.updated_at : null,
  };
}

function calculatePeriodEnd(orderData: any): string {
  return new Date(
    Date.now() + (orderData.test_mode ? 1 : 30) * 24 * 60 * 60 * 1000
  ).toISOString();
}

function successResponse() {
  return NextResponse.json({ success: true });
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Test