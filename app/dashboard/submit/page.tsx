"use client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Link2, FileText, Youtube } from "lucide-react";
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export const maxDuration = 60;

const FormSchema = z.object({
  url: z.preprocess(
    (val) => val === "" ? undefined : val,
    z.string().url("Please enter a valid URL").optional()
  ),
  text: z.string()
    .min(100, "Text must be at least 100 characters long")
    .max(50000, "Text must not exceed 50,000 characters")
    .optional(),
}).superRefine((data, ctx) => {
  // At least one field must be filled
  if (!data.url && !data.text) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either URL or text must be provided",
      path: ["text"],
    });
  }
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

  // Create separate form instances
  const websiteForm = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { url: "", text: "" },
  });

  const youtubeForm = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { url: "", text: "" },
  });

  const textForm = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { url: "", text: "" },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      await handleFileUpload(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
    },
    multiple: false
  });

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        
      });

      console.log('Request URL:', '/api/upload');
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const { content, title } = await response.json();

      const mcqs = await generateMCQs(content);

      const { data: resource, error: resourceError } = await supabaseClient
        .from("Resource")
        .insert([{
          title,
          content,
          type: 'document',
          url: '', // Empty for uploaded files
          userId: user?.id,
        }])
        .select()
        .single();

      if (resourceError) throw resourceError;

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

      const tutorial = await generateTutorial(content);
      const { error: tutorialError } = await supabaseClient
        .from("Resource")
        .update({ tutorial })
        .eq('id', resource.id);

      if (tutorialError) throw tutorialError;

      toast({
        title: "Success!",
        description: "File uploaded and processed successfully.",
      });

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

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log("Submit started with data:", data); // Debug log
    
    try {
      if (!data.url) {
        console.log("No URL provided"); // Debug log
        toast({
          title: "Error",
          description: "Please enter a URL",
          variant: "destructive",
        });
        return;
      }

      setLoading(true); // Set loading state immediately
      console.log("Loading state set to true"); // Debug log

      const { url } = data;
      console.log("Processing URL:", url);

      // Add debug toast
      toast({
        title: "Processing",
        description: `Processing URL: ${url}`,
      });

      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to submit content.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Processing",
        description: "Extracting content from URL...",
      });

      // Step 1: Extract content from the URL
      const extractResponse = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!extractResponse.ok) {
        const error = await extractResponse.json();
        throw new Error(error.error || 'Failed to extract content');
      }

      const { content, imageUrl, title } = await extractResponse.json();
      console.log("Content extracted:", content.substring(0, 100));
      console.log("Image URL:", imageUrl);
      console.log("Title:", title);

      // Step 2: Determine the type of content (YouTube or Article)
      const type = url.includes("youtube.com") || url.includes("youtu.be") ? "youtube" : "article";

      // Step 3: Save the resource to the database
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
        console.error("Resource Error:", resourceError);
        throw resourceError;
      }

      console.log("Resource ID:", resource.id);

      // Step 4: Generate MCQs
      toast({
        title: "Generating Questions",
        description: "Using AI to create MCQs...",
      });

      const mcqs = await generateMCQs(content);

      // Step 5: Create a quiz entry in the database
      const { error: quizError, data: quizData } = await supabaseClient
        .from("Quiz")
        .insert([{
          resourceId: resource.id,
          userId: user.id.toString(),
        }])
        .select("id")
        .single();

      if (quizError) {
        console.error("Quiz Error:", quizError);
        throw quizError;
      }

      const quizId = quizData.id;
      console.log("Quiz ID:", quizId);

      // Step 6: Transform MCQs to match database schema and insert them
      const mcqData = mcqs.map((mcq) => ({
        quizId: quizId,
        question: mcq.question,
        optionA: mcq.options[0],
        optionB: mcq.options[1],
        optionC: mcq.options[2],
        optionD: mcq.options[3],
        correctOption: mcq.options.indexOf(mcq.correct_answer) + 1, // Convert to 1-based index
      }));

      const { error: mcqError } = await supabaseClient
        .from("MCQ")
        .insert(mcqData);

      if (mcqError) throw mcqError;

      // New Step: Generate and store tutorial
      toast({
        title: "Generating Tutorial",
        description: "Creating a comprehensive tutorial...",
      });

      const tutorial = await generateTutorial(content);

      // Update the resource with the tutorial
      const { error: tutorialError } = await supabaseClient
        .from("Resource")
        .update({ tutorial: tutorial })
        .eq('id', resource.id);

      if (tutorialError) {
        console.error("Tutorial Error:", tutorialError);
        throw tutorialError;
      }

      // Reset forms and close dialogs
      websiteForm.reset();
      youtubeForm.reset();
      setIsWebsiteDialogOpen(false);
      setIsYoutubeDialogOpen(false);

      router.push(`/dashboard/quiz/${resource.id}`);

    } catch (error) {
      console.error("Error in onSubmit:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log("Loading state set to false"); // Debug log
    }
  }

  async function handleTextSubmit(data: z.infer<typeof FormSchema>) {
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

      form.reset();
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
    <main className="flex min-w-screen p-4 flex-col items-center justify-between">
      <div className="flex flex-col w-full max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          Add Resource
        </h1>
        <p className="text-muted-foreground mb-8">
          Add Resources to generate a personalised tutorial and multiple choice questions to evaluate your knowledge on specific topic.
          (Examples: articles, course reading, course notes, research notes, lecture notes, YouTube videos, etc.)
        </p>

        {/* Upload Section */}
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-8 mb-8 transition-colors
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}
            hover:border-primary hover:bg-primary/5 cursor-pointer`}
        >
          <input {...getInputProps()} />
          <div className="flex justify-center items-center mb-4">
            <Upload className="h-12 w-12 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">Upload sources</h2>
          <p className="text-center text-muted-foreground mb-4">
            {isDragActive ? (
              "Drop the file here..."
            ) : (
              <>
                Drag and drop or <span className="text-blue-500">choose file</span> to upload
              </>
            )}
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Supported file types: PDF, .txt, Markdown, Word (.docx), PowerPoint (.pptx)
          </p>
          {selectedFile && (
            <p className="text-center text-sm text-primary mt-2">
              Selected file: {selectedFile.name}
            </p>
          )}
        </div>

        {/* Additional Methods - Now in a flex row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
          

          {/* Link Section */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex-1 min-w-[200px]">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Link2 className="h-6 w-6" />
                <div>
                  <h3 className="font-medium">Link</h3>
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsWebsiteDialogOpen(true)}
                    >
                      Website
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsYoutubeDialogOpen(true)}
                    >
                      YouTube
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paste Text Section */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex-1 min-w-[200px]">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <FileText className="h-6 w-6" />
                <div>
                  <h3 className="font-medium">Paste text</h3>
                  <div className="flex justify-start mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsTextDialogOpen(true)}
                    >
                      Copied text
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Website URL Dialog */}
        <Dialog open={isWebsiteDialogOpen} onOpenChange={setIsWebsiteDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-2xl">Website URL</DialogTitle>
              <DialogDescription className="text-base">
                Paste in a web URL below to upload as a source in MCQ Lab.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <Form {...websiteForm}>
                <form onSubmit={websiteForm.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={websiteForm.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-500">Paste URL *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://" 
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
                      <li>Only the visible text on the website will be imported at this moment</li>
                      <li>Paid articles are not supported</li>
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