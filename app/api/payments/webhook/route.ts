import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseClient } from "@/lib/supabaseClient";
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  const supabase: any = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  const reqText = await req.text();

  // Verify webhook signature
  const signature = req.headers.get('X-Signature');
  
  const hmac = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(reqText)
    .digest('hex');
  
  if (hmac !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(reqText);
  
  if (event.meta.event_name === 'order_created') {
    const orderData = event.data.attributes;
    const customData = event.data.attributes.first_order_item.custom_data || {};

    // Prepare payment data for Supabase
    const paymentData = {
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
      userId: customData.userId, // From custom data passed during checkout
      store_id: orderData.store_id,
      customer_id: orderData.customer_id,
      order_number: orderData.order_number,
      stripeId: null, // Not applicable for Lemon Squeezy
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
      tax_name: orderData.tax_name
    };

    // Insert payment record into Supabase
    const { error: paymentError } = await supabaseClient
      .from('Payment')
      .insert([paymentData]);

    if (paymentError) {
      console.error('Error inserting payment:', paymentError);
      return NextResponse.json({ error: 'Failed to insert payment' }, { status: 500 });
    }

    // Update user's subscription status
    const { error: userError } = await supabaseClient
      .from('Subscription')
      .upsert({
        userId: customData.userId,
        status: 'active',
        planId: event.data.attributes.first_order_item.variant_id,
        currentPeriodEnd: new Date(
          Date.now() + (orderData.test_mode ? 1 : 30) * 24 * 60 * 60 * 1000
        ).toISOString(),
      });

    if (userError) {
      console.error('Error updating user subscription:', userError);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (event.meta.event_name === 'subscription_created') {
    const subData = event.data.attributes;
    const firstItem = subData.first_subscription_item;

    // Prepare subscription data for Supabase
    const subscriptionData = {
      id: event.data.id,
      order_item_id: subData.order_item_id,
      product_id: subData.product_id,
      variant_id: subData.variant_id,
      pause: subData.pause,
      cancelled: subData.cancelled,
      trial_ends_at: subData.trial_ends_at,
      billing_anchor: subData.billing_anchor,
      renews_at: subData.renews_at,
      ends_at: subData.ends_at,
      created_at: subData.created_at,
      updated_at: subData.updated_at,
      test_mode: subData.test_mode,
      price: firstItem.quantity, // You might want to get actual price from variant
      store_id: subData.store_id,
      customer_id: subData.customer_id,
      order_id: subData.order_id,
      name: subData.product_name,
      description: "", // Add if available from product details
      variant_name: subData.variant_name,
      currency: "USD", // Add if available from order/variant details
      interval: "monthly", // Add if available from variant details
      user_name: subData.user_name,
      user_email: subData.user_email,
      status: subData.status,
      status_formatted: subData.status_formatted,
      card_brand: subData.card_brand,
      card_last_four: subData.card_last_four,
      product_name: subData.product_name
    };

    // Insert subscription record into Supabase
    const { error: subscriptionError } = await supabaseClient
      .from('Subscription')
      .upsert([subscriptionData], {
        onConflict: 'id'
      });

    if (subscriptionError) {
      console.error('Error inserting subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to insert subscription' },
        { status: 500 }
      );
    }

    // Also update UserSubscription table for quick access
    const { error: userSubError } = await supabaseClient
      .from('Subscription')
      .upsert({
        userId: subData.user_email, // Using email as userId since we don't have direct userId
        status: subData.status,
        planId: subData.variant_id,
        subscriptionId: event.data.id,
        currentPeriodEnd: subData.renews_at,
        trialEndsAt: subData.trial_ends_at,
        canceledAt: subData.cancelled ? subData.updated_at : null,
      });

    if (userSubError) {
      console.error('Error updating user subscription:', userSubError);
      return NextResponse.json(
        { error: 'Failed to update user subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }

  if (event.meta.event_name === 'subscription_cancelled') {
    const subData = event.data.attributes;

    // Update subscription record in Supabase
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
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    // Update UserSubscription table
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
      return NextResponse.json(
        { error: 'Failed to update user subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }

  if (event.meta.event_name === 'subscription_paused') {
    const subData = event.data.attributes;

    // Update subscription record in Supabase
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
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    // Update Subscription table
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
      return NextResponse.json(
        { error: 'Failed to update user subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ message: 'Unhandled event type' });
}

async function getCustomerEmail(customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return (customer as Stripe.Customer).email;
  } catch (error) {
    console.error("Error fetching customer:", error);
    return null;
  }
}

async function handleSubscriptionEvent(
  event: Stripe.Event,
  type: "created" | "updated" | "deleted",
  supabase: ReturnType<typeof createServerClient>
) {
  const subscription = event.data.object as Stripe.Subscription;
  const customerEmail = await getCustomerEmail(subscription.customer as string);

  if (!customerEmail) {
    return NextResponse.json({
      status: 500,
      error: "Customer email could not be fetched",
    });
  }

  const subscriptionData: any = {
    subscription_id: subscription.id,
    stripe_user_id: subscription.customer,
    status: subscription.status,
    start_date: new Date(subscription.created * 1000).toISOString(),
    plan_id: subscription.items.data[0]?.price.id,
    user_id: subscription.metadata?.userId || "",
    email: customerEmail,
  };

  let data, error;
  if (type === "deleted") {
    ({ data, error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled", email: customerEmail })
      .match({ subscription_id: subscription.id })
      .select());
    if (!error) {
      const { error: userError } = await supabase
        .from("user")
        .update({ subscription: null })
        .eq("email", customerEmail);
      if (userError) {
        console.error("Error updating user subscription status:", userError);
        return NextResponse.json({
          status: 500,
          error: "Error updating user subscription status",
        });
      }
    }
  } else {
    ({ data, error } = await supabase
      .from("subscriptions")
      [type === "created" ? "insert" : "update"](
        type === "created" ? [subscriptionData] : subscriptionData
      )
      .match({ subscription_id: subscription.id })
      .select());
  }

  if (error) {
    console.error(`Error during subscription ${type}:`, error);
    return NextResponse.json({
      status: 500,
      error: `Error during subscription ${type}`,
    });
  }

  return NextResponse.json({
    status: 200,
    message: `Subscription ${type} success`,
    data,
  });
}

async function handleInvoiceEvent(
  event: Stripe.Event,
  status: "succeeded" | "failed",
  supabase: ReturnType<typeof createServerClient>
) {
  const invoice = event.data.object as Stripe.Invoice;
  const customerEmail = await getCustomerEmail(invoice.customer as string);

  if (!customerEmail) {
    return NextResponse.json({
      status: 500,
      error: "Customer email could not be fetched",
    });
  }

  const invoiceData = {
    invoice_id: invoice.id,
    subscription_id: invoice.subscription as string,
    amount_paid: status === "succeeded" ? invoice.amount_paid / 100 : undefined,
    amount_due: status === "failed" ? invoice.amount_due / 100 : undefined,
    currency: invoice.currency,
    status,
    user_id: invoice.metadata?.userId,
    email: customerEmail,
  };

  const { data, error } = await supabase.from("invoices").insert([invoiceData]);

  if (error) {
    console.error(`Error inserting invoice (payment ${status}):`, error);
    return NextResponse.json({
      status: 500,
      error: `Error inserting invoice (payment ${status})`,
    });
  }

  return NextResponse.json({
    status: 200,
    message: `Invoice payment ${status}`,
    data,
  });
}

async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  supabase: ReturnType<typeof createServerClient>
) {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata: any = session?.metadata;

  if (metadata?.subscription === "true") {
    // This is for subscription payments
    const subscriptionId = session.subscription;
    try {
      await stripe.subscriptions.update(subscriptionId as string, { metadata });

      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({ user_id: metadata?.userId })
        .eq("email", metadata?.email);
      if (invoiceError) throw new Error("Error updating invoice");

      const { error: userError } = await supabase
        .from("user")
        .update({ subscription: session.id })
        .eq("user_id", metadata?.userId);
      if (userError) throw new Error("Error updating user subscription");

      return NextResponse.json({
        status: 200,
        message: "Subscription metadata updated successfully",
      });
    } catch (error) {
      console.error("Error updating subscription metadata:", error);
      return NextResponse.json({
        status: 500,
        error: "Error updating subscription metadata",
      });
    }
  } else {
    // This is for one-time payments
    const dateTime = new Date(session.created * 1000).toISOString();
    try {
      const { data: user, error: userError } = await supabase
        .from("user")
        .select("*")
        .eq("user_id", metadata?.userId);
      if (userError) throw new Error("Error fetching user");

      const paymentData = {
        user_id: metadata?.userId,
        stripe_id: session.id,
        email: metadata?.email,
        amount: session.amount_total! / 100,
        customer_details: JSON.stringify(session.customer_details),
        payment_intent: session.payment_intent,
        payment_time: dateTime,
        currency: session.currency,
      };

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .insert([paymentData]);
      if (paymentsError) throw new Error("Error inserting payment");
      const updatedCredits =
        Number(user?.[0]?.credits || 0) + (session.amount_total || 0) / 100;
      const { data: updatedUser, error: userUpdateError } = await supabase
        .from("user")
        .update({ credits: updatedCredits })
        .eq("user_id", metadata?.userId);
      if (userUpdateError) throw new Error("Error updating user credits");

      return NextResponse.json({
        status: 200,
        message: "Payment and credits updated successfully",
        updatedUser,
      });
    } catch (error) {
      console.error("Error handling checkout session:", error);
      return NextResponse.json({
        status: 500,
        error,
      });
    }
  }
}

async function webhooksHandler(
  reqText: string,
  request: NextRequest,
  supabase: ReturnType<typeof createServerClient>
): Promise<NextResponse> {
  const sig = request.headers.get("Stripe-Signature");

  try {
    const event = await stripe.webhooks.constructEventAsync(
      reqText,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case "customer.subscription.created":
        return handleSubscriptionEvent(event, "created", supabase);
      case "customer.subscription.updated":
        return handleSubscriptionEvent(event, "updated", supabase);
      case "customer.subscription.deleted":
        return handleSubscriptionEvent(event, "deleted", supabase);
      case "invoice.payment_succeeded":
        return handleInvoiceEvent(event, "succeeded", supabase);
      case "invoice.payment_failed":
        return handleInvoiceEvent(event, "failed", supabase);
      case "checkout.session.completed":
        return handleCheckoutSessionCompleted(event, supabase);
      default:
        return NextResponse.json({
          status: 400,
          error: "Unhandled event type",
        });
    }
  } catch (err) {
    console.error("Error constructing Stripe event:", err);
    return NextResponse.json({
      status: 500,
      error: "Webhook Error: Invalid Signature",
    });
  }
}
