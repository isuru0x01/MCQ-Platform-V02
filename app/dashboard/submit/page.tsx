"use client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { supabaseClient } from "@/lib/supabaseClient";
import { useState } from "react";
import { extractYouTubeTranscription, scrapeArticleContent } from "@/lib/utils";
import { generateMCQs, generateTutorial } from "@/lib/ai";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from 'next/navigation';

export const maxDuration = 60;

const FormSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export default function SubmitNewURL() {
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      url: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log("Submit started", data);
    try {
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to submit content.",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      const { url } = data;
      console.log("Processing URL:", url);

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

      form.reset();
      toast({
        title: "Success!",
        description: "Resource, questions, and tutorial have been saved.",
      });

      // Step 7: Redirect after successful submission
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
    }
  }

  return (
    <main className="flex min-w-screen p-4 flex-col items-center justify-between ">
      <div className="flex flex-col mb-[5rem] w-full">
        <h1 className="text-3xl font-semibold tracking-tight">
          Generate MCQs
        </h1>
        <p className="leading-7 text-sm dark:text-gray-400">
          Paste article URL or YouTube video link...
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-[600px] space-y-3 mt-[1rem]">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Make sure to paste the full URL and it is accessible...</FormLabel>
                  <FormControl>
                    <Input disabled={loading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Submit"}
            </Button>
          </form>
        </Form>
      </div>
    </main>
  );
}