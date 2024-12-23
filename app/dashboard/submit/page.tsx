"use client"
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { supabaseClient } from "@/lib/supabaseClient";
import { useState } from "react";
import { extractYouTubeTranscription, scrapeArticleContent } from "@/lib/utils";
import { generateMCQs } from "@/lib/ai";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/components/ui/use-toast";

const FormSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export default function SubmitNewURL() {
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();

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

      // Use the API route instead of direct extraction
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

      const { content } = await extractResponse.json();
      console.log("Content extracted:", content.substring(0, 100));

      toast({
        title: "Generating Questions",
        description: "Using AI to create MCQs...",
      });

      const mcqs = await generateMCQs(content);

      // Determine type based on URL
      const type = url.includes("youtube.com") || url.includes("youtu.be") ? "youtube" : "article";

      // Save to database with string user ID
      const { data: resource, error: resourceError } = await supabaseClient
        .from("Resource")
        .insert([
          {
            url,
            type,
            content,
            userId: user.id.toString(),
          },
        ])
        .select("id")
        .single();

      if (resourceError) {
        console.error("Resource Error:", resourceError);
        throw resourceError;
      }

      const { error: quizError } = await supabaseClient
        .from("Quiz")
        .insert([
          {
            resourceId: resource.id,
            userId: user.id.toString(),
          },
        ])
        .select("id")
        .single();

      if (quizError) throw quizError;

      // Transform MCQs to match database schema
      const mcqData = mcqs.map((mcq) => ({
        quizId: resource.id,
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

      form.reset();
      toast({
        title: "Success!",
        description: "Resource and questions have been saved.",
      });
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