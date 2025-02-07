"use client";

import { TITLE_TAILWIND_CLASS } from '@/utils/constants';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Trophy } from 'lucide-react';

export default function BlogSample() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'recent' | 'top'>('recent');

  useEffect(() => {
    async function fetchQuizzes() {
      try {
        if (activeFilter === 'top') {
          // Fetch top performing quizzes
          const { data: performanceData, error: perfError } = await supabaseClient
            .from("Performance")
            .select("quizId, correctAnswers, totalQuestions")
            .order("correctAnswers", { ascending: false })
            .limit(12);

          if (perfError) throw perfError;

          // Get unique quiz IDs
          const quizIds = [...new Set(performanceData.map(p => p.quizId))];

          // Fetch quizzes for these IDs
          const { data, error } = await supabaseClient
            .from('Quiz')
            .select(`
              id,
              createdAt,
              Resource (
                id,
                url,
                type,
                title,
                content,
                image_url
              )
            `)
            .in('id', quizIds);

          if (error) throw error;
          setQuizzes(data || []);
        } else {
          // Fetch recent quizzes
          const { data, error } = await supabaseClient
            .from('Quiz')
            .select(`
              id,
              createdAt,
              Resource (
                id,
                url,
                type,
                title,
                content,
                image_url
              )
            `)
            .order('createdAt', { ascending: false })
            .limit(12);

          if (error) throw error;
          setQuizzes(data || []);
        }
      } catch (error) {
        console.error('Error fetching quizzes:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchQuizzes();
  }, [activeFilter]);

  if (loading) {
    return <div>Loading quizzes...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Navigation Pills */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <Button 
          variant={activeFilter === 'recent' ? "secondary" : "ghost"} 
          className="gap-2" 
          size="sm"
          onClick={() => setActiveFilter('recent')}
        >
          <History className="h-4 w-4" />
          Recent
        </Button>
        <Button 
          variant={activeFilter === 'top' ? "secondary" : "ghost"} 
          className="gap-2" 
          size="sm"
          onClick={() => setActiveFilter('top')}
        >
          <Trophy className="h-4 w-4" />
          Top Performing
        </Button>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {quizzes.map((quiz) => (
          <Link href={`/dashboard/quiz/${quiz.Resource.id}`} key={quiz.id}>
            <Card className="overflow-hidden hover:bg-accent transition-colors group">
              {/* Thumbnail */}
              <div className="aspect-video relative overflow-hidden bg-muted">
                <Image
                  src={quiz.Resource.image_url 
                    ? quiz.Resource.image_url 
                    : quiz.Resource.type === 'youtube' 
                      ? '/images/youtube-icon.svg'
                      : '/images/default-placeholder.svg'}
                  alt={quiz.Resource.title}
                  fill
                  className="object-cover"
                />
              </div>
              
              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold line-clamp-2 mb-1 group-hover:text-blue-600">
                  {quiz.Resource.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {quiz.Resource.type === 'youtube' ? '🎥 Video' : 
                     quiz.Resource.type === 'article' ? '📄 Article' : 
                     '📝 Document'}
                  </span>
                  <span>•</span>
                  <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {quizzes.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No quizzes available</h3>
          <p className="text-muted-foreground mb-4">
            Check back later for new content
          </p>
        </div>
      )}
    </div>
  );
}