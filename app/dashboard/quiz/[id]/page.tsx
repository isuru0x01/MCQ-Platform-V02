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
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

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

        console.log('Fetched Resource Data:', resourceData);
        console.log('Fetched MCQ Data:', mcqData);

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
    const parsedAnswer = Number(answer);
    console.log(`Answer Changed - Question ID: ${questionId}, Selected Answer: ${parsedAnswer}`);
  
    setAnswers((prev) => {
      const newAnswers = { ...prev, [questionId]: parsedAnswer };
      const mcq = mcqs.find((m) => m.id === questionId);
  
      if (mcq) {
        const isCorrect = parsedAnswer === Number(mcq.correctOption);
        console.log(
            `Checking MCQ ID: ${mcq.id}, Answer: ${Number(newAnswers[mcq.id])}, Type: ${typeof newAnswers[mcq.id]}, Correct Option: ${mcq.correctOption}, Type: ${typeof mcq.correctOption}`
          );
  
        if (!prev[questionId]) {
          setAnsweredCount((prevCount) => prevCount + 1);
        }
  
        setCorrectCount((prevCorrect) => {
          if (prev[questionId] === mcq.correctOption && !isCorrect) return prevCorrect - 1;
          if (prev[questionId] !== mcq.correctOption && isCorrect) return prevCorrect + 1;
          return prevCorrect;
        });
  
        const correctAnswers = mcqs.reduce((acc, mcq) => {
          const selected = newAnswers[mcq.id] !== undefined ? Number(newAnswers[mcq.id]) : null;
          return acc + (selected === Number(mcq.correctOption) ? 1 : 0);
        }, 0);
  
        setScore((correctAnswers / mcqs.length) * 100);
      }
  
      return newAnswers;
    });
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
                onValueChange={(value) => handleAnswerChange(mcq.id, parseInt(value))}
                value={answers[mcq.id]?.toString()}
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
                        className={answers[mcq.id] ?
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
                        className={answers[mcq.id] ?
                        mcq.correctOption === option
                            ? "text-green-500 font-medium"
                            : answers[mcq.id] === option
                            ? "text-red-500"
                            : ""
                        : ""
                        }
                    >
                        {text}
                        {answers[mcq.id] && mcq.correctOption === option && (
                        <span className="ml-2 text-green-500">✓</span>
                        )}
                    </Label>
                    </div>
                ))}
    </RadioGroup>
    {answers[mcq.id] !== undefined &&
  Number(answers[mcq.id]) === Number(mcq.correctOption) && (
    <>
      {console.log(
        `Rendering Correct Message for Question ID: ${mcq.id}, Selected Answer: ${Number(
          answers[mcq.id]
        )}, Correct Option: ${mcq.correctOption}`
      )}
      <p className="text-sm text-green-500 mt-2">
        Correct! Well done.
      </p>
    </>
)}

{answers[mcq.id] !== undefined &&
  Number(answers[mcq.id]) !== Number(mcq.correctOption) && (
    <>
      {console.log(
        `Rendering Incorrect Message for Question ID: ${mcq.id}, Selected Answer: ${Number(
          answers[mcq.id]
        )}, Correct Option: ${mcq.correctOption}`
      )}
      <p className="text-sm text-red-500 mt-2">
        Incorrect. The correct answer is option {mcq.correctOption}.
      </p>
    </>
)}
  </div>
))}

            <div className="mt-4 p-4 rounded-lg bg-muted">
              <h3 className="font-semibold text-lg">
                Progress: {answeredCount}/{mcqs.length} Questions Answered
              </h3>
              <div className="w-full bg-secondary rounded-full h-2.5 mt-2">
                <div
                  className="bg-primary rounded-full h-2.5 transition-all duration-300"
                  style={{ width: `${(answeredCount / mcqs.length) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
