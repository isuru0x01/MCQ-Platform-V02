"use client"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import config from '@/config';
import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface SubscriptionDetails {
  status: string;
  status_formatted: string;
  product_name: string;
  renews_at: string;
  ends_at: string | null;
  trial_ends_at: string | null;
  variant_name: string;
  interval: string;
  card_brand: string;
  card_last_four: string;
}

interface UserUsage {
  plan_type: string;
  period_start: string;
  period_end: string;
  submission_count: number;
  subscription_points: number;
}

interface PaymentDetails {
  amount: number;
  currency: string;
  paymentDate: string;
  total_formatted: string;
  status_formatted: string;
  user_name: string;
}

const BASIC_PLAN_FEATURES = [
  "Submit up to 1 resource per day",
  "Unlimited quiz attempts",
  "Access to unlimited tutorials",
  "Unlimited Searches"
];

export default function Settings() {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [userUsage, setUserUsage] = useState<UserUsage | null>(null);
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  
  useEffect(() => {
    async function fetchUserData() {
      if (user?.id) {
        try {
          setLoading(true);
          const userId = user.id;
          const email = user.emailAddresses?.[0]?.emailAddress;
          
          // Fetch subscription data
          const { data: subscriptionData, error: subscriptionError } = await supabaseClient
            .from('Subscription')
            .select('status, status_formatted, product_name, renews_at, ends_at, trial_ends_at, variant_name, interval, card_brand, card_last_four')
            .or(`userId.eq.${userId},user_email.eq.${email}`)
            .maybeSingle();
          
          if (subscriptionError) {
            console.error('Error fetching subscription:', subscriptionError);
          } else if (subscriptionData) {
            setSubscription(subscriptionData);
          }
          
          // Fetch user usage data
          const { data: usageData, error: usageError } = await supabaseClient
            .from('user_usage')
            .select('plan_type, period_start, period_end, submission_count, subscription_points')
            .eq('user_id', userId)
            .order('period_start', { ascending: false })
            .maybeSingle();
          
          if (usageError) {
            console.error('Error fetching user usage:', usageError);
          } else if (usageData) {
            setUserUsage(usageData);
          }
          
          // Fetch payment history
          const { data: paymentData, error: paymentError } = await supabaseClient
            .from('Payment')
            .select('amount, currency, paymentDate, total_formatted, status_formatted, user_name')
            .or(`userId.eq.${userId},email.eq.${email}`)
            .order('paymentDate', { ascending: false })
            .limit(5);
          
          if (paymentError) {
            console.error('Error fetching payments:', paymentError);
          } else if (paymentData) {
            setPayments(paymentData);
          }
          
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      }
    }
  
    fetchUserData();
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
        name: `${user.firstName} ${user.lastName}`.trim()
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
      <div className="flex flex-col gap-3 w-full max-w-[900px]">
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

        <Tabs defaultValue="subscription" className="w-full mt-8">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="subscription">
            <h2 className="scroll-m-20 border-b pb-2 w-full text-2xl font-semibold tracking-tight transition-colors">
              Subscription Details
            </h2>
            
            {loading ? (
              <div className="py-8 text-center">Loading subscription details...</div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{subscription ? subscription.product_name : 'Basic Plan'}</span>
                    <Badge className={subscription ? getStatusColor(subscription.status) : 'bg-gray-500'}>
                      {subscription ? subscription.status_formatted : 'Free Tier'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {subscription 
                      ? `${subscription.variant_name || subscription.product_name} (${subscription.interval === 'yearly' ? 'Annual' : 'Monthly'} billing)`
                      : 'Submit 1 resource daily with unlimited quiz attempts. Perfect for steady learners.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subscription ? (
                    <div className="space-y-4">
                      {subscription.card_brand && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Payment Method</span>
                          <span className="font-medium">
                            {subscription.card_brand.charAt(0).toUpperCase() + subscription.card_brand.slice(1)} •••• {subscription.card_last_four}
                          </span>
                        </div>
                      )}
                      
                      {subscription.trial_ends_at && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Trial Ends</span>
                          <span className="font-medium">{formatDate(subscription.trial_ends_at)}</span>
                        </div>
                      )}
                      
                      {subscription.renews_at && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Next Billing Date</span>
                          <span className="font-medium">{formatDate(subscription.renews_at)}</span>
                        </div>
                      )}
                      
                      {subscription.ends_at && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Subscription Ends</span>
                          <span className="font-medium">{formatDate(subscription.ends_at)}</span>
                        </div>
                      )}
                    </div>
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
          </TabsContent>
          
          <TabsContent value="usage">
            <h2 className="scroll-m-20 border-b pb-2 w-full text-2xl font-semibold tracking-tight transition-colors">
              Usage Details
            </h2>
            
            {loading ? (
              <div className="py-8 text-center">Loading usage details...</div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Current Usage Period</CardTitle>
                  <CardDescription>
                    {userUsage 
                      ? `${formatDate(userUsage.period_start)} to ${formatDate(userUsage.period_end)}`
                      : 'No active subscription period found'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {userUsage ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Plan Type</span>
                          <span>{userUsage.plan_type}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Submissions Used</span>
                          <span>{userUsage.submission_count} / {userUsage.subscription_points}</span>
                        </div>
                        <div className="pt-2">
                          <Progress 
                            value={(userUsage.submission_count / userUsage.subscription_points) * 100} 
                            className="h-2"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground pt-1">
                          {userUsage.subscription_points - userUsage.submission_count} submissions remaining this period
                        </p>
                      </div>
                      
                      <div className="rounded-lg bg-muted p-4">
                        <h4 className="text-sm font-medium mb-2">Period Information</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted-foreground">Start Date</div>
                          <div className="text-right">{formatDate(userUsage.period_start)}</div>
                          <div className="text-muted-foreground">End Date</div>
                          <div className="text-right">{formatDate(userUsage.period_end)}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No usage data available. Subscribe to a plan to track your usage.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="payments">
            <h2 className="scroll-m-20 border-b pb-2 w-full text-2xl font-semibold tracking-tight transition-colors">
              Payment History
            </h2>
            
            {loading ? (
              <div className="py-8 text-center">Loading payment history...</div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>
                    Your last {payments.length} payment{payments.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {payments.length > 0 ? (
                    <div className="space-y-4">
                      {payments.map((payment, index) => (
                        <div key={index} className="flex justify-between items-center p-4 rounded-lg border">
                          <div className="space-y-1">
                            <p className="font-medium">{payment.user_name || 'Subscription Payment'}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(payment.paymentDate)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{payment.total_formatted}</p>
                            <Badge className={payment.status_formatted.toLowerCase() === 'paid' ? 'bg-green-500' : 'bg-gray-500'}>
                              {payment.status_formatted}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No payment history available.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}