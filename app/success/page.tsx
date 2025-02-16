"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-2">
          Payment Successful!
        </h1>
        
        <p className="text-muted-foreground mb-6">
          Thank you for upgrading to MCQ Lab Pro! Your account has been successfully upgraded, and you now have access to all premium features.
        </p>

        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
          
          <p className="text-sm text-muted-foreground">
            If you have any questions, please contact our support team.
          </p>
        </div>
      </Card>
    </div>
  );
}
