"use client"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import config from '@/config';
import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';

interface SubscriptionDetails {
  status: string;
  status_formatted: string;
  product_name: string;
  renews_at: string;
  ends_at: string | null;
  trial_ends_at: string | null;
  available_points: number | null;
}

const BASIC_PLAN_FEATURES = [
  "Submit up to 1 resource per day",
  "Unlimited quiz attempts",
  "Access to unlimited tutorials",
  "Unlimited Searches"
];

export default function Settings() {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [todaySubmissionAvailable, setTodaySubmissionAvailable] = useState(false);
  const { user } = useUser();
  
  useEffect(() => {
    async function fetchSubscriptionAndUsage() {
      if (user?.emailAddresses?.[0]?.emailAddress) {
        const email = user.emailAddresses[0].emailAddress;
        
        // Fetch subscription details
        const { data: subData, error: subError } = await supabaseClient
          .from('Subscription')
          .select('*')
          .eq('user_email', email)
          .maybeSingle();

        if (!subError && subData) {
          // If Pro user and points are null but subscription is active
          if (subData.status === 'active' && subData.available_points === null) {
            const renewsAt = subData.renews_at ? new Date(subData.renews_at) : null;
            if (renewsAt && renewsAt > new Date()) {
              // Update points to 100
              const { error: updateError } = await supabaseClient
                .from('Subscription')
                .update({ available_points: 100 })
                .eq('user_email', email);
              
              if (!updateError) {
                subData.available_points = 100;
              }
            }
          }
          setSubscription(subData);
        }

        // For basic users, check today's submission availability
        if (!subData || subData.status !== 'active') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const { data: todaySubmissions } = await supabaseClient
            .from('Resource')
            .select('created_at')
            .eq('userId', email)
            .gte('created_at', today.toISOString())
            .limit(1);

          setTodaySubmissionAvailable(!todaySubmissions?.length);
        }

        setLoading(false);
      }
    }

    fetchSubscriptionAndUsage();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'paused':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Please log in to upgrade");
      return;
    }

    try {
      // Show loading state
      toast.loading("Preparing checkout...");

      const response = await axios.post('/api/payments/create-checkout-session', {
        userId: user.id,
        email: user.emailAddresses[0].emailAddress,
        priceId: "695265", // Pro Monthly variant ID
        name: `${user.firstName} ${user.lastName}`.trim()
      });

      if (response.data.checkoutUrl) {
        // Dismiss loading toast
        toast.dismiss();
        // Redirect to checkout
        window.location.href = response.data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      // Dismiss loading toast
      toast.dismiss();
      
      console.error('Checkout error:', error);
      
      // Show more detailed error message
      toast.error(
        error.response?.data?.details || 
        error.response?.data?.error || 
        'Failed to start checkout process. Please try again.'
      );
    }
  };

  return (
    <div className='flex justify-start items-start flex-wrap px-4 pt-5 gap-8'>
      <div className="flex flex-col gap-3 w-full max-w-[700px]">
        <h2 className="mt-10 scroll-m-20 border-b pb-2 w-full text-3xl font-semibold tracking-tight transition-colors first:mt-0">
          My Profile
        </h2>
        <div className='flex w-full gap-3 mt-3'>
          <div className='flex flex-col gap-3 w-full'>
            <Label>First Name</Label>
            <Input disabled defaultValue={user?.firstName ?? ""} />
          </div>
          <div className='flex flex-col gap-3 w-full'>
            <Label>Last Name</Label>
            <Input disabled defaultValue={user?.lastName ?? ""} />
          </div>
        </div>
        <div className='flex flex-col gap-3'>
          <Label>E-mail</Label>
          <Input disabled defaultValue={user?.emailAddresses?.[0]?.emailAddress ?? ""} />
        </div>

        <h2 className="mt-10 scroll-m-20 border-b pb-2 w-full text-3xl font-semibold tracking-tight transition-colors">
          Subscription Details
        </h2>
        
        {loading ? (
          <div>Loading subscription details...</div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{subscription ? subscription.product_name : 'Basic Plan'}</span>
                <Badge className={subscription?.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                  {subscription?.status === 'active' ? 'Pro' : 'Free Tier'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription?.status === 'active' ? (
                <>
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Resource Submissions</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {subscription.available_points} points remaining
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your points will reset when your subscription renews on {new Date(subscription.renews_at).toLocaleDateString()}
                    </p>
                  </div>
                  {subscription.trial_ends_at && (
                    <div>
                      <Label>Trial Ends</Label>
                      <div>{new Date(subscription.trial_ends_at).toLocaleDateString()}</div>
                    </div>
                  )}
                  {subscription.renews_at && (
                    <div>
                      <Label>Next Billing Date</Label>
                      <div>{new Date(subscription.renews_at).toLocaleDateString()}</div>
                    </div>
                  )}
                  {subscription.ends_at && (
                    <div>
                      <Label>Subscription Ends</Label>
                      <div>{new Date(subscription.ends_at).toLocaleDateString()}</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Resource Submissions</h3>
                    {todaySubmissionAvailable ? (
                      <div className="space-y-2">
                        <p className="text-green-600">
                          ✓ You can submit one resource today
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Upgrade to Pro to submit up to 100 resources per month and unlock premium features!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-yellow-600">
                          ⚠️ Daily submission limit reached
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Upgrade to Pro to submit more resources and unlock unlimited access!
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    Your current plan includes:
                  </div>
                  <ul className="space-y-2">
                    {BASIC_PLAN_FEATURES.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4 text-green-500 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 text-sm text-muted-foreground">
                    Upgrade to Pro to access premium features.
                  </div>
                </div>
              )}
            </CardContent>
            {!subscription?.status === 'active' && (
              <CardFooter className="pt-4">
                <Button 
                  onClick={handleUpgrade}
                  className="w-full bg-gradient-to-r from-orange-400 to-rose-400 text-white hover:from-orange-500 hover:to-rose-500"
                >
                  Upgrade to Pro Plan
                </Button>
              </CardFooter>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
