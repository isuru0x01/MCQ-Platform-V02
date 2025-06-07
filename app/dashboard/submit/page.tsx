"use client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { supabaseClient } from "@/lib/supabaseClient";
import { useState, useCallback } from "react";
import { extractYouTubeTranscription, scrapeArticleContent } from "@/lib/utils";
import { generateMCQs, generateTitle, generateTutorial } from "@/lib/ai";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, Link2, FileText, Youtube, Globe, ClipboardCopy } from "lucide-react";
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { checkUserLimits, decrementProPoints } from "@/app/actions/checkUserLimits";

export const maxDuration = 60;

// Define separate schemas
const UrlFormSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

const TextFormSchema = z.object({
  text: z.string()
    .min(100, "Text must be at least 100 characters long")
    .max(50000, "Text must not exceed 50,000 characters"),
});

export default function SubmitNewURL() {
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upload' | 'link' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isWebsiteDialogOpen, setIsWebsiteDialogOpen] = useState(false);
  const [isYoutubeDialogOpen, setIsYoutubeDialogOpen] = useState(false);
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Create separate form instances
  const websiteForm = useForm<z.infer<typeof UrlFormSchema>>({
    resolver: zodResolver(UrlFormSchema),
    defaultValues: { url: "" },
  });

  const youtubeForm = useForm<z.infer<typeof UrlFormSchema>>({
    resolver: zodResolver(UrlFormSchema),
    defaultValues: { url: "" },
  });

  const textForm = useForm<z.infer<typeof TextFormSchema>>({
    resolver: zodResolver(TextFormSchema),
    defaultValues: { text: "" },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload files",
        variant: "destructive",
      });
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      // Check file size (1MB = 1024 * 1024 bytes)
      const maxSizeInBytes = 1024 * 1024; // 1MB
      if (file.size > maxSizeInBytes) {
        toast({
          title: "File Too Large",
          description: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds the 1MB limit. Please choose a smaller file.`,
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setIsProcessing(true); // Set processing state
      await handleFileUpload(file);
      setIsProcessing(false); // Reset processing state
      setSelectedFile(null); // Reset selected file
    }
  }, [user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
    },
    multiple: false,
    disabled: !user?.id || isProcessing // Disable when processing
  });

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      
      // Initial feedback
      toast({
        title: "Upload Started",
        description: `Processing ${file.name}...`,
      });

      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in to upload files",
          variant: "destructive",
        });
        return;
      }

      // Check user limits
      const limitCheck = await checkUserLimits(user.emailAddresses[0].emailAddress);
      
      if (!limitCheck.canSubmit) {
        toast({
          title: "Submission Limit Reached",
          description: limitCheck.message,
          variant: "destructive",
        });
        return;
      }

      // File upload feedback
      toast({
        title: "Extracting Content",
        description: "Reading and processing file contents...",
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const data = await response.json();

      // MCQ Generation feedback
      toast({
        title: "Generating Questions",
        description: "Creating MCQs from content...",
      });

      // Create resource
      const { data: resource, error: resourceError } = await supabaseClient
        .from("Resource")
        .insert([{
          title: data.title,
          content: data.content,
          type: 'document',
          url: '',
          userId: user.id,
          createdAt: new Date().toISOString()
        }])
        .select()
        .single();

      if (resourceError) {
        console.error("Resource creation error:", resourceError);
        throw resourceError;
      }

      console.log("Resource created:", resource);

      const mcqs = await generateMCQs(data.content);

      const { error: quizError, data: quizData } = await supabaseClient
        .from("Quiz")
        .insert([{
          resourceId: resource.id,
          userId: user.id.toString(),
        }])
        .select()
        .single();

      if (quizError) throw quizError;

      const mcqData = mcqs.map((mcq) => ({
        quizId: quizData.id,
        question: mcq.question,
        optionA: mcq.options[0],
        optionB: mcq.options[1],
        optionC: mcq.options[2],
        optionD: mcq.options[3],
        correctOption: mcq.options.indexOf(mcq.correct_answer) + 1,
      }));

      const { error: mcqError } = await supabaseClient
        .from("MCQ")
        .insert(mcqData);

      if (mcqError) throw mcqError;

      // Tutorial Generation feedback
      toast({
        title: "Creating Tutorial",
        description: "Generating comprehensive tutorial...",
      });

      const tutorial = await generateTutorial(data.content);
      const { error: tutorialError } = await supabaseClient
        .from("Resource")
        .update({ tutorial })
        .eq('id', resource.id);

      if (tutorialError) {
        console.error("Tutorial Error:", tutorialError);
        throw tutorialError;
      }

      toast({
        title: "Success!",
        description: "File processed successfully. Redirecting to quiz...",
      });

      // After successful submission, decrement points for pro users
      if (limitCheck.isPro) {
        await decrementProPoints(user.emailAddresses[0].emailAddress);
      }

      router.push(`/dashboard/quiz/${resource.id}`);

    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  async function onSubmit(data: z.infer<typeof UrlFormSchema>) {
    console.log("[onSubmit] Function started with data:", data); // Log function start

    // No need to check !data.url here as the schema enforces it
    // The zodResolver will prevent submission if the URL is invalid

    try {
      setLoading(true);
      console.log("[onSubmit] Loading state set to true");

      const { url } = data; // Directly destructure url
      console.log("[onSubmit] Processing URL:", url);

      if (!user) {
        console.log("[onSubmit] User not authenticated. Exiting."); // Log auth failure
        toast({
          title: "Authentication Error",
          description: "Please log in to submit content.",
          variant: "destructive",
        });
        setLoading(false); // Ensure loading is reset if we exit early
        return;
      }
      console.log("[onSubmit] User authenticated:", user.id); // Log auth success

      // Check user limits
      console.log("[onSubmit] Checking user limits for:", user.emailAddresses[0].emailAddress); // Log limit check start
      const limitCheck = await checkUserLimits(user.emailAddresses[0].emailAddress);
      console.log("[onSubmit] Limit check result:", limitCheck); // Log limit check result
      
      if (!limitCheck.canSubmit) {
        console.log("[onSubmit] Submission limit reached. Exiting."); // Log limit check failure
        toast({
          title: "Submission Limit Reached",
          description: limitCheck.message,
          variant: "destructive",
        });
        setLoading(false); // Ensure loading is reset
        return;
      }

      toast({
        title: "Processing",
        description: "Extracting content from URL...",
      });
      console.log("[onSubmit] Starting content extraction fetch for:", url); // Log fetch start

      // Step 1: Extract content from the URL
      const extractResponse = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      console.log("[onSubmit] Extract API response status:", extractResponse.status); // Log API response status

      if (!extractResponse.ok) {
        const errorText = await extractResponse.text();
        console.error("[onSubmit] Extract API error response text:", errorText); // Log raw error text
        let errorJson;
        try {
          errorJson = JSON.parse(errorText);
        } catch (e) {
          console.error("[onSubmit] Failed to parse error response as JSON");
          errorJson = { error: 'Failed to extract content and received non-JSON error response' };
        }
        throw new Error(errorJson.error || 'Failed to extract content');
      }

      const { content, imageUrl, title } = await extractResponse.json();
      console.log("[onSubmit] Content extracted successfully. Title:", title, "Image URL:", imageUrl); // Log extraction success
      // console.log("[onSubmit] Extracted content snippet:", content?.substring(0, 200)); // Optional: Log content snippet

      // Step 2: Determine the type of content
      const type = url.includes("youtube.com") || url.includes("youtu.be") ? "youtube" : "article";
      console.log("[onSubmit] Determined resource type:", type); // Log resource type

      // Step 3: Save the resource to the database
      console.log("[onSubmit] Inserting resource into database..."); // Log DB insert start
      const { data: resource, error: resourceError } = await supabaseClient
        .from("Resource")
        .insert([{
          url,
          type,
          title,
          content,
          image_url: imageUrl,
          userId: user.id.toString(),
        }])
        .select("id")
        .single();

      if (resourceError) {
        console.error("[onSubmit] Supabase resource insert error:", resourceError); // Log DB error
        throw resourceError;
      }
      console.log("[onSubmit] Resource inserted successfully. ID:", resource.id); // Log DB insert success

      // Step 4: Generate MCQs
      toast({
        title: "Generating Questions",
        description: "Using AI to create MCQs...",
      });
      console.log("[onSubmit] Generating MCQs..."); // Log MCQ generation start
      const mcqs = await generateMCQs(content);
      console.log(`[onSubmit] Generated ${mcqs.length} MCQs.`); // Log MCQ generation end

      // Step 5: Create a quiz entry in the database
      console.log("[onSubmit] Inserting quiz into database..."); // Log quiz insert start
      const { error: quizError, data: quizData } = await supabaseClient
        .from("Quiz")
        .insert([{
          resourceId: resource.id,
          userId: user.id.toString(),
        }])
        .select("id")
        .single();

      if (quizError) {
        console.error("[onSubmit] Supabase quiz insert error:", quizError); // Log quiz insert error
        throw quizError;
      }
      const quizId = quizData.id;
      console.log("[onSubmit] Quiz inserted successfully. ID:", quizId); // Log quiz insert success

      // Step 6: Transform MCQs and insert them
      const mcqData = mcqs.map((mcq) => ({
        quizId: quizId,
        question: mcq.question,
        optionA: mcq.options[0],
        optionB: mcq.options[1],
        optionC: mcq.options[2],
        optionD: mcq.options[3],
        correctOption: mcq.options.indexOf(mcq.correct_answer) + 1,
      }));
      console.log("[onSubmit] Inserting MCQs into database..."); // Log MCQ insert start
      const { error: mcqError } = await supabaseClient
        .from("MCQ")
        .insert(mcqData);

      if (mcqError) {
        console.error("[onSubmit] Supabase MCQ insert error:", mcqError); // Log MCQ insert error
        throw mcqError;
      }
      console.log("[onSubmit] MCQs inserted successfully."); // Log MCQ insert success

      // Step 7: Generate and store tutorial
      toast({
        title: "Generating Tutorial",
        description: "Creating a comprehensive tutorial...",
      });
      console.log("[onSubmit] Generating tutorial..."); // Log tutorial generation start
      const tutorial = await generateTutorial(content, title);
      console.log("[onSubmit] Tutorial generated. Updating resource..."); // Log tutorial update start

      const { error: tutorialError } = await supabaseClient
        .from("Resource")
        .update({ tutorial: tutorial })
        .eq('id', resource.id);

      if (tutorialError) {
        console.error("[onSubmit] Supabase tutorial update error:", tutorialError); // Log tutorial update error
        throw tutorialError;
      }
      console.log("[onSubmit] Tutorial updated successfully."); // Log tutorial update success

      // Reset forms and close dialogs
      console.log("[onSubmit] Resetting forms and closing dialogs..."); // Log cleanup start
      websiteForm.reset();
      youtubeForm.reset();
      setIsWebsiteDialogOpen(false);
      setIsYoutubeDialogOpen(false);
      console.log("[onSubmit] Forms reset and dialogs closed."); // Log cleanup end

      // Decrement points if applicable
      if (limitCheck.isPro) {
        console.log("[onSubmit] Decrementing pro points for:", user.emailAddresses[0].emailAddress); // Log points decrement
        await decrementProPoints(user.emailAddresses[0].emailAddress);
      }

      console.log("[onSubmit] Navigating to quiz page:", `/dashboard/quiz/${resource.id}`); // Log navigation
      router.push(`/dashboard/quiz/${resource.id}`);

    } catch (error) {
      console.error("[onSubmit] Error caught in onSubmit:", error); // Log caught error
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log("[onSubmit] Loading state set to false in finally block."); // Log final loading state
    }
  }

  async function handleTextSubmit(data: z.infer<typeof TextFormSchema>) {
    console.log("handleTextSubmit called with:", data); // Debug log

    try {
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to submit content.",
          variant: "destructive",
        });
        return;
      }

      if (!data.text) {
        toast({
          title: "Error",
          description: "Please provide some text",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      const content = data.text;
      
      // Show processing toast
      toast({
        title: "Processing",
        description: "Generating title and MCQs...",
      });

      const title = await generateTitle(content);

      // Save to database
      const { data: resource, error: resourceError } = await supabaseClient
        .from("Resource")
        .insert([{
          title,
          content,
          type: 'document',
          url: '',
          userId: user.id.toString(),
        }])
        .select()
        .single();

      if (resourceError) throw resourceError;

      // Generate MCQs
      const mcqs = await generateMCQs(content);

      // Create quiz
      const { error: quizError, data: quizData } = await supabaseClient
        .from("Quiz")
        .insert([{
          resourceId: resource.id,
          userId: user.id.toString(),
        }])
        .select()
        .single();

      if (quizError) throw quizError;

      // Save MCQs
      const mcqData = mcqs.map((mcq) => ({
        quizId: quizData.id,
        question: mcq.question,
        optionA: mcq.options[0],
        optionB: mcq.options[1],
        optionC: mcq.options[2],
        optionD: mcq.options[3],
        correctOption: mcq.options.indexOf(mcq.correct_answer) + 1,
      }));

      const { error: mcqError } = await supabaseClient
        .from("MCQ")
        .insert(mcqData);

      if (mcqError) throw mcqError;

      // Generate and save tutorial
      const tutorial = await generateTutorial(content);
      const { error: tutorialError } = await supabaseClient
        .from("Resource")
        .update({ tutorial })
        .eq('id', resource.id);

      if (tutorialError) throw tutorialError;

      textForm.reset();
      toast({
        title: "Success!",
        description: "Text processed successfully.",
      });

      router.push(`/dashboard/quiz/${resource.id}`);

    } catch (error) {
      console.error("Error processing text:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process text",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container mx-auto p-6 max-w-5xl">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Add Learning Resource
        </h1>
        <p className="text-muted-foreground text-lg">
          Choose a method below to add content and generate personalized tutorials and quizzes.
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Section */}
        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-500" />
              Upload Files
            </CardTitle>
            <CardDescription>
              Drag and drop or select files to upload
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-8 transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-border'}
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer'}`}
            >
              <input {...getInputProps()} disabled={isProcessing} />
              <div className="flex flex-col items-center gap-4">
                <Upload className={`h-12 w-12 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                <div className="text-center">
                  {isProcessing ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-500">
                        Selected: {selectedFile?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Please wait while we process your file...
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-1">
                        {isDragActive ? "Drop files here..." : "Drop files here or click to browse"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supported: PDF, Word (.docx), PowerPoint (.pptx), Text (.txt), Markdown (.md)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Link Section */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-blue-500" />
              Import from URL
            </CardTitle>
            <CardDescription>
              Add content from websites or YouTube videos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => setIsWebsiteDialogOpen(true)}
                variant="outline"
                className="flex-1 h-24 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20"
              >
                <Globe className="h-6 w-6 text-blue-500" />
                <span className="font-medium">Website</span>
              </Button>
              <Button 
                onClick={() => setIsYoutubeDialogOpen(true)}
                variant="outline"
                className="flex-1 h-24 flex flex-col items-center justify-center gap-2 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Youtube className="h-6 w-6 text-red-500" />
                <span className="font-medium">YouTube</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Text Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Paste Text
            </CardTitle>
            <CardDescription>
              Directly paste your content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setIsTextDialogOpen(true)}
              variant="outline"
              className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20"
            >
              <ClipboardCopy className="h-6 w-6 text-blue-500" />
              <span className="font-medium">Paste Content</span>
            </Button>
          </CardContent>
        </Card>

        {/* Website URL Dialog */}
        <Dialog open={isWebsiteDialogOpen} onOpenChange={setIsWebsiteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Website Content</DialogTitle>
              <DialogDescription>
                Enter the URL of a website to generate MCQs from its content.
              </DialogDescription>
            </DialogHeader>
            <Form {...websiteForm}>
              <form onSubmit={websiteForm.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={websiteForm.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/article" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter the full URL including https://
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Processing..." : "Submit"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* YouTube URL Dialog */}
        <Dialog open={isYoutubeDialogOpen} onOpenChange={setIsYoutubeDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-2xl">YouTube URL</DialogTitle>
              <DialogDescription className="text-base">
                Paste in a YouTube video URL below to upload as a source in MCQ Lab.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <Form {...youtubeForm}>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    console.log("YouTube form submitted");
                    
                    const formData = youtubeForm.getValues();
                    console.log("Form data:", formData);
                    
                    if (!formData.url) {
                      toast({
                        title: "Error",
                        description: "Please enter a YouTube URL",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Validate YouTube URL
                    if (!formData.url.includes('youtube.com') && !formData.url.includes('youtu.be')) {
                      toast({
                        title: "Error",
                        description: "Please enter a valid YouTube URL",
                        variant: "destructive",
                      });
                      return;
                    }

                    setLoading(true);
                    try {
                      await onSubmit(formData);
                    } catch (error) {
                      console.error("Error submitting YouTube URL:", error);
                      toast({
                        title: "Error",
                        description: error instanceof Error ? error.message : "Failed to process YouTube video",
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }} 
                  className="space-y-4"
                >
            <FormField
                    control={youtubeForm.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                        <FormLabel className="text-blue-500">Paste URL *</FormLabel>
                  <FormControl>
                          <Input 
                            placeholder="https://www.youtube.com/watch?v=" 
                            disabled={loading} 
                            {...field} 
                          />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

                  <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg space-y-2">
                    <h4 className="font-medium">Notes</h4>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                      <li>Only videos with English captions/subtitles are supported</li>
                      <li>Private or unlisted videos are not supported</li>
                      <li>Recently uploaded videos may not be available to import</li>
                      <li>Short-form videos (YouTube Shorts) are not supported</li>
                      <li>Sometimes YouTube upload fails due to YouTube&apos;s API limitations.</li>
                      <li>If the YouTUbe upload fails constantly, please email us at <a href="mailto:support@mcqlab.ai" className="text-blue-500">info@mcqlab.click</a>.</li>
                    </ul>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="min-w-[100px]"
                    >
                      {loading ? "Processing..." : "Import Video"}
                    </Button>
                  </div>
          </form>
        </Form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Text Dialog */}
        <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-2xl">Paste Text</DialogTitle>
              <DialogDescription className="text-base">
                Paste your text below to generate MCQs and a tutorial.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <Form {...textForm}>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    console.log("Form submitted"); // Debug log
                    textForm.handleSubmit(handleTextSubmit)(e);
                  }} 
                  className="space-y-4"
                >
                  <FormField
                    control={textForm.control}
                    name="text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-500">Your Text *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Paste your text here..." 
                            className="min-h-[200px]"
                            disabled={loading} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg space-y-2">
                    <h4 className="font-medium">Notes</h4>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                      <li>Text should be in English</li>
                      <li>Minimum length: 100 characters</li>
                      <li>Maximum length: 50,000 characters</li>
                      <li>Formatting (bold, italic, etc.) will be removed</li>
                    </ul>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="min-w-[100px]"
                    >
                      {loading ? "Processing..." : "Insert"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}