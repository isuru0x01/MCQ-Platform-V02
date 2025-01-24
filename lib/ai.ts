"use server";

import OpenAI from "openai";
import Together from "together-ai";
import { encode, decode } from "gpt-tokenizer"; // For token counting
const Groq = require('groq-sdk');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
});

// Together AI Configuration
const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

// Groq AI Configuration
const groq = new Groq();

/**
 * Truncate text to a maximum number of tokens.
 * @param {string} text - The input text.
 * @param {number} maxTokens - The maximum number of tokens allowed.
 * @returns {string} - The truncated text.
 */
function truncateText(text: string, maxTokens: number): string {
  const tokens = encode(text); // Convert text to tokens
  if (tokens.length <= maxTokens) {
    return text; // Return the original text if it's within the limit
  }
  const truncatedTokens = tokens.slice(0, maxTokens); // Truncate tokens
  return decode(truncatedTokens); // Convert tokens back to text
}

/**
 * Get the token limit for a specific model.
 * @param {string} model - The model name.
 * @returns {number} - The token limit for the model.
 */
function getTokenLimit(model: string): number {
  switch (model) {
    case "o1-mini": // OpenAI model
      return 64000;
    case "meta-llama/Llama-3.3-70B-Instruct-Turbo": // Together AI model
      return 5000;
    case "llama-3.3-70b-versatile": // Groq model
      return 6000;
    default:
      return 5000; // Default token limit
  }
}

// Main function to generate MCQs
export async function generateMCQs(content: string): Promise<any[]> {
  const prompt = `Generate exactly 20 multiple choice questions in JSON format based on this content: ${content}

      Return ONLY a JSON array with this exact structure:
      [
      {
          "question": "What is...",
          "correct_answer": "The correct answer",
          "options": ["Option 1", "The correct answer", "Option 3", "Option 4"]
      }
      ]

      Requirements:
      1. Return ONLY the JSON array, no other text
      2. Each question must have exactly 4 options
      3. The correct_answer must be included in the options array
      4. Generate exactly 20 questions`;

  try {
    // Attempt to generate MCQs using OpenAI
    const model = "o1-mini";
    const tokenLimit = getTokenLimit(model);
    const truncatedContent = truncateText(content, tokenLimit);

    const completion = await client.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: prompt.replace("${content}", truncatedContent) }],
      temperature: 0.8,
      max_tokens: tokenLimit,
    });

    // Parse the response
    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('No response from OpenAI');

    return JSON.parse(response);

  } catch (error) {
    console.error("OpenAI Error:", error);
    console.log("Falling back to Together AI...");

    try {
      // Fallback to Together AI
      const model = "meta-llama/Llama-3.3-70B-Instruct-Turbo";
      const tokenLimit = getTokenLimit(model);
      const truncatedContent = truncateText(content, tokenLimit);

      const response = await together.chat.completions.create({
        messages: [
          { role: "system", content: "You are a JSON generator. Always respond with valid JSON arrays only, no additional text." },
          { role: "user", content: prompt.replace("${content}", truncatedContent) }
        ],
        model: model,
        max_tokens: tokenLimit,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        repetition_penalty: 1,
        stop: ["<|eot_id|>", "<|eom_id|>"]
      });

      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        console.error('No content in Together AI response');
        throw new Error('Failed to generate questions');
      }

      console.log('Raw response:', responseContent);

      // Clean up the response
      const cleanedContent = responseContent
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^[\s\n]*Here.*?\[/s, '[')  // Remove any leading text
        .replace(/\][\s\n]*$/g, ']')         // Remove any trailing text
        .trim();

      console.log('Cleaned response:', cleanedContent);

      try {
        const questions = JSON.parse(cleanedContent);
        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error('Not a valid questions array');
        }
        return questions;
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        // Try to find a JSON array in the response
        const jsonMatch = cleanedContent.match(/\[\s*{\s*".*}\s*\]/s);
        if (!jsonMatch) {
          throw new Error('Could not find valid JSON array in response');
        }
        return JSON.parse(jsonMatch[0]);
      }
    } catch (togetherError) {
      console.error("Together AI Error:", togetherError);
      console.log("Falling back to Groq...");

      try {
        // Fallback to Groq
        const model = "llama-3.3-70b-versatile";
        const tokenLimit = getTokenLimit(model);
        const truncatedContent = truncateText(content, tokenLimit);

        const groqResponse = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: `Generate 20 MCQs from the following content:\n${truncatedContent}`,
            },
          ],
          model: model,
          temperature: 1,
          max_tokens: tokenLimit,
          top_p: 1,
          stream: false, // Set to false for simplicity
        });

        // Parse the response
        const mcqs = JSON.parse(groqResponse.choices[0]?.message?.content || "[]");
        return mcqs;
      } catch (groqError) {
        console.error("Groq Error:", groqError);
        throw new Error("All AI models failed to generate MCQs.");
      }
    }
  }
}

/**
 * Generate a markdown summary of the content using AI
 * @param {string} content - The input content to summarize
 * @returns {Promise<string>} - The generated markdown summary
 */
export async function generateTutorial(content: string): Promise<string> {
  const prompt = `Generate a comprehensive tutorial of the following content. 
  The tutorial should:
  1. Be in markdown format
  2. Include key points and main ideas
  3. Be well-structured with headers and bullet points where appropriate
  4. Be between 200-1000 words
  5. Use domain-specific knowledge to make the content understandable to reader's with little knowledge on the subject
  
  Content to use for the tutorial: ${content}`;

  try {
    // Try with OpenAI first
    const model = "o1-mini";
    const tokenLimit = getTokenLimit(model);
    const truncatedContent = truncateText(content, tokenLimit);

    const completion = await client.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: prompt.replace("${content}", truncatedContent) }],
      temperature: 0.7,
      max_tokens: 5000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('No response from OpenAI');

    return response;

  } catch (error) {
    console.error("OpenAI Error:", error);
    console.log("Falling back to Together AI...");

    try {
      // Fallback to Together AI
      const model = "meta-llama/Llama-3.3-70B-Instruct-Turbo";
      const tokenLimit = getTokenLimit(model);
      const truncatedContent = truncateText(content, tokenLimit);

      const response = await together.chat.completions.create({
        messages: [
          { role: "system", content: "You are a skilled tutorial writer. Generate a tutorial in markdown format." },
          { role: "user", content: prompt.replace("${content}", truncatedContent) }
        ],
        model: model,
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        repetition_penalty: 1,
      });

      const summary = response.choices[0]?.message?.content;
      if (!summary) throw new Error('No response from Together AI');

      return summary;

    } catch (togetherError) {
      console.error("Together AI Error:", togetherError);
      console.log("Falling back to Groq...");

      try {
        // Fallback to Groq
        const model = "llama-3.3-70b-versatile";
        const tokenLimit = getTokenLimit(model);
        const truncatedContent = truncateText(content, tokenLimit);

        const groqResponse = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: prompt.replace("${content}", truncatedContent),
            },
          ],
          model: model,
          temperature: 0.7,
          max_tokens: 5000,
          top_p: 1,
          stream: false,
        });

        const summary = groqResponse.choices[0]?.message?.content;
        if (!summary) throw new Error('No response from Groq');

        return summary;

      } catch (groqError) {
        console.error("Groq Error:", groqError);
        throw new Error("All AI models failed to generate summary.");
      }
    }
  }
}