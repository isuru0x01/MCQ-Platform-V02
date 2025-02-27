'use server'

import { supabaseServer } from "@/lib/supabaseServer";

interface SubscriptionCheck {
  canSubmit: boolean;
  message: string;
  isPro: boolean;
}

export async function checkUserLimits(userEmail: string): Promise<SubscriptionCheck> {
  const supabase = await supabaseServer();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check subscription status
  const { data: subscription } = await supabase
    .from('Subscription')
    .select('*')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // If user has a subscription, check if it's still valid
  if (subscription) {
    const currentTime = new Date();
    const renewsAt = subscription.renews_at ? new Date(subscription.renews_at) : null;
    const endsAt = subscription.ends_at ? new Date(subscription.ends_at) : null;

    // Update ends_at if it's NULL and renews_at exists
    if (!endsAt && renewsAt) {
      await supabase
        .from('Subscription')
        .update({ ends_at: renewsAt.toISOString() })
        .eq('user_email', userEmail);
    }

    const isValidSubscription = endsAt ? currentTime < endsAt : renewsAt ? currentTime < renewsAt : false;

    if (isValidSubscription) {
      // Pro user logic
      if (subscription.available_points === null) {
        // Initialize points if null
        await supabase
          .from('Subscription')
          .update({ available_points: 100 })
          .eq('user_email', userEmail);
        subscription.available_points = 100;
      }

      if (subscription.available_points > 0) {
        return {
          canSubmit: true,
          message: `You have ${subscription.available_points} submissions remaining this month.`,
          isPro: true
        };
      } else {
        return {
          canSubmit: false,
          message: "You've used all your submissions for this month.",
          isPro: true
        };
      }
    }
  }

  // Basic user logic - check daily submission
  const { data: todaySubmissions } = await supabase
    .from('Resource')
    .select('created_at')
    .eq('userId', userEmail)
    .gte('created_at', today.toISOString())
    .limit(1);

  if (!todaySubmissions?.length) {
    return {
      canSubmit: true,
      message: "You can submit 1 resource today.",
      isPro: false
    };
  }

  return {
    canSubmit: false,
    message: "You've reached your daily limit. Upgrade to Pro for more submissions!",
    isPro: false
  };
}

export async function decrementProPoints(userEmail: string): Promise<void> {
  const supabase = await supabaseServer();
  
  await supabase.rpc('decrement_available_points', {
    user_email_param: userEmail
  });
} 