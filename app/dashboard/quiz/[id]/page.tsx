"use client";

import React, { useEffect, useState } from "react";
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
import { Trophy, Clock, CheckCircle2, XCircle, BookOpen, Focus, Lock } from "lucide-react";
import Link from "next/link";
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

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

const MathRenderer = ({ text, display = false }: { text: React.ReactNode; display?: boolean }) => {
  if (!text) return null;
  
  // If text is a React element, return it as is
  if (React.isValidElement(text)) {
    return text;
  }
  
  // Convert to string if it's a React node
  const content = typeof text === 'string' ? text : String(text);
  const cleanText = content.trim();
  
  try {
    // Handle raw LaTeX (with or without 'math' prefix)
    if (cleanText.startsWith('math ')) {
      // Get pure LaTeX without the 'math' prefix
      const latexContent = cleanText.slice(5).trim();
      return display ? <BlockMath math={latexContent} /> : <InlineMath math={latexContent} />;
    }
    
    // If it looks like LaTeX (has commands or special chars), render it directly
    if (cleanText.includes('\\') || cleanText.includes('_') || 
        cleanText.includes('^') || cleanText.includes('{')) {
      return display ? <BlockMath math={cleanText} /> : <InlineMath math={cleanText} />;
    }
    
    // Handle LaTeX expressions with delimiters
    if ((cleanText.startsWith('$') && cleanText.endsWith('$')) ||
        (cleanText.startsWith('\\(') && cleanText.endsWith('\\)')) ||
        (cleanText.startsWith('\\[') && cleanText.endsWith('\\]'))) {
      const mathExp = cleanText.replace(/^\$|\$$|^\\\(|\\\)$|^\\\[|\\\]$/g, '');
      return display ? <BlockMath math={mathExp} /> : <InlineMath math={mathExp} />;
    }
    
    // Handle raw LaTeX without delimiters (but only if it contains LaTeX commands)
    if ((cleanText.includes('\\') || cleanText.includes('_') || cleanText.includes('^') || 
         cleanText.includes('{') || cleanText.includes('}')) &&
        // Don't treat URLs or other common patterns as math
        !cleanText.startsWith('http') && !cleanText.includes(' ') && cleanText.length < 100) {
      return display ? <BlockMath math={cleanText} /> : <InlineMath math={cleanText} />;
    }
    
    return <>{content}</>;
  } catch (error) {
    console.error('Error rendering math:', error);
    return <span className="text-red-500">Error rendering: {content}</span>;
  }
};

