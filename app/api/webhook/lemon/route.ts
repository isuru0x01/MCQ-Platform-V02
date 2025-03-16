import { NextRequest, NextResponse } from "next/server";
import crypto from 'crypto';
import { supabaseClient } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  // Verify webhook signature
  const signature = req.headers.get('x-signature');
  const payload = await req.text();
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '')
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(payload);
  const eventName = event.meta.event_name;

  // Handle subscription_updated event
  if (eventName === 'subscription_updated') {
    const userId = event.meta.custom_data?.userId;
    const status = event.data.attributes.status;
    const renewsAt = event.data.attributes.renews_at;

    if (userId) {
      // Update user subscription status in database
      const { error } = await supabaseClient
        .from('users')
        .update({
          subscription_status: status,
          subscription_ends_at: renewsAt
        })
        .eq('id', userId);

      if (error) {
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  }

  // Handle other event types
  return NextResponse.json({ message: 'Unhandled event type' });
} 