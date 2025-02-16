"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import React, { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/nextjs"
import axios from "axios"
import { toast } from "sonner"
import { TITLE_TAILWIND_CLASS } from "@/utils/constants"
import { useRouter } from "next/navigation"

type PricingSwitchProps = {
  onSwitch: (value: string) => void
}

type PricingCardProps = {
  user: any;
  handleCheckout: any;
  isYearly?: boolean;
  title: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  description: string;
  features: string[];
  actionLabel: string;
  popular?: boolean;
  exclusive?: boolean;
  monthlyVariantId: string;
  yearlyVariantId: string;
  id: string;
}

const PricingHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <section className="text-center">
    <h1 className={`${TITLE_TAILWIND_CLASS} mt-2 font-semibold tracking-tight dark:text-white text-gray-900`}>{title}</h1>
    <p className="text-gray-600 dark:text-gray-400 pt-1">{subtitle}</p>
    <br />
  </section>
)

const PricingSwitch = ({ onSwitch }: PricingSwitchProps) => (
  <Tabs defaultValue="0" className="w-40 mx-auto" onValueChange={onSwitch}>
    <TabsList className="py-6 px-2">
      <TabsTrigger value="0" className="text-base">
        <p className="text-black dark:text-white">Monthly</p>
      </TabsTrigger>
      <TabsTrigger value="1" className="text-base">
        <p className="text-black dark:text-white">Yearly</p>
      </TabsTrigger>
    </TabsList>
  </Tabs>
)

