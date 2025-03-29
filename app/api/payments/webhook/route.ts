import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import crypto from 'crypto';

// Type Definitions
interface LemonWebhookEvent {
  meta: {
    event_name: string;
    custom_data?: { userId?: string; user_id?: string };
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
  trial_ends_at?: string | null; // Changed from trialEndsAt to match database column name
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
    return result || errorResponse('Unhandled event type', 400);
  } catch (error) {
    console.error('Webhook processing error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// Webhook Verification - Improved error handling
async function verifyWebhook(req: NextRequest) {
  const reqText = await req.text();
  const signature = req.headers.get('X-Signature');

  if (!signature) {
    console.error("Missing signature in headers");
    return { isValid: false, event: JSON.parse(reqText) as LemonWebhookEvent };
  }

  let expectedSignature: Buffer;
  let receivedSignature: Buffer;

  try {
    expectedSignature = Buffer.from(
      crypto.createHmac('sha256', WEBHOOK_SECRET).update(reqText).digest('hex'),
      'hex'
    );
    
    // Separate try-catch for signature parsing
    try {
      receivedSignature = Buffer.from(signature, 'hex');
    } catch (error) {
      console.error("Invalid signature format:", error);
      return { isValid: false, event: JSON.parse(reqText) as LemonWebhookEvent };
    }
    
  } catch (error) {
    console.error("Error processing signature:", error);
    return { isValid: false, event: JSON.parse(reqText) as LemonWebhookEvent };
  }

  if (expectedSignature.length !== receivedSignature.length) {
    console.error("Signature length mismatch");
    return { isValid: false, event: JSON.parse(reqText) as LemonWebhookEvent };
  }

  return {
    isValid: crypto.timingSafeEqual(expectedSignature, receivedSignature),
    event: JSON.parse(reqText) as LemonWebhookEvent,
  };
}

// Event Handlers - Use upsert for better idempotency
async function handleOrderCreated(event: LemonWebhookEvent) {
  const { attributes } = event.data;
  const customData = attributes.first_order_item?.custom_data || {};
  
  // Transform payment data
  const paymentData = transformPaymentData(attributes, customData);
  
  // Check if a payment with the same timestamp and user already exists
  const { data: existingPayments } = await supabaseClient
    .from('Payment')
    .select('id')
    .eq('created_at', attributes.created_at)
    .eq('userId', paymentData.userId);

  if (existingPayments && existingPayments.length > 0) {
    console.log('Payment already exists for this user and timestamp:', paymentData.userId, attributes.created_at);
    return successResponse();
  }
  
  // Insert the payment
  const { error: paymentError } = await supabaseClient
    .from('Payment')
    .insert([paymentData]);

  if (paymentError) {
    console.error('Error inserting payment:', paymentError);
    return errorResponse('Failed to insert payment', 500);
  }

  console.log('Payment processed:', paymentData.identifier);
  return successResponse();
}

// Update transformPaymentData to ensure identifier is always unique
function transformPaymentData(orderData: any, customData: any): PaymentData {
  // Extract userId and ensure it's properly formatted
  const userId = customData.userId || customData.user_id || orderData.user_email;
  
  if (!userId) {
    console.warn('Missing userId in payment data, using fallback');
  }

  // Create a more unique identifier that includes timestamp
  const uniqueIdentifier = orderData.identifier || 
    `order_${orderData.order_number || ''}_${orderData.created_at || Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

  return {
    test_mode: orderData.test_mode,
    currency_rate: orderData.currency_rate,
    subtotal: orderData.subtotal,
    discount_total: orderData.discount_total || 0,
    tax: orderData.tax,
    total: orderData.total,
    subtotal_usd: orderData.subtotal_usd,
    discount_total_usd: orderData.discount_total_usd || 0,
    tax_usd: orderData.tax_usd,
    total_usd: orderData.total_usd,
    refunded: orderData.refunded,
    refunded_at: orderData.refunded_at,
    created_at: orderData.created_at,
    updated_at: orderData.updated_at,
    amount: orderData.total,
    paymentDate: orderData.created_at,
    userId: userId,
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
    identifier: uniqueIdentifier,
    subtotal_formatted: orderData.subtotal_formatted,
    user_name: orderData.user_name,
    user_email: orderData.user_email,
    discount_total_formatted: orderData.discount_total_formatted || "$0.00",
    tax_name: orderData.tax_name || null,
  };
}

// Update handleSubscriptionCancelled to validate id before upsert and remove non-existent fields
async function handleSubscriptionCancelled(event: LemonWebhookEvent) {
  const subData = event.data.attributes;
  const customData = event.meta.custom_data || {};
  const userId = customData.user_id || customData.userId || subData.user_email || "unknown";
  
  // Ensure we have a valid ID
  if (!event.data.id) {
    console.error('Missing subscription ID in event data');
    return errorResponse('Invalid subscription data', 400);
  }
  
  // Update the subscription record in Supabase with all necessary fields
  const subscriptionUpdate = {
    id: event.data.id,
    status: subData.status,
    status_formatted: subData.status_formatted,
    cancelled: subData.cancelled,
    ends_at: subData.ends_at,
    updated_at: subData.updated_at,
    renews_at: subData.renews_at,
    // Remove currentPeriodEnd as it doesn't exist in the table
    // Add canceledAt as a custom field if needed in your application logic
    userId: userId
  };

  // Use upsert instead of update for idempotency
  const { error: subscriptionError } = await supabaseClient
    .from('Subscription')
    .upsert([subscriptionUpdate], { onConflict: 'id' });

  if (subscriptionError) {
    console.error('Error updating subscription:', subscriptionError);
    return errorResponse('Failed to update subscription', 500);
  }

  return successResponse();
}

// Update handleSubscriptionPaused to validate id before upsert
async function handleSubscriptionPaused(event: LemonWebhookEvent) {
  const subData = event.data.attributes;
  const customData = event.meta.custom_data || {};
  const userId = customData.user_id || customData.userId || subData.user_email;

  // Ensure we have a valid ID
  if (!event.data.id) {
    console.error('Missing subscription ID in event data');
    return errorResponse('Invalid subscription data', 400);
  }
  
  // Update the subscription record in Supabase with all necessary fields
  const subscriptionUpdate = {
    id: event.data.id,
    status: subData.status,
    status_formatted: subData.status_formatted,
    pause: subData.pause,
    updated_at: subData.updated_at,
    renews_at: subData.renews_at,
    ends_at: subData.ends_at,
    pausedAt: subData.updated_at,
    resumesAt: subData.pause?.resumes_at || null,
    userId: userId
  };

  // Use upsert instead of update for idempotency
  const { error: subscriptionError } = await supabaseClient
    .from('Subscription')
    .upsert([subscriptionUpdate], { onConflict: 'id' });

  if (subscriptionError) {
    console.error('Error updating subscription:', subscriptionError);
    return errorResponse('Failed to update subscription', 500);
  }

  return successResponse();
}

// Optimize handleSubscriptionPaymentSuccess to reduce database queries
// In handleSubscriptionPaymentSuccess function
async function handleSubscriptionPaymentSuccess(event: LemonWebhookEvent) {
  const invoiceData = event.data.attributes;
  const customData = event.meta.custom_data || {};
  const userId = customData.user_id || customData.userId || invoiceData.user_email;

  if (!userId) {
    console.error('Missing userId in payment data');
    return errorResponse('Invalid payment data: missing userId', 400);
  }

  // Check if a payment with the same timestamp and user already exists
  const { data: existingPayments } = await supabaseClient
    .from('Payment')
    .select('id')
    .eq('created_at', invoiceData.created_at)
    .eq('userId', userId);

  if (existingPayments && existingPayments.length > 0) {
    console.log('Payment already exists for this user and timestamp:', userId, invoiceData.created_at);
    // Skip payment insertion but continue with subscription update
  } else {
    // Prepare payment data for Supabase with more unique identifier
    const paymentData = {
      test_mode: invoiceData.test_mode,
      currency_rate: invoiceData.currency_rate,
      subtotal: invoiceData.subtotal,
      discount_total: invoiceData.discount_total || 0,
      tax: invoiceData.tax,
      total: invoiceData.total,
      subtotal_usd: invoiceData.subtotal_usd,
      discount_total_usd: invoiceData.discount_total_usd || 0,
      tax_usd: invoiceData.tax_usd,
      total_usd: invoiceData.total_usd,
      refunded: invoiceData.refunded,
      refunded_at: invoiceData.refunded_at,
      created_at: invoiceData.created_at,
      updated_at: invoiceData.updated_at,
      amount: invoiceData.total,
      paymentDate: invoiceData.created_at,
      userId: userId,
      store_id: invoiceData.store_id,
      customer_id: invoiceData.customer_id,
      order_number: invoiceData.order_number || null,
      stripeId: null,
      email: invoiceData.user_email,
      tax_rate: "0",
      currency: invoiceData.currency,
      status: invoiceData.status,
      status_formatted: invoiceData.status_formatted,
      tax_formatted: invoiceData.tax_formatted,
      total_formatted: invoiceData.total_formatted,
      // More unique identifier that includes timestamp to prevent collisions
      identifier: `${event.data.id}_${invoiceData.created_at}`,
      subtotal_formatted: invoiceData.subtotal_formatted,
      user_name: invoiceData.user_name,
      user_email: invoiceData.user_email,
      discount_total_formatted: invoiceData.discount_total_formatted || "$0.00",
      tax_name: invoiceData.tax_name || null,
    };

    // Insert the payment
    const { error: insertError } = await supabaseClient
      .from('Payment')
      .insert([paymentData]);

    if (insertError) {
      console.error('Error inserting payment:', insertError);
      return errorResponse('Failed to insert payment', 500);
    }
  }

  // Continue with subscription update if applicable
  if (invoiceData.subscription_id) {
    // Get minimal subscription data needed for updates
    const { data: subscriptionData, error: fetchError } = await supabaseClient
      .from('Subscription')
      .select('interval, product_name')
      .eq('id', invoiceData.subscription_id)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching subscription:', fetchError);
      return errorResponse('Failed to fetch subscription', 500);
    }

    // Default interval if not found
    const interval = subscriptionData?.interval || 'monthly';
    
    // Update subscription with new renewal date
    const subscriptionUpdate = {
      id: invoiceData.subscription_id,
      renews_at: calculateNextRenewalDate(invoiceData.created_at, interval),
      updated_at: new Date().toISOString(),
      status: 'active',
      status_formatted: 'Active',
      card_brand: invoiceData.card_brand,
      card_last_four: invoiceData.card_last_four,
      userId: userId
    };

    // Use upsert instead of update for idempotency
    const { error: subscriptionError } = await supabaseClient
      .from('Subscription')
      .upsert([subscriptionUpdate], { onConflict: 'id' });

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError);
      return errorResponse('Failed to update subscription', 500);
    }

    // Update or create user_usage record
    const periodStart = new Date().toISOString();
    const periodEnd = calculateNextRenewalDate(periodStart, interval);
    
    const usageData = {
      user_id: userId,
      plan_type: subscriptionData?.product_name || 'pro',
      period_start: periodStart,
      period_end: periodEnd,
      submission_count: 0, // Reset for new billing period
      subscription_points: calculateSubscriptionPoints(subscriptionData?.product_name || 'pro')
    };
    
    // First check if a record already exists
    const { data: existingUsage } = await supabaseClient
      .from('user_usage')
      .select('id')
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .maybeSingle();
    
    let usageError;
    
    if (existingUsage) {
      // Update existing record
      const { error } = await supabaseClient
        .from('user_usage')
        .update(usageData)
        .eq('id', existingUsage.id);
      usageError = error;
    } else {
      // Insert new record
      const { error } = await supabaseClient
        .from('user_usage')
        .insert([usageData]);
      usageError = error;
    }
    
    if (usageError) {
      console.error('Error creating user usage record:', usageError);
      return errorResponse('Failed to create user usage record', 500);
    }
    
    return successResponse();
  }

  return successResponse();
}

// Update the transform function to properly handle userId and remove non-existent fields
function transformSubscriptionData(subData: any): SubscriptionData {
  const firstItem = subData.first_subscription_item;
  const customData = subData.custom_data || {};

  // Ensure we have an ID
  if (!subData.id) {
    throw new Error('Missing subscription ID in data');
  }

  // Determine interval from variant name if available
  let interval = 'monthly';
  if (subData.variant_name) {
    if (subData.variant_name.toLowerCase().includes('yearly')) {
      interval = 'yearly';
    } else if (subData.variant_name.toLowerCase().includes('quarterly')) {
      interval = 'quarterly';
    }
  }

  return {
    id: subData.id, // This should now be guaranteed to exist
    userId: customData.user_id || customData.userId || subData.user_email,
    order_item_id: subData.order_item_id,
    product_id: subData.product_id,
    variant_id: subData.variant_id,
    pause: subData.pause,
    cancelled: subData.cancelled,
    trial_ends_at: subData.trial_ends_at, // Changed from trialEndsAt to match database column name
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
    interval: interval,
    user_name: subData.user_name,
    user_email: subData.user_email,
    status: subData.status || 'active',
    status_formatted: subData.status_formatted || 'Active',
    card_brand: subData.card_brand,
    card_last_four: subData.card_last_four,
    product_name: subData.product_name,
    // Remove currentPeriodEnd, subscriptionId, and planId as they don't exist in the table
  };
}

// Move the handleLemonEvent function after all handler functions are defined
async function handleLemonEvent(event: LemonWebhookEvent) {
  console.log('Processing event:', event.meta.event_name, event.data.id);
  
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

// Add the missing handleSubscriptionCreated function
async function handleSubscriptionCreated(event: LemonWebhookEvent) {
  const subData = event.data.attributes;
  const customData = event.meta.custom_data || {};
  const userId = customData.userId || customData.user_id || subData.user_email;
  
  // Validate required data
  if (!event.data.id) {
    console.error('Missing subscription ID in event data');
    return errorResponse('Invalid subscription data: missing ID', 400);
  }
  
  if (!userId) {
    console.error('Missing userId in subscription data');
    return errorResponse('Invalid subscription data: missing userId', 400);
  }
  
  // Use upsert instead of select/insert for better idempotency
  const subscriptionData = transformSubscriptionData({
    ...subData,
    id: event.data.id  // Ensure ID is passed from event.data.id
  });
  subscriptionData.userId = userId;
  
  console.log('Subscription data to be inserted:', subscriptionData); // Add logging
  
  // Upsert subscription data
  const { error: subscriptionError } = await supabaseClient
    .from('Subscription')
    .upsert([subscriptionData], { onConflict: 'id' });

  if (subscriptionError) {
    console.error('Error upserting subscription:', subscriptionError);
    return errorResponse('Failed to upsert subscription', 500);
  }
  
  // Create user_usage record for the new subscription
  const periodStart = new Date().toISOString();
  const periodEnd = calculateNextRenewalDate(periodStart, subscriptionData.interval || 'monthly');
  
  const usageData = {
    user_id: userId,
    plan_type: subscriptionData.product_name || 'pro',
    period_start: periodStart,
    period_end: periodEnd,
    submission_count: 0, // Initialize for new subscription
    subscription_points: calculateSubscriptionPoints(subscriptionData.product_name || 'pro')
  };

  // Upsert to user_usage table with composite key constraint
  const { error: usageError } = await supabaseClient
    .from('user_usage')
    .upsert([usageData], { onConflict: 'user_id, period_start' });

  if (usageError) {
    console.error('Error creating user usage record:', usageError);
    return errorResponse('Failed to create user usage record', 500);
  }
  
  return successResponse();
}

// Helper Functions
function calculatePeriodEnd(orderData: any): string {
  const interval = orderData.first_order_item?.variant_name?.toLowerCase().includes('yearly') ? 'yearly' : 'monthly';
  return calculateNextRenewalDate(new Date().toISOString(), interval);
}

function calculateNextRenewalDate(startDate: string, interval: string): string {
  const date = new Date(startDate);
  
  switch (interval.toLowerCase()) {
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'monthly':
    default:
      date.setMonth(date.getMonth() + 1);
      break;
  }
  
  return date.toISOString();
}

function calculateSubscriptionPoints(planType: string): number {
  switch (planType.toLowerCase()) {
    case 'pro':
      return 30;
    case 'premium':
      return 100;
    default:
      return 10;
  }
}

// Utility functions
function successResponse() {
  return NextResponse.json({ success: true });
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}