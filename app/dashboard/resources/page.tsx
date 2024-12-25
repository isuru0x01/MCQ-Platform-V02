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

interface Resource {
  id: number;
  url: string;
  type: 'youtube' | 'article';
  title: string;
  image_url: string | null;
  createdAt: string;
  content: string;
}

export default function ProjectsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResources() {
      if (!user) return;

      try {
        const { data, error } = await supabaseClient
          .from('Resource')
          .select('*')
          .eq('userId', user.id.toString())
          .order('createdAt', { ascending: false });

        if (error) throw error;
        setResources(data || []);
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchResources();
  }, [user]);

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
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Resources</h1>
        <Button>
          <Link href="/dashboard/submit">Create New Resource</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource) => (
          <Card key={resource.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="line-clamp-1">
                    {resource.title}
                  </CardTitle>
                  <CardDescription>
                    {new Date(resource.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <AlertDialog>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    asChild
                  >
                    <AlertDialogTrigger>
                      <Trash2 className="h-4 w-4" />
                    </AlertDialogTrigger>
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        resource and all associated quizzes and questions.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(resource.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              {resource.image_url ? (
                <div className="relative h-[200px] w-full mb-4">
                  <Image
                    src={resource.image_url}
                    alt="Resource thumbnail"
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
              ) : (
                <div className="h-[200px] bg-muted flex items-center justify-center rounded-md">
                  <p className="text-muted-foreground">No image available</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground line-clamp-3">
                {resource.content}
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href={resource.url} target="_blank">
                  View Source
                </Link>
              </Button>
              <Button variant="default" asChild>
                <Link href={`/dashboard/quiz/${resource.id}`}>
                  Take Quiz
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
