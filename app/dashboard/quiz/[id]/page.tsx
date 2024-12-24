"use client"

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Resource {
  id: number;
  title: string;
  url: string;
  type: 'youtube' | 'article';
  content: string;
  image_url: string | null;
}

interface MCQ {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: number;
}

export default function QuizPage() {
  const params = useParams();
  const { toast } = useToast();
  const [resource, setResource] = useState<Resource | null>(null);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    async function fetchQuizData() {
      try {
        // Fetch resource details
        const { data: resourceData, error: resourceError } = await supabaseClient
          .from('Resource')
          .select('*')
          .eq('id', params.id)
          .single();

        if (resourceError) throw resourceError;

        // Fetch MCQs
        const { data: mcqData, error: mcqError } = await supabaseClient
          .from('MCQ')
          .select('*')
          .eq('quizId', params.id);

        if (mcqError) throw mcqError;

        setResource(resourceData);
        setMcqs(mcqData || []);
      } catch (error) {
        console.error('Error fetching quiz data:', error);
        toast({
          title: "Error",
          description: "Failed to load quiz",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchQuizData();
  }, [params.id, toast]);

  const handleAnswerChange = (questionId: number, answer: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = () => {
    const totalQuestions = mcqs.length;
    const correctAnswers = mcqs.reduce((acc, mcq) => {
      return acc + (answers[mcq.id] === mcq.correctOption ? 1 : 0);
    }, 0);
    
    setScore((correctAnswers / totalQuestions) * 100);
    setShowResults(true);
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

  return (
    <div className="flex flex-col md:flex-row gap-6 p-6">
      {/* Left Panel - Video/Article */}
      <div className="w-full md:w-1/2">
        <Card>
          <CardHeader>
            <CardTitle>{resource.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {resource.type === 'youtube' ? (
              <div className="relative pb-[56.25%] h-0">
                <iframe
                  src={getYouTubeEmbedUrl(resource.url)}
                  className="absolute top-0 left-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="prose max-w-none dark:prose-invert">
                {resource.content}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Quiz */}
      <div className="w-full md:w-1/2">
        <Card>
          <CardHeader>
            <CardTitle>Quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {mcqs.map((mcq, index) => (
              <div key={mcq.id} className="space-y-4">
                <h3 className="font-medium">
                  {index + 1}. {mcq.question}
                </h3>
                <RadioGroup
                  onValueChange={(value) => handleAnswerChange(mcq.id, parseInt(value))}
                  disabled={showResults}
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
                        className={showResults ? 
                          mcq.correctOption === option 
                            ? "border-green-500" 
                            : answers[mcq.id] === option 
                              ? "border-red-500" 
                              : ""
                          : ""
                        }
                      />
                      <Label
                        htmlFor={`q${mcq.id}-o${option}`}
                        className={showResults ?
                          mcq.correctOption === option
                            ? "text-green-500"
                            : answers[mcq.id] === option
                              ? "text-red-500"
                              : ""
                          : ""
                        }
                      >
                        {text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}

            {!showResults ? (
              <Button 
                onClick={handleSubmit}
                disabled={Object.keys(answers).length !== mcqs.length}
                className="w-full mt-4"
              >
                Submit Quiz
              </Button>
            ) : (
              <div className="mt-4 p-4 rounded-lg bg-muted">
                <h3 className="font-semibold text-lg">
                  Your Score: {score.toFixed(1)}%
                </h3>
                <p className="text-sm text-muted-foreground">
                  Correct Answers: {mcqs.reduce((acc, mcq) => acc + (answers[mcq.id] === mcq.correctOption ? 1 : 0), 0)}
                  /{mcqs.length}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 