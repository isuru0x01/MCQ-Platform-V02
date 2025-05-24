"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@clerk/nextjs";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getUserById } from "@/app/actions/getUser";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, BookOpen, Focus } from "lucide-react";

interface Resource {
  id: number;
  title: string;
  url: string;
  type: "youtube" | "article" | "document";
  content: string;
  image_url: string | null;
  tutorial: string;
  userId: string;
}

interface MCQ {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: number;
  quizId: number;
}

export default function QuizPage() {
  const params = useParams();
  const { toast } = useToast();
  const [resource, setResource] = useState<Resource | null>(null);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const { user } = useUser();
  const [isPerformanceSubmitted, setIsPerformanceSubmitted] = useState(false);
  const [quizId, setQuizId] = useState<number | null>(null);
  const [uploaderName, setUploaderName] = useState<string>("");
  const [startTime] = useState<Date>(new Date());
  // New state for tutorial collapse
  const [tutorialCollapsed, setTutorialCollapsed] = useState(false);

  useEffect(() => {
    const fetchUploaderName = async () => {
      if (resource?.userId) {
        const name = await getUserById(resource.userId);
        setUploaderName(name);
      }
    };

    fetchUploaderName();
  }, [resource?.userId]);

  useEffect(() => {
    async function fetchQuizData() {
      try {
        // Fetch the resource data
        const { data: resourceData, error: resourceError } = await supabaseClient
          .from("Resource")
          .select("*")
          .eq("id", params.id)
          .single();

        if (resourceError) throw resourceError;

        // Fetch the quizId from the Quiz table using the resourceId
        const { data: quizData, error: quizError } = await supabaseClient
          .from("Quiz")
          .select("id")
          .eq("resourceId", params.id)
          .single();

        if (quizError) throw quizError;

        const quizId = quizData.id;
        setQuizId(quizId);

        // Fetch MCQs using the quizId
        const { data: mcqData, error: mcqError } = await supabaseClient
          .from("MCQ")
          .select("*")
          .eq("quizId", quizId);

        if (mcqError) throw mcqError;

        setResource(resourceData);
        setMcqs(mcqData || []);
      } catch (error) {
        console.error("Error fetching quiz data:", error);
        toast({
          title: "Error",
          description: "Failed to load quiz. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchQuizData();
  }, [params.id, toast]);

  const submitPerformance = async () => {
    try {
      const userId = user?.id?.toString();
      if (!userId) {
        toast({
          title: "Error",
          description: "User not logged in.",
          variant: "destructive",
        });
        return;
      }

      if (!quizId) {
        toast({
          title: "Error",
          description: "Quiz ID not found.",
          variant: "destructive",
        });
        return;
      }

      // Calculate correctCount on the fly
      const totalCorrect = mcqs.reduce((acc, mcq) => {
        if (answers[mcq.id] === mcq.correctOption.toString()) {
          return acc + 1;
        }
        return acc;
      }, 0);

      const performanceData = {
        quizId: quizId,
        correctAnswers: totalCorrect,
        totalQuestions: mcqs.length,
        userId: userId,
        createdAt: new Date().toISOString(),
      };

      const { data, error } = await supabaseClient
        .from("Performance")
        .insert([performanceData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Performance data submitted successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error submitting performance:", error);
      toast({
        title: "Error",
        description: "Failed to submit performance data.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (mcqs.length > 0 && Object.keys(answers).length === mcqs.length && !isPerformanceSubmitted) {
      submitPerformance();
      setIsPerformanceSubmitted(true);
    }
  }, [answers, mcqs, isPerformanceSubmitted]);

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const toggleTutorial = () => {
    setTutorialCollapsed(!tutorialCollapsed);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        {/* Sticky Header Skeleton */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-6 sm:h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col xl:flex-row gap-6 lg:gap-8">
            <div className="w-full xl:w-1/2">
              <Skeleton className="h-[300px] sm:h-[400px] w-full" />
            </div>
            <div className="w-full xl:w-1/2">
              <Skeleton className="h-6 sm:h-8 w-3/4 mb-4" />
              <Skeleton className="h-[400px] sm:h-[600px] w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!resource) {
    return <div className="container mx-auto px-4 py-6">Resource not found</div>;
  }

  // Calculate correctCount on the fly for display
  const correctCount = mcqs.reduce((acc, mcq) => {
    if (answers[mcq.id] === mcq.correctOption.toString()) {
      return acc + 1;
    }
    return acc;
  }, 0);

  // Calculate score on the fly
  const score = mcqs.length > 0 ? (correctCount / mcqs.length) * 100 : 0;
  const progressPercentage = mcqs.length > 0 ? (Object.keys(answers).length / mcqs.length) * 100 : 0;
  const isCompleted = Object.keys(answers).length === mcqs.length;

  return (
    <div className="min-h-screen">
      {/* Sticky Header with Quiz Title and Progress */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate">{resource.title}</h1>
                  {/* Tutorial Toggle Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleTutorial}
                    className="flex items-center gap-2 text-xs sm:text-sm transition-all duration-200 hover:bg-primary/10"
                  >
                    {tutorialCollapsed ? (
                      <>
                        <BookOpen className="h-4 w-4" />
                        <span className="hidden sm:inline">Show Tutorial</span>
                        <span className="sm:hidden">Tutorial</span>
                      </>
                    ) : (
                      <>
                        <Focus className="h-4 w-4" />
                        <span className="hidden sm:inline">Focus Mode</span>
                        <span className="sm:hidden">Focus</span>
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {resource.type.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground hidden sm:inline">•</span>
                  <span className="text-sm text-muted-foreground">
                    {mcqs.length} Questions
                  </span>
                </div>
              </div>
              
              {/* Prominent Score Display */}
              <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                    <span className={score >= 70 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600"}>
                      {score.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {correctCount}/{mcqs.length} Correct
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {Object.keys(answers).length}/{mcqs.length}
                  </div>
                  <p className="text-xs text-muted-foreground">Progress</p>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full">
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Progress: {progressPercentage.toFixed(0)}%</span>
                {isCompleted && (
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="hidden sm:inline">Completed</span>
                    <span className="sm:hidden">Done</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className={`flex flex-col gap-6 lg:gap-8 transition-all duration-300 ${
          tutorialCollapsed ? 'xl:flex-row xl:justify-center' : 'xl:flex-row'
        }`}>
          {/* Resource Content - Collapsible */}
          <div className={`space-y-6 transition-all duration-300 ${
            tutorialCollapsed 
              ? 'hidden xl:block xl:w-0 xl:overflow-hidden xl:opacity-0' 
              : 'w-full xl:w-1/2'
          }`}>
            {/* Tutorial content */}
          </div>

          {/* Quiz Section */}
          <div className={`transition-all duration-300 ${
            tutorialCollapsed 
              ? 'w-full max-w-4xl mx-auto' 
              : 'w-full xl:w-1/2'
          }`}>
            {/* MCQ content */}
          </div>
        </div>
      </div>
    </div>
  );

  // Calculate if all questions are answered
  const allQuestionsAnswered = Object.keys(answers).length === mcqs.length;
}