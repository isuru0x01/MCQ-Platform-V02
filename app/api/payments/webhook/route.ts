import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import crypto from 'crypto';

// Type Definitions
interface LemonWebhookEvent {
  meta: {
    event_name: string;
<<<<<<< HEAD
    custom_data?: { userId?: string; user_id?: string };
=======
    custom_data?: { 
      userId?: string;
      user_id?: string;
      email?: string;
    };
>>>>>>> da4de243e062858fd03d24454bb02e21d2c91b6f
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
<<<<<<< HEAD
    return result || errorResponse('Unhandled event type', 400);
=======
    return result ? result : NextResponse.json({ message: 'Event handled successfully' });
>>>>>>> da4de243e062858fd03d24454bb02e21d2c91b6f
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
<<<<<<< HEAD
  const customData = attributes.first_order_item?.custom_data || {};
=======
  const customData = event.meta.custom_data || {};
>>>>>>> da4de243e062858fd03d24454bb02e21d2c91b6f

  // Transform payment data
  const paymentData = transformPaymentData(attributes, customData);
  
  // Use upsert instead of select/insert for better idempotency
  const { error: paymentError } = await supabaseClient
    .from('Payment')
    .upsert([paymentData], { onConflict: 'identifier' });

  if (paymentError) {
    console.error('Error upserting payment:', paymentError);
    return errorResponse('Failed to upsert payment', 500);
  }

  console.log('Payment processed:', paymentData.identifier);
  return successResponse();
}

<<<<<<< HEAD
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

=======
// Helper function to get userId from custom data
function getUserIdFromCustomData(customData: any): string | null {
  return customData?.userId || customData?.user_id || null;
}

async function handleSubscriptionCreated(event: LemonWebhookEvent) {
  const subData = event.data.attributes;
  const customData = event.meta.custom_data || {};
  const userId = getUserIdFromCustomData(customData);

  if (!userId) {
    console.error('Missing userId in custom data:', event.meta);
    return errorResponse('Missing userId in webhook data', 400);
  }
  
  // Insert into Subscription table
  const subscriptionData = {
    createdAt: subData.created_at,
    name: subData.product_name || '',
    description: subData.product_name || '',
    price: subData.price || 0,
    currency: subData.currency || 'USD',
    interval: 'monthly',
    store_id: subData.store_id,
    customer_id: subData.customer_id,
    order_id: subData.order_id,
    order_item_id: subData.order_item_id,
    product_id: subData.product_id,
    variant_id: subData.variant_id,
    product_name: subData.product_name,
    variant_name: subData.variant_name,
    user_name: subData.user_name || subData.user_email,
    user_email: subData.user_email,
    status: subData.status,
    status_formatted: subData.status_formatted,
    card_brand: subData.card_brand,
    card_last_four: subData.card_last_four,
    pause: subData.pause,
    cancelled: subData.cancelled || false,
    trial_ends_at: subData.trial_ends_at,
    billing_anchor: subData.billing_anchor,
    renews_at: subData.renews_at,
    ends_at: subData.ends_at,
    created_at: subData.created_at,
    updated_at: subData.updated_at,
    test_mode: subData.test_mode
  };

  const { error: subscriptionError } = await supabaseClient
    .from('Subscription')
    .upsert([subscriptionData], {
      onConflict: 'user_email,order_id'
    });

  if (subscriptionError) {
    console.error('Error inserting subscription:', subscriptionError);
    return errorResponse('Failed to insert subscription', 500);
  }

  // Initialize user_usage for new subscription with 100 points
  const periodStart = new Date(subData.created_at);
  const periodEnd = subData.renews_at ? new Date(subData.renews_at) : new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { error: usageError } = await supabaseClient
    .from('user_usage')
    .upsert([{
      user_id: userId,
      plan_type: 'pro',
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      submission_count: 0,
      subscription_points: 100 // Initialize with 100 points for Pro plan
    }], {
      onConflict: 'user_id'
    });

  if (usageError) {
    console.error('Error initializing user usage:', usageError);
    return errorResponse('Failed to initialize user usage', 500);
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
  const userId = getUserIdFromCustomData(customData);

  if (!userId) {
    console.error('Missing userId in custom data:', event.meta);
    return errorResponse('Missing userId in webhook data', 400);
  }

  // Insert into Payment table
  const paymentData = {
    createdAt: invoiceData.created_at,
    stripeId: null,
    email: invoiceData.user_email,
    amount: invoiceData.total,
    currency: invoiceData.currency,
    paymentDate: invoiceData.created_at,
    userId: userId,
    store_id: invoiceData.store_id,
    customer_id: invoiceData.customer_id,
    identifier: event.data.id,
    order_number: invoiceData.order_number,
    user_name: invoiceData.user_name,
    user_email: invoiceData.user_email,
    currency_rate: invoiceData.currency_rate,
    subtotal: invoiceData.subtotal,
    discount_total: invoiceData.discount_total,
    tax: invoiceData.tax,
    total: invoiceData.total,
    subtotal_usd: invoiceData.subtotal_usd,
    discount_total_usd: invoiceData.discount_total_usd,
    tax_usd: invoiceData.tax_usd,
    total_usd: invoiceData.total_usd,
    tax_name: invoiceData.tax_name || '',
    tax_rate: invoiceData.tax_rate || "0",
    status: invoiceData.status,
    status_formatted: invoiceData.status_formatted,
    refunded: invoiceData.refunded,
    refunded_at: invoiceData.refunded_at,
    subtotal_formatted: invoiceData.subtotal_formatted,
    discount_total_formatted: invoiceData.discount_total_formatted,
    tax_formatted: invoiceData.tax_formatted,
    total_formatted: invoiceData.total_formatted,
    created_at: invoiceData.created_at,
    updated_at: invoiceData.updated_at,
    test_mode: invoiceData.test_mode
  };

  const { error: paymentError } = await supabaseClient
    .from('Payment')
    .insert([paymentData]);

  if (paymentError) {
    console.error('Error inserting payment:', paymentError);
    return errorResponse('Failed to insert payment', 500);
  }

  // Get the subscription details to set correct period dates
  const { data: subscriptionData } = await supabaseClient
    .from('Subscription')
    .select('renews_at')
    .eq('user_email', invoiceData.user_email)
    .single();

  // Update user_usage table with new period and reset points to 100
  const periodStart = new Date();
  const periodEnd = subscriptionData?.renews_at 
    ? new Date(subscriptionData.renews_at)
    : new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { error: usageError } = await supabaseClient
    .from('user_usage')
    .upsert([{
      user_id: userId,
      plan_type: 'pro',
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      submission_count: 0,
      subscription_points: 100 // Reset to 100 points for new billing period
    }], {
      onConflict: 'user_id'
    });

  if (usageError) {
    console.error('Error updating user usage:', usageError);
    return errorResponse('Failed to update user usage', 500);
  }

  return successResponse();
}

// Data Transformers
function transformPaymentData(orderData: any, customData: any): PaymentData {
  const userId = getUserIdFromCustomData(customData);
  if (!userId) {
    throw new Error('Missing userId in custom data');
  }

>>>>>>> da4de243e062858fd03d24454bb02e21d2c91b6f
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

// Update handleSubscriptionCancelled to validate id before upsert
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
    canceledAt: subData.updated_at,
    currentPeriodEnd: subData.ends_at,
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
async function handleSubscriptionPaymentSuccess(event: LemonWebhookEvent) {
  const invoiceData = event.data.attributes;
  const customData = event.meta.custom_data || {};
  const userId = customData.user_id || customData.userId || invoiceData.user_email;

  if (!userId) {
    console.error('Missing userId in payment data');
    return errorResponse('Invalid payment data: missing userId', 400);
  }

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

  // Insert payment record into Supabase with idempotency check
  const { error: paymentError } = await supabaseClient
    .from('Payment')
    .upsert([paymentData], { onConflict: 'identifier' });

  if (paymentError) {
    console.error('Error inserting payment:', paymentError);
    return errorResponse('Failed to insert payment', 500);
  }

  // Update subscription if applicable
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

  return successResponse();
}

// Update the transform function to properly handle userId
function transformSubscriptionData(subData: any): SubscriptionData {
  const firstItem = subData.first_subscription_item;
  const customData = subData.custom_data || {};

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
    id: subData.id,
    userId: customData.user_id || customData.userId || subData.user_email,
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
    interval: interval,
    user_name: subData.user_name,
    user_email: subData.user_email,
    status: subData.status,
    status_formatted: subData.status_formatted,
    card_brand: subData.card_brand,
    card_last_four: subData.card_last_four,
    product_name: subData.product_name,
    currentPeriodEnd: subData.renews_at,
    subscriptionId: subData.id,
    planId: subData.variant_id,
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
  const subscriptionData = transformSubscriptionData(subData);
  subscriptionData.userId = userId; // Add userId to the main subscription record
  
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
<<<<<<< HEAD
=======
function createSubscriptionUpdate(orderData: any, customData: any): SubscriptionData {
  const userId = getUserIdFromCustomData(customData);
  if (!userId) {
    throw new Error('Missing userId in custom data');
  }

  return {
    userId: userId,
    status: 'active',
    variant_id: orderData.first_order_item.variant_id,
    renews_at: calculatePeriodEnd(orderData),
    created_at: orderData.created_at,
    updated_at: orderData.updated_at,
    user_email: customData.email,
    test_mode: orderData.test_mode
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

>>>>>>> da4de243e062858fd03d24454bb02e21d2c91b6f
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