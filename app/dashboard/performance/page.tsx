"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabaseClient } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Define the interface for performance data
interface PerformanceData {
  id: string;
  correctAnswers: number;
  totalQuestions: number;
  createdAt: string;
  quizId: string;
  Quiz: { title: string };
}

export default function PerformancePage() {
  const { user } = useUser();
  const { toast } = useToast();
  // Specify the type for performanceData
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);

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
  
      // Fetch performance data with joined quiz and resource data
      const { data, error } = await supabaseClient
        .from('Performance')
        .select(`
          id,
          correctAnswers,
          totalQuestions,
          createdAt,
          quizId,
          Quiz (
            Resource (
              title
            )
          )
        `)
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
  
      if (error) throw error;
  
      // Map the data to include the title from the Resource table
      const performanceWithTitle = data.map((performance) => ({
        ...performance,
        title: performance.Quiz?.Resource?.title || 'N/A',
      }));
  
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

  useEffect(() => {
    fetchPerformanceData();
  }, [user, toast]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const calculateScore = (correct: number, total: number) => {
    return ((correct / total) * 100).toFixed(1);
  };

  const handleDelete = async (performanceId: string) => {
    try {
      const { error } = await supabaseClient
        .from('Performance')
        .delete()
        .eq('id', performanceId);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Performance record deleted.",
      });
      fetchPerformanceData(); // Refresh data
    } catch (error) {
      console.error("Error deleting performance record:", error);
      toast({
        title: "Error",
        description: "Failed to delete performance record.",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = (performanceId: string) => {
    if (window.confirm("Are you sure you want to delete this performance record?")) {
      handleDelete(performanceId);
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
    <td className="p-2 border">{performance?.title}</td>
    <td className="p-2 border">{formatDate(performance.createdAt)}</td>
    <td className="p-2 border">
      {calculateScore(performance.correctAnswers, performance.totalQuestions)}%
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