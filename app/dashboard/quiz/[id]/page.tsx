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
import { clerkClient } from '@/lib/clerk';

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
  quizId: number; // Ensure quizId is part of the MCQ interface
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
  const [quizId, setQuizId] = useState<number | null>(null); // Add quizId to state
  const [uploaderName, setUploaderName] = useState<string | null>(null);

  useEffect(() => {
    const fetchUploaderName = async () => {
      if (resource?.type === 'document' && resource.userId) {
        try {
          const response = await clerkClient.users.getUser(resource.userId);
          const name = [response.firstName, response.lastName].filter(Boolean).join(' ');
          setUploaderName(name || 'the user');
        } catch (error) {
          console.error('Error fetching uploader:', error);
          setUploaderName('the user');
        }
      }
    };
  
    fetchUploaderName();
  }, [resource]);

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
        setQuizId(quizId); // Store quizId in state

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
        quizId: quizId, // Use quizId from state
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
      setIsPerformanceSubmitted(true); // Prevent multiple submissions
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
      <div className="flex flex-col md:flex-row gap-6 p-6">
        <div className="w-full md:w-1/2">
          <Skeleton className="h-[400px] w-full" />
        </div>
        <div className="w-full md:w-1/2">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (!resource) {
    return <div>Resource not found</div>;
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

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6">
      <div className="w-full md:w-1/2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{resource.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {resource.type === "youtube" ? (
              <div className="relative pb-[56.25%] h-0">
                <iframe
                  src={getYouTubeEmbedUrl(resource.url)}
                  className="absolute top-0 left-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  
                />
              </div>
            ) : resource.type === "document" ? (
              // Show upload message only for documents
              <div className="prose max-w-none dark:prose-invert">
                <p>
                  The file is uploaded by{" "}
                  <span className="font-medium">
                    {uploaderName || "..."}
                  </span>
                </p>
              </div>
            ) : !["article", "document"].includes(resource.type) ? (
              // Show content only for non-article, non-document types
              <div className="prose max-w-none dark:prose-invert">
                {resource.content}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {resource.tutorial && (
          <Card>
            <CardHeader>
              <CardTitle>Tutorial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
                    p: ({ children }) => <p className="mb-4">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    code: ({ children }) => (
                      <code className="bg-muted px-1.5 py-0.5 rounded-md text-sm">{children}</code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary pl-4 italic mb-4">
                        {children}
                      </blockquote>
                    ),
                    a: ({ href, children }) => (
                      <a href={href} className="text-primary hover:underline">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {resource.tutorial
                  .replace(/^```(markdown)?\s*/, '') // Remove starting ```markdown or ```
                  .replace(/\s*```$/, '')}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="w-full md:w-1/2">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Quiz</span>
              <div className="text-sm font-normal">
                <span className="font-medium">Score: {score.toFixed(1)}%</span>
                <span className="mx-2">•</span>
                <span className="text-muted-foreground">
                  {correctCount}/{mcqs.length} Correct
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {mcqs.map((mcq, index) => (
              <div key={mcq.id} className="space-y-4">
                <h3 className="font-medium">
                  {index + 1}. {mcq.question}
                </h3>
                <RadioGroup
                  onValueChange={(value) => handleAnswerChange(mcq.id, value)}
                  value={answers[mcq.id]}
                >
                  {[
                    { option: 1, text: mcq.optionA },
                    { option: 2, text: mcq.optionB },
                    { option: 3, text: mcq.optionC },
                    { option: 4, text: mcq.optionD },
                  ].map(({ option, text }) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={option.toString()}
                        id={`q${mcq.id}-o${option}`}
                        className={
                          answers[mcq.id]
                            ? mcq.correctOption.toString() === option.toString()
                              ? "border-green-500"
                              : answers[mcq.id] === option.toString()
                              ? "border-red-500"
                              : ""
                            : ""
                        }
                      />
                      <Label
                        htmlFor={`q${mcq.id}-o${option}`}
                        className={
                          answers[mcq.id]
                            ? mcq.correctOption.toString() === option.toString()
                              ? "text-green-500 font-medium"
                              : answers[mcq.id] === option.toString()
                              ? "text-red-500"
                              : ""
                            : ""
                        }
                      >
                        {text}
                        {answers[mcq.id] && mcq.correctOption.toString() === answers[mcq.id] && (
                          <span className="ml-2 text-green-500">✓</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {answers[mcq.id] !== undefined &&
                  answers[mcq.id] === mcq.correctOption.toString() && (
                    <p className="text-sm text-green-500 mt-2">Correct! Well done.</p>
                  )}
                {answers[mcq.id] !== undefined &&
                  answers[mcq.id] !== mcq.correctOption.toString() && (
                    <p className="text-sm text-red-500 mt-2">
                      Incorrect. The correct answer is option {mcq.correctOption}.
                    </p>
                  )}
              </div>
            ))}

            <div className="mt-4 p-4 rounded-lg bg-muted">
              <h3 className="font-semibold text-lg">
                Progress: {Object.keys(answers).length}/{mcqs.length} Questions Answered
              </h3>
              <div className="w-full bg-secondary rounded-full h-2.5 mt-2">
                <div
                  className="bg-primary rounded-full h-2.5 transition-all duration-300"
                  style={{ width: `${(Object.keys(answers).length / mcqs.length) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}