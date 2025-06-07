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
    case "gpt-4.1": // OpenAI model
      return 16384;
    case "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free": // Together AI model
      return 3000; // Reduced from 5000 to leave room for input tokens
    case "meta-llama/llama-4-maverick-17b-128e-instruct": // Groq model
      return 4000; // Reduced from 8192 to leave room for input tokens
    default:
      return 3000; // Default token limit reduced
  }
}

// Main function to generate MCQs
export async function generateMCQs(content: string): Promise<any[]> {
  const prompt = `Only return the JSON response. Generate exactly 20 multiple choice questions in JSON format based on this content: ${content}

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
        - Don't use images since images cannot be displayed correctly
      8. Validation:
        - Test that knowledgeable students would consistently select correct answer
        - Ensure no answer patterns emerge (e.g., correct answers equally distributed)
        - Verify consistent terminology with source content`;


  try {
    // Attempt to generate MCQs using Groq first
    const model = "meta-llama/llama-4-maverick-17b-128e-instruct";
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
      temperature: 1,
      max_tokens: tokenLimit,
      top_p: 1,
      stream: false, // Set to false for simplicity
    });

    // Parse the response
    const responseContent = groqResponse.choices[0]?.message?.content;
    if (!responseContent) {
      console.error('No content in Groq response');
      throw new Error('Failed to generate questions');
    }

    console.log('Raw Groq response:', responseContent);

    // Clean up the response
    const cleanedContent = responseContent
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/<think>.*?<\/think>/gs, '') // Remove <think> tags and content
      .replace(/^[\s\n]*.*?\[/s, '[')  // Remove any leading text
      .replace(/\][\s\n]*$/g, ']')     // Remove any trailing text
      .trim();

    console.log('Cleaned Groq response:', cleanedContent);

    try {
      const mcqs = JSON.parse(cleanedContent);
      if (!Array.isArray(mcqs) || mcqs.length === 0) {
        throw new Error('Not a valid questions array');
      }
      return mcqs;
    } catch (parseError) {
      console.error('Groq JSON parse error:', parseError);
      // Try to find a JSON array in the response
      const jsonMatch = cleanedContent.match(/\[\s*{\s*".*}\s*\]/s);
      if (!jsonMatch) {
        throw new Error('Could not find valid JSON array in Groq response');
      }
      return JSON.parse(jsonMatch[0]);
    }

    const mcqs = JSON.parse(groqResponse.choices[0]?.message?.content || "[]");
    return mcqs;

  } catch (groqError) {
    console.error("Groq Error:", groqError);
    console.log("Falling back to Together AI...");

    try {
      // Fallback to Together AI
      const model = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
      const tokenLimit = getTokenLimit(model);
      const truncatedContent = truncateText(content, tokenLimit);

      const response = await together.chat.completions.create({
        messages: [
          { role: "system", content: "You are a JSON generator. Always respond with valid JSON arrays only, no additional text." },
          { role: "user", content: prompt.replace("${content}", truncatedContent) }
        ],
        model: model,
        max_tokens: tokenLimit,
        temperature: 0.9,
        top_p: 0.9,
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
      console.log("Falling back to OpenAI...");

      try {
        // Fallback to OpenAI
        const model = "gpt-4.1";
        const tokenLimit = getTokenLimit(model);
        const truncatedContent = truncateText(content, tokenLimit);

        const completion = await client.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: prompt.replace("${content}", truncatedContent) }],
          max_completion_tokens: tokenLimit,
        });

        // Parse the response
        const response = completion.choices[0]?.message?.content;
        if (!response) throw new Error('No response from OpenAI');

        console.log('Raw OpenAI response:', response);

        // Clean up the response with more robust handling
        let cleanedResponse = response
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        
        // Try to extract JSON if there's conversational text
        if (!cleanedResponse.startsWith('[')) {
          // Look for JSON array pattern
          const jsonMatch = cleanedResponse.match(/\[\s*{\s*".*}\s*\]/s);
          if (jsonMatch) {
            cleanedResponse = jsonMatch[0];
          } else {
            // If we can't find a JSON array, try to remove any leading text
            cleanedResponse = cleanedResponse.replace(/^[\s\S]*?(\[\s*{)/s, '$1');
            // And remove any trailing text
            cleanedResponse = cleanedResponse.replace(/(}\s*\])[\s\S]*$/s, '$1');
          }
        }

        try {
          const questions = JSON.parse(cleanedResponse);
          if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('Not a valid questions array');
          }
          return questions;
        } catch (parseError) {
          console.error('OpenAI JSON parse error:', parseError);
          throw parseError;
        }
      } catch (openaiError) {
        console.error("OpenAI Error:", openaiError);
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
export async function generateTutorial(content: string, title?: string): Promise<string> {
  // If content is empty but we have a title (fallback for YouTube videos with failed transcript extraction)
  if ((!content || content.trim() === "") && title) {
    console.log("Using video title as fallback for tutorial generation:", title);
    content = `Video Title: ${title}. Please create a tutorial based on this title.`;
  }
  
  const prompt = `You are a skilled tutorial writer. Create a comprehensive, well-structured tutorial in markdown format.
  
  ## Guidelines
  1. **Title**
     - Use a clear, descriptive H1 title that includes the main topic and goal.
  
  ## General Guidelines
  
  - The tutorial must be written in **Markdown** format.
  - It should be **self-contained**, allowing learners with limited background knowledge to follow and complete it independently.
  - The tone should be **friendly, clear, and professional**.
  - Aim for a length of **1000 to 5000 words**, striking a balance between brevity and completeness.
  - Use **precise language**, and avoid jargon unless explained.
  - Make the tutorial **scannable**: use bullet points, short paragraphs, and subheadings to aid readability.
  - Make sure the links are **valid and working**.
  ## Structure & Content
  
  1. **Title**  
     - Make it specific and benefit-driven.  
     - Example: "Build a Real-Time Chat App with Firebase and React in Under an Hour"
  
  2. **Introduction (150-200 words max)**  
     - Answer these three questions clearly:
       - What will the reader learn?
       - What skills or tools should the reader already have?
       - What problem does this solve, and why is it important?
     - Include a real-world use case or pain point to hook the reader.
  
  3. **Table of Contents** (optional but encouraged if the tutorial is long)
     - Don't use anchor links to sections.
  
  4. **Problem Statement**
     - Clearly define what you're solving.
     - Use a relatable example or user story to make it more engaging.
  
  5. **Setup and Prerequisites**
     - Mention required tools, libraries, software versions, or accounts.
     - Provide installation instructions or links where applicable.
  
  6. **Step-by-Step Guide**  
     Break the solution down into **logical, digestible steps**. For each step:
     - Use **clear section headers** (## or ###).
     - Explain **why** a step is necessary, not just how to do it.
     - Include **short code snippets**, formatted using triple backticks.  
     - **Avoid long, unbroken blocks of code.** If a large file must be included, break it into parts with inline explanations.
     - Follow a **consistent code style** based on community standards.
     - Provide **in-line comments** and explain them where helpful.
     - Use **diagrams or illustrations** if they clarify complex ideas.
  
  7. **Interactive Learning**
     - Include **reflective questions**, **"Try it Yourself" exercises**, or **mini challenges** at key points.
     - Examples:
       - "Can you modify this function to also handle edge cases?"
       - "Try running the code without step 2. What do you observe?"
  
  8. **Highlight Key Concepts**
     - Use bold, callout blocks, or bullet points to emphasize:
       - Definitions
       - Key formulas or algorithms
       - Gotchas or common mistakes
       - Best practices
  
  9. **Real-World Applications**
     - Show where and how the concept/tech/tool is used in production settings.
     - Offer analogies to make abstract concepts more relatable.
  
  10. **Conclusion**  
     - Summarize what the learner has achieved or built.
     - Reinforce the main takeaways.
     - Suggest:
       - Additional reading
       - Next projects or features to add
       - Relevant documentation or communities
  
  11. **Further Resources (Optional)**
     - Include links to:
       - Official docs
       - GitHub repos
       - Video walkthroughs
       - Forums or communities
  
  ## Evaluation Criteria
  The tutorial should be:
  - **Beginner-friendly** but technically accurate.
  - **Actionable**: readers should be able to follow along and build something.
  - **Well-structured**: clear sectioning and logical flow.
  - **Visually scannable**: effective use of formatting and whitespace.
  
  ## Input
  The title or content to use for the tutorial: ${content}`;


  try {
    // Try with Groq first
    const model = "deepseek-r1-distill-llama-70b";
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
      temperature: 0.9,
      max_tokens: 4096,
      top_p: 1,
      stream: false,
    });

    const summary = groqResponse.choices[0]?.message?.content;
    if (!summary) throw new Error('No response from Groq');

    return summary;

  } catch (groqError) {
    console.error("Groq Error:", groqError);
    console.log("Falling back to Together AI...");

    try {
      // Fallback to Together AI
      const model = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
      const tokenLimit = getTokenLimit(model);
      const truncatedContent = truncateText(content, tokenLimit);

      const response = await together.chat.completions.create({
        messages: [
          { role: "system", content: "You are a skilled tutorial writer. Generate a tutorial in markdown format." },
          { role: "user", content: prompt.replace("${content}", truncatedContent) }
        ],
        model: model,
        max_tokens: 5000,
        temperature: 0.9,
        top_p: 0.9,
        top_k: 50,
        repetition_penalty: 1,
      });

      const summary = response.choices[0]?.message?.content;
      if (!summary) throw new Error('No response from Together AI');

      return summary;

    } catch (togetherError) {
      console.error("Together AI Error:", togetherError);
      console.log("Falling back to OpenAI...");

      try {
        // Fallback to OpenAI
        const model = "gpt-4.1";
        const tokenLimit = getTokenLimit(model);
        const truncatedContent = truncateText(content, tokenLimit);

        const completion = await client.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: prompt.replace("${content}", truncatedContent) }],
          max_completion_tokens: 5000,
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) throw new Error('No response from OpenAI');

        const cleanedResponse = response.replace(/```json|```/g, '').trim();

        return cleanedResponse;

      } catch (openaiError) {
        console.error("OpenAI Error:", openaiError);
        throw new Error("All AI models failed to generate summary.");
      }
    }
  }
}

