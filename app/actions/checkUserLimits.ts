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
      // Pro user logic - check user_usage table using the userId from subscription
      const { data: userUsage } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', subscription.userId) // Use subscription.userId instead of userEmail
        .single();
      
      if (userUsage) {
        const periodEnd = new Date(userUsage.period_end);
        const submissionCount = userUsage.submission_count || 0;
        const subscriptionPoints = userUsage.subscription_points || 100;
        
        // Check if period is still valid and user has submissions left
        if (currentTime < periodEnd && submissionCount < subscriptionPoints) {
          const remainingSubmissions = subscriptionPoints - submissionCount;
          return {
            canSubmit: true,
            message: `You have ${remainingSubmissions} submissions remaining this month.`,
            isPro: true
          };
        } else if (currentTime >= periodEnd) {
          return {
            canSubmit: false,
            message: "Your subscription period has ended. Please renew your subscription.",
            isPro: true
          };
        } else {
          return {
            canSubmit: false,
            message: "You've used all your submissions for this month.",
            isPro: true
          };
        }
      } else {
        // No usage record found, but user has valid subscription
        return {
          canSubmit: false,
          message: "Your subscription is active but usage data is missing. Please contact support.",
          isPro: true
        };
      }
    }
  }

  // Basic user logic - check daily submission
  // We need to get the actual userId format first
  const { data: user } = await supabase
    .from('User')
    .select('id')
    .eq('email', userEmail)
    .single();
    
  const userId = user?.id;
  
  if (!userId) {
    console.error('No user found with email:', userEmail);
    return {
      canSubmit: true,
      message: "You can submit 1 resource today.",
      isPro: false
    };
  }
  
  // Now use the correct userId format for the Resource table
  const { data: todaySubmissions } = await supabase
    .from('Resource')
    .select('created_at')
    .eq('userId', userId) // Use the correct userId format
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
  
  // First get the userId from the subscription
  const { data: subscription } = await supabase
    .from('Subscription')
    .select('userId')
    .eq('user_email', userEmail)
    .single();
  
  if (!subscription?.userId) {
    console.error('No subscription found for user:', userEmail);
    return;
  }
  
  // Update to increment submission_count in user_usage table
  await supabase
    .from('user_usage')
    .update({ 
      submission_count: supabase.rpc('increment_submission_count') 
    })
    .eq('user_id', subscription.userId);
}