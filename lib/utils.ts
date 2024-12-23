import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { YoutubeTranscript } from 'youtube-transcript';
import * as cheerio from 'cheerio';
import axios from 'axios';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function extractYouTubeTranscription(url: string): Promise<string> {
  try {
    // Extract video ID from URL
    const videoId = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/)?.[1];
    
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map(t => t.text).join(' ');
  } catch (error) {
    console.error('Error extracting YouTube transcript:', error);
    throw new Error('Failed to extract video transcript');
  }
}

export async function scrapeArticleContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Remove script tags, style tags, and comments
    $('script').remove();
    $('style').remove();
    $('comments').remove();
    
    // Extract text from article body or main content
    const content = $('article, main, .content, .article-content, .post-content')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!content) {
      // Fallback to body text if no article content found
      return $('body').text().replace(/\s+/g, ' ').trim();
    }
    
    return content;
  } catch (error) {
    console.error('Error scraping article:', error);
    throw new Error('Failed to scrape article content');
  }
}
