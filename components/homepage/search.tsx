"use client";

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search as SearchIcon } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { useDebounce } from '@/hooks/use-debounce';

interface Resource {
  id: number;
  title: string;
  type: 'youtube' | 'article' | 'document';
  image_url: string | null;
  createdAt: string;
}

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    async function performSearch() {
      if (!debouncedSearch.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabaseClient
          .from('Resource')
          .select('*')
          .ilike('title', `%${debouncedSearch}%`)
          .order('createdAt', { ascending: false })
          .limit(8);

        if (error) throw error;
        setResults(data || []);
      } catch (error) {
        console.error('Error searching resources:', error);
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [debouncedSearch]);

  return (
    <div className="relative w-full max-w-2xl mx-auto px-4 py-6">
      {/* Add title and description */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Search Quizzes
        </h2>
        <p className="text-muted-foreground">
          Search for quizzes by title, topic, or content type.
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search quizzes..."
          className="pl-10 w-full"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
        />
      </div>

      {/* Search Results Dropdown */}
      {showResults && (searchQuery || loading) && (
        <div className="absolute mt-2 w-full bg-background border rounded-lg shadow-lg z-50">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-[70vh] overflow-y-auto">
              {results.map((resource) => (
                <Link 
                  key={resource.id} 
                  href={`/dashboard/quiz/${resource.id}`}
                  onClick={() => setShowResults(false)}
                >
                  <Card className="flex items-center p-3 hover:bg-accent transition-colors">
                    <div className="h-16 w-24 relative mr-3">
                      <Image
                        src={resource.image_url || '/images/default-placeholder.svg'}
                        alt={resource.title}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium line-clamp-1">{resource.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {resource.type === 'youtube' ? '🎥 Video' : 
                           resource.type === 'article' ? '📄 Article' : 
                           '📝 Document'}
                        </span>
                        <span>•</span>
                        <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="p-4 text-center text-muted-foreground">
              No results found
            </div>
          ) : null}
        </div>
      )}

      {/* Backdrop to close search results */}
      {showResults && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}