"use client"
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useUser } from "@clerk/nextjs";
import { supabaseClient } from "@/lib/supabaseClient";
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Plus, History, Trophy, BookOpen, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import placeholderImage from "@/public/placeholder.png";

interface Resource {
  id: number;
  url: string;
  type: 'youtube' | 'article' | 'document';
  title: string;
  image_url: string | null;
  createdAt: string;
  content: string;
}

export default function ResourcesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'youtube' | 'article' | 'document'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchResources() {
      if (!user) return;

      try {
        let query = supabaseClient
          .from('Resource')
          .select('*')
          .eq('userId', user.id.toString())
          .order('createdAt', { ascending: false });

        if (filter !== 'all') {
          query = query.eq('type', filter);
        }

        const { data, error } = await query;
        if (error) throw error;
        setResources(data || []);
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchResources();
  }, [user, filter]);

  const handleDelete = async (resourceId: number) => {
    try {
      // Call the stored procedure to delete the resource and associated data
      const { error } = await supabaseClient.rpc('delete_resource_and_associated_data', { resource_id: resourceId });
      if (error) throw error;
  
      // Update local state
      setResources(resources.filter(r => r.id !== resourceId));
  
      toast({
        title: "Success",
        description: "Resource deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast({
        title: "Error",
        description: "Failed to delete resource",
        variant: "destructive",
      });
    }
  };

  const filteredResources = resources.filter(resource =>
    resource.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'youtube':
        return '🎥';
      case 'article':
        return '📄';
      case 'document':
        return '📝';
      default:
        return '📄';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="w-full">
            <CardHeader>
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <main className="flex flex-col gap-2 lg:gap-2 min-h-[90vh] w-full">
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              You have no resources
            </h1>
            <p className="text-sm text-muted-foreground mb-3">
              Projects will show when you start submitting resources.
            </p>
            <Button>
              <Link className="btn btn-primary btn-lg btn-block" href="/dashboard/submit">
                Create New Resource
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Search Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-2xl w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                className="pl-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button asChild variant="default" size="sm" className="gap-2">
              <Link href="/dashboard/submit">
                <Plus className="h-4 w-4" />
                Add Resource
              </Link>
            </Button>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <Button
            variant={filter === 'all' ? "secondary" : "ghost"}
            className="gap-2"
            size="sm"
            onClick={() => setFilter('all')}
          >
            <BookOpen className="h-4 w-4" />
            All
          </Button>
          <Button
            variant={filter === 'youtube' ? "secondary" : "ghost"}
            className="gap-2"
            size="sm"
            onClick={() => setFilter('youtube')}
          >
            <History className="h-4 w-4" />
            Videos
          </Button>
          <Button
            variant={filter === 'article' ? "secondary" : "ghost"}
            className="gap-2"
            size="sm"
            onClick={() => setFilter('article')}
          >
            <Trophy className="h-4 w-4" />
            Articles
          </Button>
          <Button
            variant={filter === 'document' ? "secondary" : "ghost"}
            className="gap-2"
            size="sm"
            onClick={() => setFilter('document')}
          >
            <Filter className="h-4 w-4" />
            Documents
          </Button>
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredResources.map((resource) => (
            <Card key={resource.id} className="overflow-hidden hover:bg-accent transition-colors group relative">
              {/* Delete Button with AlertDialog */}
              <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the resource "{resource.title}" and all associated data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(resource.id);
                        }}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <Link href={`/dashboard/quiz/${resource.id}`} >
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
                  <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-blue-600">
                    {resource.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{getTypeIcon(resource.type)} {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}</span>
                    <span>•</span>
                    <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredResources.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No resources found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? "Try adjusting your search terms"
                : "Start by adding your first learning resource"}
            </p>
            <Button asChild>
              <Link href="/dashboard/submit">
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
