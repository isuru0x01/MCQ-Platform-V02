// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { supabaseClient } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Resource = {
  id: number;
  title: string | null;
  content: string | null;
  image_url: string | null;
  type: string;
  url: string;
  userId: string;
  createdAt: string;
};

type Quiz = {
  id: number;
  createdAt: string;
  resourceId: number;
  userId: string;
  Resource: Resource[];
};

type Performance = {
  id: string;
  correctAnswers: number;
  totalQuestions: number;
  createdAt: string;
  quizId: number;
  userId: string;
  Quiz: Quiz | null;
  title: string | null;
};

export default function PerformancePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [performanceData, setPerformanceData] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, [user]);

  const fetchPerformanceData = async () => {
    try {
      const userId = user?.id?.toString();
      if (!userId) {
        toast({
          title: "Error",
          description: "User not authenticated.",
          variant: "destructive",
        });
        return;
      }
  
      const { data, error } = await supabaseClient
        .from("Performance")
        .select(
          `
            id,
            correctAnswers,
            totalQuestions,
            createdAt,
            quizId,
            userId,
            Quiz (
              id,
              createdAt,
              resourceId,
              userId,
              Resource (
                id,
                title,
                content,
                image_url,
                type,
                url,
                userId,
                createdAt
              )
            )
          `
        )
        .eq("userId", userId)
        .order("createdAt", { ascending: false });
  
      if (error) throw error;
  
      console.log("Performance Data:", data); // Debugging: Verify structure
  
      const performanceWithTitle = data.map((performance) => {
        // Directly access Resource title since it's an object
        const resourceTitle = performance.Quiz?.Resource?.title || "N/A";
  
        return {
          ...performance,
          title: resourceTitle,
        };
      });
  
      setPerformanceData(performanceWithTitle);
    } catch (error) {
      console.error("Error fetching performance data:", error);
      toast({
        title: "Error",
        description: "Failed to load performance records.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const calculateScore = (correct: number, total: number) =>
    ((correct / total) * 100).toFixed(2);

  const confirmDelete = (performanceId: string) => {
    if (
      window.confirm("Are you sure you want to delete this performance record?")
    ) {
      handleDelete(performanceId);
    }
  };

  const handleDelete = async (performanceId: string) => {
    try {
      const { error } = await supabaseClient
        .from("Performance")
        .delete()
        .eq("id", performanceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Performance record deleted successfully.",
      });

      setPerformanceData((prev) =>
        prev.filter((performance) => performance.id !== performanceId)
      );
    } catch (error) {
      console.error("Error deleting performance record:", error);
      toast({
        title: "Error",
        description: "Failed to delete performance record.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (performanceData.length === 0) {
    return (
      <Card>
        <CardContent>
          <p>No performance records available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Records</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left">
              <th className="p-2 border">Quiz Title</th>
              <th className="p-2 border">Date Taken</th>
              <th className="p-2 border">Score</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {performanceData.map((performance) => (
              <tr key={performance.id} className="border">
                <td className="p-2 border">{performance.title}</td>
                <td className="p-2 border">
                  {formatDate(performance.createdAt)}
                </td>
                <td className="p-2 border">
                  {calculateScore(
                    performance.correctAnswers,
                    performance.totalQuestions
                  )}
                  %
                </td>
                <td className="p-2 border">
                  <Link href={`/dashboard/quiz/${performance.quizId}`}>
                    <Button>Retake</Button>
                  </Link>
                  <Button
                    onClick={() => confirmDelete(performance.id)}
                    className="ml-2 bg-red-500 hover:bg-red-600"
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