/**
 * Generate a title from content using AI
 * @param {string} content - The content to generate a title from
 * @returns {Promise<string>} - The generated title
 */
export async function generateTitle(content: string): Promise<string> {
  const prompt = `You are a title extractor. Try to extract the title from the content. If you can't extract the title, generate a title based on the content. The title should be concise, descriptive, and representative of the main topic. 
  The title should not contain double quotes. 
  When you provide the title, don't include any additional text since title is stored in the database and used by an application. Only provide the title.
  
  Content: ${content.slice(0, 2000)}...`; // Use first 2000 chars for context

  try {
    // Try with Groq first
    const model = "meta-llama/llama-4-maverick-17b-128e-instruct";
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
      temperature: 0.9,
      max_tokens: 1000,
      top_p: 1,
      stream: false,
    });

    const title = groqResponse.choices[0]?.message?.content;
    if (!title) throw new Error('No response from Groq');

    return title.trim();

  } catch (groqError) {
    console.error("Groq Error:", groqError);
    console.log("Falling back to Together AI...");

    try {
      // Fallback to Together AI
      const model = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
      const tokenLimit = getTokenLimit(model);
      const truncatedContent = truncateText(content, tokenLimit);

      const response = await together.chat.completions.create({
        messages: [
          { role: "system", content: "You are a title extractor. Try to extract the title from the content. If you can't extract the title, generate a title based on the content. The title should be concise, descriptive, and representative of the main topic. The title should not contain double quotes." },
          { role: "user", content: prompt.replace("${content}", truncatedContent) }
        ],
        model: model,
        max_tokens: 500,
        temperature: 0.9,
        top_p: 0.9,
        top_k: 50,
        repetition_penalty: 1,
      });

      const title = response.choices[0]?.message?.content;
      if (!title) throw new Error('No response from Together AI');

      return title.trim();

    } catch (togetherError) {
      console.error("Together AI Error:", togetherError);
      console.log("Falling back to OpenAI...");
      
      try {
        // Fallback to OpenAI
        const model = "gpt-4.1";
        const tokenLimit = getTokenLimit(model);
        const truncatedContent = truncateText(content, tokenLimit);

        const completion = await client.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: prompt.replace("${content}", truncatedContent) }],
          max_completion_tokens: 500, // Short response for title
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) throw new Error('No response from OpenAI');

        const cleanedResponse = response.replace(/```json|```/g, '').trim();

        return cleanedResponse.trim();
      } catch (openaiError) {
        console.error("OpenAI Error:", openaiError);
        return "The title is not available"; // Fallback if all AI services fail
      }
    }
  }
}