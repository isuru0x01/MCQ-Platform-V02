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
  const { user } = useUser();
  
  useEffect(() => {
    async function fetchSubscription() {
      if (user?.emailAddresses?.[0]?.emailAddress) {
        const { data, error } = await supabaseClient
          .from('Subscription')
          .select()
          .eq('user_email', user.emailAddresses[0].emailAddress)
          .maybeSingle();

        if (!error && data) {
          setSubscription(data);
        }
        setLoading(false);
      }
    }

    fetchSubscription();
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
      const { data } = await axios.post('/api/payments/create-checkout-session', {
        userId: user.id,
        email: user.emailAddresses[0].emailAddress,
        priceId: "695265", // Pro Monthly variant ID
      });

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      toast.error('Failed to start checkout process');
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
                <Badge className={subscription ? getStatusColor(subscription.status) : 'bg-gray-500'}>
                  {subscription ? subscription.status_formatted : 'Free Tier'}
                </Badge>
              </CardTitle>
              {!subscription && (
                <p className="text-sm text-muted-foreground mt-2">
                  Submit 1 resource daily with unlimited quiz attempts. Perfect for steady learners.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription ? (
                <>
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
            {!subscription && (
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