const MarkdownWithAutoMath = ({ content }: { content: string }) => {  // Process content to handle math expressions
  const processContent = (content: string) => {
    // Pre-process the content to handle multi-line math expressions
    return content.replace(/math\s+([\s\S]+?)(?=\n\n|$)/g, (match, formula) => {
      return `math ${formula.replace(/\n/g, ' ')}`;
    });
  };

  return (
    <div className="prose dark:prose-invert max-w-none text-sm sm:text-base overflow-x-auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers
          h1: ({ children }) => <h1 className="text-2xl font-bold my-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold my-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold my-2">{children}</h3>,
            // Paragraphs with inline math support
          p: ({ children }) => {
            if (!children) return null;
            
            // Convert children to an array and process each part
            const processChildren = (nodes: React.ReactNode): React.ReactNode => {
              return React.Children.map(nodes, (child, i) => {
                if (typeof child === 'string') {
                  // Split into segments that start with 'math' and those that don't
                  const segments = child.split(/(math\s+[^$]*?(?=\s*(?:math\s|$)))/g);
                  
                  return segments.map((segment, idx) => {
                    // Handle math segments
                    if (segment.startsWith('math ')) {
                      const mathContent = segment.slice(5).trim();
                      return <MathRenderer key={`${i}-${idx}`} text={mathContent} display={false} />;
                    }
                    // Handle regular text segments
                    return segment ? <span key={`${i}-${idx}`}>{segment}</span> : null;
                  });
                }
                return child;
              });
            };
            
            return <p className="my-4">{processChildren(children)}</p>;
          },
          
          // Lists
          ul: ({ children }) => <ul className="list-disc pl-6 my-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 my-4">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          
          // Code blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            
            if (inline) {
              return <code className="bg-muted px-1.5 py-0.5 rounded text-xs sm:text-sm">{children}</code>;
            }
            
            const code = String(children).replace(/\n$/, '');
            if (match?.[1] === 'math' || className === 'language-math') {
              return <BlockMath math={code} />;
            }
            
            return (
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4 text-xs sm:text-sm">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic my-4">
              {children}
            </blockquote>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a href={href} className="text-primary hover:underline break-words" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          
          // Horizontal Rule
          hr: () => <hr className="my-6 border-t border-border" />,
          
          // Inline elements
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {processContent(content)}
      </ReactMarkdown>
    </div>
  );
};

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
  const [allQuestionsAnswered, setAllQuestionsAnswered] = useState(false);
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

  // In the QuizPage component, add this near the top of the component body
  
  // Add this after the existing state declarations
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  
  // Modify the handleAnswerChange function to check for authentication
  const handleAnswerChange = (questionId: number, answer: string) => {
    if (!user) {
      setShowAuthPrompt(true);
      toast({
        title: "Authentication Required",
        description: "Please sign in to take this quiz and track your progress.",
        variant: "destructive",
      });
      return;
    }
    
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };
  
  // Add this JSX right before the quiz questions section in the return statement
  // Add this inside the Quiz Section Card, right after <CardContent className="space-y-6 sm:space-y-8">
  {!user && (
    <div className="mb-6 p-4 border border-primary/20 bg-primary/5 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-medium text-base sm:text-lg mb-1">Sign in to take this quiz</h3>
          <p className="text-sm text-muted-foreground mb-3">
            You can view this quiz content, but you need to sign in to answer questions and track your progress.
          </p>
          <div className="flex gap-3">
            <Button asChild variant="default">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sign-up">Create Account</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )}

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  // Calculate if all questions are answered
  useEffect(() => {
    setAllQuestionsAnswered(Object.keys(answers).length === mcqs.length);
  }, [answers, mcqs.length]);

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
                  <div className="max-w-xs sm:max-w-md lg:max-w-lg overflow-hidden">
                    <h1
                      className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate whitespace-nowrap"
                      title={resource.title}
                    >
                      {resource.title}
                    </h1>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleTutorial}
                    className="flex items-center gap-2 text-xs sm:text-sm transition-all duration-200 hover:bg-primary/10 rounded-full"
                  >
                    {tutorialCollapsed ? (
                      <>
                        <BookOpen className="h-4 w-4" />
                        <span className="hidden sm:inline">View Tutorial</span>
                        <span className="sm:hidden">Content</span>
                      </>
                    ) : (
                      <>
                        <Focus className="h-4 w-4" />
                        <span className="hidden sm:inline">Quiz Only</span>
                        <span className="sm:hidden">Quiz</span>
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
                  <MarkdownWithAutoMath content={resource.tutorial} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quiz Section */}
          <div className={`transition-all duration-300 ${
            tutorialCollapsed 
              ? 'w-full max-w-5xl mx-auto' 
              : 'w-full xl:w-1/2'
          }`}>
            <Card className="shadow-xl border-0 bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-4">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-lg sm:text-xl">Quiz Questions</span>
                  <Badge variant={isCompleted ? "default" : "secondary"} className="self-start sm:self-center">
                    {Object.keys(answers).length}/{mcqs.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8 relative">
                {/* Auth Overlay for Quiz Section */}
                {!user && (
                  <div className="absolute inset-0 backdrop-blur-md z-10 flex items-center justify-center">
                    <div className="bg-background/95 p-6 rounded-lg shadow-lg max-w-md mx-auto text-center">
                      <Lock className="h-12 w-12 mx-auto mb-4 text-primary/70" />
                      <h3 className="text-xl font-bold mb-2">Sign in to access the quiz</h3>
                      <p className="text-muted-foreground mb-6">
                        You can view the tutorial content, but you need to sign in to take the quiz and track your progress.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button asChild variant="default">
                          <Link href="/sign-in">Sign In</Link>
                        </Button>
                        <Button asChild variant="outline">
                          <Link href="/sign-up">Create Account</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Remove the existing sign-in prompt since we now have the overlay */}
                {/* {!user && (
                  <div className="mb-6 p-4 border border-primary/20 bg-primary/5 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-base sm:text-lg mb-1">Sign in to take this quiz</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          You can view this quiz content, but you need to sign in to answer questions and track your progress.
                        </p>
                        <div className="flex gap-3">
                          <Button asChild variant="default">
                            <Link href="/sign-in">Sign In</Link>
                          </Button>
                          <Button asChild variant="outline">
                            <Link href="/sign-up">Create Account</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )} */}
                
                {/* Quiz Questions - Apply blur class when user is not logged in */}
                <div className={!user ? 'filter blur-sm pointer-events-none' : ''}>
                  {mcqs.map((mcq, index) => {
                    const isAnswered = answers[mcq.id] !== undefined;
                    const isCorrect = isAnswered && answers[mcq.id] === mcq.correctOption.toString();
                    // Disable the question if it's answered and not all questions are completed
                    const isDisabled = isAnswered && !allQuestionsAnswered;
                    
                    return (
                      <div key={mcq.id}>
                        {/* Question Card with Enhanced Styling */}
                        <Card className={`shadow-md border border-border/50 hover:shadow-lg transition-all duration-200 ${
                          isDisabled ? 'opacity-75 cursor-not-allowed' : ''
                        }`}>
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
                              disabled={isDisabled}
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
                                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                                      isDisabled 
                                        ? 'cursor-not-allowed' 
                                        : 'hover:bg-muted/50'
                                    } ${
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
                                      disabled={isDisabled}
                                      className={`mt-0.5 flex-shrink-0 ${
                                        isAnswered
                                          ? isCorrectOption
                                            ? "border-green-500 text-green-500"
                                            : isSelected
                                            ? "border-red-500 text-red-500"
                                            : ""
                                          : ""
                                      } ${
                                        isDisabled ? 'cursor-not-allowed opacity-60' : ''
                                      }`}
                                    />
                                    <Label
                                      htmlFor={`q${mcq.id}-o${option}`}
                                      className={`flex-1 text-sm leading-relaxed min-w-0 ${
                                        isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                                      } ${
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
                            
                            {/* Answer Feedback */}
                            {isAnswered && (
                              <div className={`mt-4 p-3 rounded-lg border-l-4 ${
                                isCorrect
                                  ? "bg-green-50 border-green-400 dark:bg-green-950/20"
                                  : "bg-red-50 border-red-400 dark:bg-red-950/20"
                              }`}>
                                <div className="flex items-center gap-2">
                                  {isCorrect ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  )}
                                  <span className={`text-sm font-medium ${
                                    isCorrect ? "text-green-800 dark:text-green-400" : "text-red-800 dark:text-red-400"
                                  }`}>
                                    {isCorrect ? "Correct!" : "Incorrect"}
                                  </span>
                                </div>
                                {!isCorrect && (
                                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                    The correct answer is: {[
                                      mcq.optionA,
                                      mcq.optionB,
                                      mcq.optionC,
                                      mcq.optionD,
                                    ][mcq.correctOption - 1]}
                                  </p>
                                )}
                                {!allQuestionsAnswered && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    This question is now locked. Complete all questions and review your answers.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Visual Separator */}
                      {index < mcqs.length - 1 && (
                        <Separator className="my-6 sm:my-8" />
                      )}
                    </div>
                  );
                })}
                </div>
                
                {/* Progress Summary */}
                {isCompleted && (
                  <Card className="mt-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
                    <CardContent className="p-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                        <h3 className="text-xl font-bold">Quiz Completed!</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-primary">{correctCount}</div>
                          <div className="text-sm text-muted-foreground">Correct Answers</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-primary">{mcqs.length}</div>
                          <div className="text-sm text-muted-foreground">Total Questions</div>
                        </div>
                        <div>
                          <div className={`text-2xl font-bold ${
                            score >= 70 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600"
                          }`}>
                            {score.toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Final Score</div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">
                        All questions are now unlocked for review. You can change your answers if needed.
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

const MathComponent = ({ math, display = false }: { math: string; display?: boolean }) => {
  try {
    return display ? <BlockMath math={math} /> : <InlineMath math={math} />;
  } catch (error) {
    console.error('Error rendering math:', error);
    return <span className="text-red-500">Error rendering math expression</span>;
  }
};