"use server";

import OpenAI from "openai";
import Together from "together-ai";
const Groq = require('groq-sdk');


const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
});

// Together AI Configuration
const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

// Groq AI Configuration
const groq = new Groq();

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
    const completion = await client.chat.completions.create({
      model: "o1-mini",
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 1000,
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
      console.log('Falling back to Together AI...');
      const response = await together.chat.completions.create({
        messages: [
          { role: "system", content: "You are a JSON generator. Always respond with valid JSON arrays only, no additional text." },
          { role: "user", content: prompt }
        ],
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        repetition_penalty: 1,
        stop: ["<|eot_id|>","<|eom_id|>"]
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
        const groqResponse = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: `Generate 20 MCQs from the following content:\n${content}`,
            },
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 1,
          max_tokens: 1000,
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