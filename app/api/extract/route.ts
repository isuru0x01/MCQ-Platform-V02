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
    let imageUrl: string | null = null;
    let title: string;
    
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/)?.[1];
      
      if (!videoId) {
        return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
      }

      // Get YouTube video title
      const videoResponse = await axios.get(`https://www.youtube.com/watch?v=${videoId}`);
      const $ = cheerio.load(videoResponse.data);
      title = $('title').text().replace('- YouTube', '').trim() || 'YouTube Video';

      // Get YouTube thumbnail
      imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      
      // Verify if maxresdefault exists, if not fall back to hqdefault
      try {
        const imageRes = await axios.get(imageUrl);
        if (imageRes.status !== 200) {
          imageUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
      } catch {
        imageUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }

      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      content = transcript.map(t => t.text).join(' ');
    } else {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // Try to find the article title
      title = $('meta[property="og:title"]').attr('content') ||
              $('meta[name="twitter:title"]').attr('content') ||
              $('title').text() ||
              $('h1').first().text() ||
              'Article';

      // Try to find the main image
      const possibleImages = [
        $('meta[property="og:image"]').attr('content'),
        $('meta[name="twitter:image"]').attr('content'),
        $('article img').first().attr('src'),
        $('.post-content img').first().attr('src'),
        $('img').first().attr('src')
      ].filter(Boolean);

      if (possibleImages.length > 0) {
        imageUrl = possibleImages[0];
        // Convert relative URLs to absolute
        if (imageUrl && !imageUrl.startsWith('http')) {
          const baseUrl = new URL(url);
          imageUrl = new URL(imageUrl, baseUrl.origin).toString();
        }
      }
      
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

    return NextResponse.json({ content, imageUrl, title });
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract content' },
      { status: 500 }
    );
  }
} 