import { NextResponse } from "next/server";
import { YoutubeTranscript } from 'youtube-transcript';
import * as cheerio from 'cheerio';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let content: string;
    
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/)?.[1];
      
      if (!videoId) {
        return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
      }

      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      content = transcript.map(t => t.text).join(' ');
    } else {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      $('script').remove();
      $('style').remove();
      $('comments').remove();
      
      content = $('article, main, .content, .article-content, .post-content')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim();
      
      if (!content) {
        content = $('body').text().replace(/\s+/g, ' ').trim();
      }
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract content' },
      { status: 500 }
    );
  }
} 