const PricingCard = ({
  user,
  handleCheckout,
  isYearly,
  title,
  monthlyPrice,
  yearlyPrice,
  description,
  features,
  actionLabel,
  popular,
  exclusive,
  monthlyVariantId,
  yearlyVariantId,
  id,
}: PricingCardProps) => {
  const router = useRouter();
  
  // onClick behavior differs based on the plan title
  const onButtonClick = () => {
    if (title === "Basic") {
      // For Basic plan, simply redirect to the dashboard.
      router.push("/dashboard");
    } else if (title === "Pro") {
      // For Pro plan, trigger the checkout process.
      if (user?.id) {
        handleCheckout({
          monthlyVariantId,
          yearlyVariantId,
        });
      } else {
        toast("Please login or sign up to purchase", {
          description: "You must be logged in to make a purchase",
          action: {
            label: "Sign Up",
            onClick: () => {
              router.push("/sign-up");
            },
          },
        });
      }
    } else {
      // For Enterprise (or other plans), assume "Contact Sales" should link to a contact page.
      router.push("/contact-sales");
    }
  };

  return (
    <Card
      className={cn(
        `w-72 flex flex-col justify-between py-1 ${popular ? "border-rose-400" : "border-zinc-700"} mx-auto sm:mx-0`,
        {
          "animate-background-shine bg-white dark:bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] transition-colors":
            exclusive,
        }
      )}
    >
      <div>
        <CardHeader className="pb-8 pt-4">
          {isYearly && yearlyPrice && monthlyPrice ? (
            <div className="flex justify-between">
              <CardTitle className="text-zinc-700 dark:text-zinc-300 text-lg">{title}</CardTitle>
              <div
                className={cn("px-2.5 rounded-xl h-fit text-sm py-1 bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white", {
                  "bg-gradient-to-r from-orange-400 to-rose-400 dark:text-black ": popular,
                })}
              >
                Save ${monthlyPrice * 12 - yearlyPrice}
              </div>
            </div>
          ) : (
            <CardTitle className="text-zinc-700 dark:text-zinc-300 text-lg">{title}</CardTitle>
          )}
          <div className="flex gap-0.5">
            <h2 className="text-3xl font-bold">
              {yearlyPrice !== undefined && isYearly
                ? `$${yearlyPrice}`
                : monthlyPrice !== undefined
                ? `$${monthlyPrice}`
                : "Custom"}
            </h2>
            <span className="flex flex-col justify-end text-sm mb-1">
              {yearlyPrice && isYearly ? "/year" : monthlyPrice ? "/month" : null}
            </span>
          </div>
          <CardDescription className="pt-1.5 min-h-[48px]">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {features.map((feature: string) => (
            <CheckItem key={feature} text={feature} />
          ))}
        </CardContent>
      </div>
      <CardFooter className="mt-2">
        <Button
          onClick={onButtonClick}
          className="relative inline-flex w-full items-center justify-center rounded-md bg-black text-white dark:bg-white px-6 font-medium dark:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
          type="button"
        >
          <div className="absolute -inset-0.5 -z-10 rounded-lg bg-gradient-to-b from-[#c7d2fe] to-[#8678f9] opacity-75 blur" />
          {actionLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}

const CheckItem = ({ text }: { text: string }) => (
  <div className="flex gap-2">
    <CheckCircle2 size={18} className="my-auto text-green-400" />
    <p className="pt-0.5 text-zinc-700 dark:text-zinc-300 text-sm">{text}</p>
  </div>
)

export default function Pricing() {
  const [isYearly, setIsYearly] = useState<boolean>(false)
  const togglePricingPeriod = (value: string) => setIsYearly(parseInt(value) === 1)
  const { user } = useUser()
  const router = useRouter()

  const handleCheckout = async (plan: any) => {
    if (!user) {
      toast("Please login or sign up to purchase", {
        description: "You must be logged in to make a purchase",
        action: {
          label: "Sign Up",
          onClick: () => router.push("/sign-up"),
        },
      });
      return;
    }

    try {
      const variantId = isYearly ? plan.yearlyVariantId : plan.monthlyVariantId;
      const { data } = await axios.post('/api/payments/create-checkout-session', {
        userId: user.id,
        email: user.emailAddresses[0].emailAddress,
        priceId: variantId,
      });

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      console.log('LemonSqueezy API Key:', process.env.LEMON_SQUEEZY_API_KEY);
      toast.error('Failed to start checkout process');
    }
  };

  const plans = [
    {
      id: 'basic',
      title: "Basic",
      monthlyPrice: 0,
      yearlyPrice: 0,
      description: "Submit 1 resource daily with unlimited quiz attempts. Perfect for steady learners.",
      features: ["Submit up to 1 resource per day", "Unlimited quiz attempts", "Access to tutorials", "Unlimited Searches"],
      monthlyVariantId: "",
      yearlyVariantId: "",
      actionLabel: "Get Started",
    },
    {
      id: 'pro',
      title: "Pro",
      monthlyPrice: 10,
      yearlyPrice: 100,
      description: "Submit 100 resources monthly and take unlimited quizzes. Ideal for serious learners.",
      features: ["Submit up to 100 resources per month", "Unlimited quiz attempts", "Access to tutorials", "Unlimited Searches"],
      monthlyVariantId: "695265", // Pro Monthly - old value: 687159
      yearlyVariantId: "695285", // Pro Yearly - old value: 687160
      actionLabel: "Get Started",
      popular: true,
    },
    {
      id: 'enterprise',
      title: "Enterprise",
      description: "Unlimited submissions and quizzes. Best for educational institutions and corporate organizations.",
      features: ["All Features in Pro Plan", "Unlimited submissions", "Dedicated account manager", "Customized onboarding and training"],
      monthlyVariantId: "687159",
      yearlyVariantId: "687160",
      actionLabel: "Contact Sales",
      exclusive: true,
    },
  ]

  return (
    <div>
      <PricingHeader title="Pricing" subtitle="All accounts start with the 🆓 Basic Plan upon sign-up. Upgrade anytime to unlock more features and enhance your learning experience! 🔓📚." />
      <PricingSwitch onSwitch={togglePricingPeriod} />
      <section className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-8 mt-8">
        {plans.map((plan) => (
          <PricingCard 
            key={plan.title}
            user={user} 
            handleCheckout={handleCheckout}
            {...plan} 
            isYearly={isYearly} 
          />
        ))}
      </section>
    </div>
  )
}
