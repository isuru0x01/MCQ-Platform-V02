"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowUpRight, Plus, History, Trophy, BookOpen } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import placeholderImage from "@/public/placeholder.png";
import { supabaseClient } from "@/lib/supabaseClient";

export default function Dashboard() {
  interface Resource {
    id: number;
    url: string;
    type: "youtube" | "article";
    title: string;
    image_url: string | null;
    createdAt: string;
    content: string;
  }

  interface Performance {
    id: string;
    createdAt: string;
    quizId: number;
    correctAnswers: number;
    totalQuestions: number;
    userId: string;
  }

  const [resources, setResources] = useState<Resource[]>([]);
  const [performanceData, setPerformanceData] = useState<Performance[]>([]);

  useEffect(() => {
    fetchResources();
    fetchPerformance();
  }, []);

  const fetchResources = async () => {
    try {
      const { data: resourcesData, error } = await supabaseClient
        .from("Resource")
        .select("*")
        .order("createdAt", { ascending: false })
        .limit(5);
      if (error) throw error;
      setResources(resourcesData || []);
    } catch (error) {
      console.error("Error fetching resources:", error);
    }
  };

  const fetchPerformance = async () => {
    try {
      const { data: performanceData, error } = await supabaseClient
        .from("Performance")
        .select("*")
        .order("createdAt", { ascending: false })
        .limit(10);
      if (error) throw error;
      setPerformanceData(performanceData || []);
    } catch (error) {
      console.error("Error fetching performance data:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Top Action Bar */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">MCQ Lab</h1>
        <Button asChild variant="default" size="sm" className="gap-2">
          <Link href="/dashboard/submit">
            <Plus className="h-4 w-4" />
            Add Resource
          </Link>
        </Button>
      </div>

      {/* Navigation Pills */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <Button variant="secondary" className="gap-2" size="sm">
          <BookOpen className="h-4 w-4" />
          All Resources
        </Button>
        <Button variant="ghost" className="gap-2" size="sm">
          <History className="h-4 w-4" />
          Recent
        </Button>
        <Button variant="ghost" className="gap-2" size="sm">
          <Trophy className="h-4 w-4" />
          Top Performing
        </Button>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {resources.map((resource) => (
          <Link key={resource.id} href={`/dashboard/quiz/${resource.id}`}>
            <Card className="overflow-hidden hover:bg-accent transition-colors group">
              {/* Thumbnail */}
              <div className="aspect-video relative overflow-hidden bg-muted">
                <Image
                  src={resource.image_url || placeholderImage}
                  alt={resource.title}
                  fill
                  className="object-cover"
                />
              </div>
              
              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold line-clamp-2 mb-1 group-hover:text-blue-600">
                  {resource.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{resource.type === 'youtube' ? '🎥 Video' : '📄 Article'}</span>
                  <span>•</span>
                  <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {resources.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No resources yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by adding your first learning resource
          </p>
          <Button asChild>
            <Link href="/dashboard/submit">
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Link>
          </Button>
        </div>
      )}

      {/* Performance Section */}
      {performanceData.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Performance</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/performance" className="flex items-center gap-1">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {performanceData.slice(0, 4).map((performance) => (
              <Card key={performance.id} className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Quiz Score</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(performance.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((performance.correctAnswers / performance.totalQuestions) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {performance.correctAnswers} / {performance.totalQuestions} correct
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}