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
      1. Return ONLY the JSON array without additional text
      2. Each question must have exactly 4 options
      3. The correct_answer must be included in the options array
      4. Generate exactly 20 questions
      5. Stem Construction:
        - Use identical terminology from content
        - Avoid all negative wording (no "not", "except", "never")
        - Express complete problem - student could theoretically answer without options
        - Eliminate irrelevant information and redundancy
        - Avoid verbal association clues (don't repeat stem phrases in correct answer)
      6. Distractor Quality:
        - All distractors must be plausible and domain-appropriate
        - Match correct answer's language style and length
        - For conceptual questions, use common student misconceptions
        - Ensure only ONE unambiguous correct answer
        - Make options mutually exclusive
      7. Formatting Standards:
        - Options in logical order (numerical/chronological/conceptual)
        - Maintain grammatical consistency between stem and options
        - Avoid absolute terms (all/none/always/never)
        - Prohibited options: "all/none of the above"
        - No trick questions or unimportant detail emphasis
      8. Validation:
        - Test that knowledgeable students would consistently select correct answer
        - Ensure no answer patterns emerge (e.g., correct answers equally distributed)
        - Verify consistent terminology with source content`;


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
  const prompt = `Generate an engaging and comprehensive tutorial based on the following content. 

  The tutorial should:
  1. Be written in **Markdown format** with a clear structure.
  2. Start with a brief introduction that explains the importance of the topic and what the learner will achieve by the end of the tutorial.
  3. Break down the content into **well-organized sections**, using headers, subheaders, and bullet points where needed for clarity.
  4. Include **interactive elements** such as reflective questions, small exercises, or challenges to engage the learner actively.
  5. Provide **clear instructions** to make the tutorial as self-guided as possible, so students can progress independently.
  6. Use **examples and analogies** to simplify complex concepts and help readers connect the material to real-world applications.
  7. Highlight **key points, definitions, or formulas** in bold or in callout blocks for emphasis.
  8. Incorporate **additional explanations** where necessary to ensure that readers with little prior knowledge can understand the underlying concept.
  9. End with a **summary** of the main ideas and suggestions for further exploration or practice.
  10. Keep the length between **200-1000 words**, ensuring it is concise yet comprehensive.

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
      max_completion_tokens: 5000,
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