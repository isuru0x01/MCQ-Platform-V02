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
import { Trophy, Clock, CheckCircle2, XCircle } from "lucide-react";

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
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate">{resource.title}</h1>
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
        <div className="flex flex-col xl:flex-row gap-6 lg:gap-8">
          {/* Resource Content */}
          <div className="w-full xl:w-1/2 space-y-6">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-4">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-lg sm:text-xl">Resource Content</span>
                  <Badge variant="outline" className="self-start sm:self-center">{resource.type.toUpperCase()}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resource.type === "youtube" ? (
                  <div className="relative pb-[56.25%] h-0 rounded-lg overflow-hidden shadow-md">
                    <iframe
                      src={getYouTubeEmbedUrl(resource.url)}
                      className="absolute top-0 left-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                ) : resource.type === "document" ? (
                  <div className="prose max-w-none dark:prose-invert">
                    <p className="text-sm text-muted-foreground">
                      Uploaded by{" "}
                      <span className="font-medium text-foreground">
                        {uploaderName || "Loading..."}
                      </span>
                    </p>
                  </div>
                ) : ![
                  "article",
                  "document",
                ].includes(resource.type) ? (
                  <div className="prose max-w-none dark:prose-invert text-sm sm:text-base">
                    {resource.content}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {resource.tutorial && (
              <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Tutorial</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none dark:prose-invert text-sm sm:text-base">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <h1 className="text-xl sm:text-2xl font-bold mb-4">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg sm:text-xl font-bold mb-3">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base sm:text-lg font-bold mb-2">{children}</h3>,
                        p: ({ children }) => <p className="mb-4 text-sm sm:text-base">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
                        li: ({ children }) => <li className="mb-1 text-sm sm:text-base">{children}</li>,
                        code: ({ children }) => (
                          <code className="bg-muted px-1.5 py-0.5 rounded-md text-xs sm:text-sm">{children}</code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4 text-xs sm:text-sm">{children}</pre>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-primary pl-4 italic mb-4 text-sm sm:text-base">
                            {children}
                          </blockquote>
                        ),
                        a: ({ href, children }) => (
                          <a href={href} className="text-primary hover:underline break-words">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {resource.tutorial
                        .replace(/^```(markdown)?\s*/, '')
                        .replace(/\s*```$/, '')}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quiz Section */}
          <div className="w-full xl:w-1/2">
            <Card className="shadow-xl border-0 bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-4">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-lg sm:text-xl">Quiz Questions</span>
                  <Badge variant={isCompleted ? "default" : "secondary"} className="self-start sm:self-center">
                    {Object.keys(answers).length}/{mcqs.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8">
                {mcqs.map((mcq, index) => {
                  const isAnswered = answers[mcq.id] !== undefined;
                  const isCorrect = isAnswered && answers[mcq.id] === mcq.correctOption.toString();
                  
                  return (
                    <div key={mcq.id}>
                      {/* Question Card with Enhanced Styling */}
                      <Card className="shadow-md border border-border/50 hover:shadow-lg transition-all duration-200">
                        <CardContent className="p-4 sm:p-6">
                          <div className="space-y-4">
                            {/* Question Header */}
                            <div className="flex items-start gap-3">
                              <Badge variant="outline" className="mt-1 text-xs font-medium flex-shrink-0">
                                {index + 1}
                              </Badge>
                              <h3 className="font-medium text-base sm:text-lg leading-relaxed flex-1 min-w-0">
                                {mcq.question}
                              </h3>
                              {isAnswered && (
                                <div className="flex items-center flex-shrink-0">
                                  {isCorrect ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-red-500" />
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Answer Options */}
                            <RadioGroup
                              onValueChange={(value) => handleAnswerChange(mcq.id, value)}
                              value={answers[mcq.id]}
                              className="space-y-3"
                            >
                              {[
                                { option: 1, text: mcq.optionA },
                                { option: 2, text: mcq.optionB },
                                { option: 3, text: mcq.optionC },
                                { option: 4, text: mcq.optionD },
                              ].map(({ option, text }) => {
                                const isSelected = answers[mcq.id] === option.toString();
                                const isCorrectOption = mcq.correctOption.toString() === option.toString();
                                
                                return (
                                  <div
                                    key={option}
                                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200 hover:bg-muted/50 ${
                                      isAnswered
                                        ? isCorrectOption
                                          ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                                          : isSelected
                                          ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                                          : "bg-muted/20 border-border"
                                        : "border-border hover:border-primary/50"
                                    }`}
                                  >
                                    <RadioGroupItem
                                      value={option.toString()}
                                      id={`q${mcq.id}-o${option}`}
                                      className={`mt-0.5 flex-shrink-0 ${
                                        isAnswered
                                          ? isCorrectOption
                                            ? "border-green-500 text-green-500"
                                            : isSelected
                                            ? "border-red-500 text-red-500"
                                            : ""
                                          : ""
                                      }`}
                                    />
                                    <Label
                                      htmlFor={`q${mcq.id}-o${option}`}
                                      className={`flex-1 cursor-pointer text-sm leading-relaxed min-w-0 ${
                                        isAnswered
                                          ? isCorrectOption
                                            ? "text-green-700 font-medium dark:text-green-400"
                                            : isSelected
                                            ? "text-red-700 dark:text-red-400"
                                            : "text-muted-foreground"
                                          : "text-foreground"
                                      }`}
                                    >
                                      {text}
                                    </Label>
                                    {isAnswered && isCorrectOption && (
                                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    )}
                                  </div>
                                );
                              })}
                            </RadioGroup>
                            
                            {/* Feedback */}
                            {isAnswered && (
                              <div className="mt-4 p-3 rounded-lg">
                                {isCorrect ? (
                                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                    <span>Correct! Well done.</span>
                                  </p>
                                ) : (
                                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <XCircle className="h-4 w-4 flex-shrink-0" />
                                    <span>Incorrect. The correct answer is option {mcq.correctOption}.</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Visual Separator between questions */}
                      {index < mcqs.length - 1 && (
                        <div className="flex items-center justify-center py-4">
                          <Separator className="flex-1" />
                          <div className="px-4">
                            <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
                          </div>
                          <Separator className="flex-1" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Final Progress Summary */}
                {isCompleted && (
                  <Card className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
                    <CardContent className="p-4 sm:p-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                        <h3 className="text-lg sm:text-xl font-bold">Quiz Completed!</h3>
                      </div>
                      <p className="text-base sm:text-lg font-semibold mb-2">
                        Final Score: <span className={score >= 70 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600"}>
                          {score.toFixed(1)}%
                        </span>
                      </p>
                      <p className="text-sm sm:text-base text-muted-foreground">
                        You answered {correctCount} out of {mcqs.length} questions correctly.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}