import { NextResponse } from "next/server";
import axios from "axios";
import { load as cheerioLoad } from "cheerio";
import { YoutubeTranscript } from "youtube-transcript";
import TranscriptAPI from 'youtube-transcript-api';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let content = "";
    let imageUrl: string | null = null;
    let title = ""; // Initialize with empty string instead of undefined

    // Common headers to mimic a browser request
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://www.google.com/',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      // Extract YouTube video ID
      const videoId = url.match(
        /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/
      )?.[1];

      if (!videoId) {
        return NextResponse.json(
          { error: "Invalid YouTube URL" },
          { status: 400 }
        );
      }

      // Get video title and thumbnail - add safety checks
      const videoResponse = await axios.get(
        `https://www.youtube.com/watch?v=${videoId}`,
        { headers }
      );
      const $ = cheerioLoad(videoResponse.data);
      
      // Add safety checks for title extraction
      const titleText = $("title").text();
      title = titleText ? titleText.replace("- YouTube", "").trim() : "YouTube Video";
      
      imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      try {
        const imageRes = await axios.get(imageUrl, { headers });
        if (imageRes.status !== 200) {
          imageUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
      } catch {
        imageUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }

      // Method 1: Try primary method first (YoutubeTranscript)
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: "en",
        });
        content = transcript.map((t) => t.text).join(" ");
        console.log("Successfully fetched transcript with primary method");
      } catch (primaryError) {
        console.error("Primary transcript method failed:", primaryError);
        console.log("Attempting fallback transcript extraction methods...");

        const fallbackMethods = [
          { name: 'youtube-transcript-api', fn: fetchWithYoutubeTranscriptApi },
          { name: 'RapidAPI', fn: fetchWithRapidApi },
          { name: 'SupaData', fn: fetchWithSupaData },
        ];

        let success = false;
        for (const method of fallbackMethods) {
          try {
            console.log(`Trying fallback method: ${method.name}...`);
            const transcript = await method.fn(videoId, url);
            if (transcript) {
              content = transcript;
              console.log(`Successfully fetched transcript with ${method.name}`);
              success = true;
              break; // Exit the loop on success
            }
          } catch (error) {
            console.error(`Error with ${method.name} fallback:`, error);
          }
        }

        if (!success) {
          console.error("All fallback transcript methods failed.");
          return NextResponse.json(
            { 
              content: "", // Empty content indicates transcript extraction failed
              imageUrl,
              title, // Still return the title for fallback mechanism
              error: "Unable to extract YouTube transcript. Using video title as fallback.",
              details: "All transcript extraction methods failed."
            },
            { status: 200 } // Return 200 to allow processing to continue
          );
        }
      }
    } else {
      // Enhanced article extraction logic with proper headers
      try {
        const response = await axios.get(url, { 
          headers,
          timeout: 10000, // 10 second timeout
          maxRedirects: 5
        });
        
        const $ = cheerioLoad(response.data);

        // Add safety checks for article title extraction
        const ogTitle = $('meta[property="og:title"]').attr("content");
        const pageTitle = $("title").text();
        title = ogTitle || pageTitle || "Article";

        const possibleImages = [
          $('meta[property="og:image"]').attr("content"),
          $('meta[name="twitter:image"]').attr("content"),
          $("article img").first().attr("src"),
          $(".post-content img").first().attr("src"),
          $("img").first().attr("src"),
        ].filter(Boolean);
        imageUrl = possibleImages[0] || null;

        // Fix relative image URLs
        if (imageUrl && !imageUrl.startsWith('http')) {
          const urlObj = new URL(url);
          imageUrl = imageUrl.startsWith('/') 
            ? `${urlObj.protocol}//${urlObj.host}${imageUrl}`
            : `${urlObj.protocol}//${urlObj.host}/${imageUrl}`;
        }

        content =
          $("article, main, .content, .article-content, .post-content")
            .first()
            .text()
            .trim() || $("body").text().trim();
      } catch (error) {
        console.error("Error fetching article:", error);
        return NextResponse.json(
          { 
            error: "Failed to fetch article content. The website may be blocking our requests.",
            details: error instanceof Error ? error.message : "Unknown error"
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      content,
      imageUrl,
      title,
    });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    );
  }
}

// Helper functions for different transcript services

async function fetchWithYoutubeTranscriptApi(videoId: string): Promise<string | null> {
  const isValidId = await TranscriptAPI.validateID(videoId);
  if (isValidId) {
    const transcript = await TranscriptAPI.getTranscript(videoId);
    return transcript.map((t: any) => t.text).join(" ");
  }
  return null;
}

async function fetchWithRapidApi(videoId: string): Promise<string | null> {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  console.log("Attempting to read RAPIDAPI_KEY. Found:", rapidApiKey ? 'Yes' : 'No');
  
  if (!rapidApiKey) {
    console.error("RapidAPI key (RAPIDAPI_KEY) not set. Skipping this fallback.");
    return null; // Skip if key is not configured
  }

  const response = await axios.get('https://youtube-transcript3.p.rapidapi.com/api/transcript', {
    params: { videoId },
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': 'youtube-transcript3.p.rapidapi.com'
    }
  });

  if (response.data && Array.isArray(response.data)) {
    return response.data.map((t: any) => t.text).join(" ");
  }
  throw new Error('Unexpected response format from RapidAPI');
}

async function fetchWithSupaData(videoId: string, url: string): Promise<string | null> {
  const supaDataApiKey = process.env.SUPADATA_API_KEY;
  console.log("Attempting to read SUPADATA_API_KEY. Found:", supaDataApiKey ? 'Yes' : 'No');

  if (!supaDataApiKey) {
    console.error("SupaData API key (SUPADATA_API_KEY) not set. Skipping this fallback.");
    return null; // Skip if key is not configured
  }

  const response = await axios.get('https://api.supadata.ai/v1/youtube/transcript', {
    params: { url, text: true },
    headers: { 'x-api-key': supaDataApiKey }
  });

  if (typeof response.data === 'string' && response.data.length > 0) {
    return response.data;
  }
  if (response.data && typeof response.data.transcript === 'string' && response.data.transcript.length > 0) {
    return response.data.transcript;
  }
  throw new Error('Unexpected or empty response format from SupaData');
}