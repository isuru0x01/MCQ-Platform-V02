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
        console.error("Error fetching transcript with primary method:", primaryError);
        
        // Method 2: Try alternative method using youtube-transcript-api
        try {
          // Validate video ID first
          const isValidId = await TranscriptAPI.validateID(videoId);
          
          if (isValidId) {
            const alternativeTranscript = await TranscriptAPI.getTranscript(videoId);
            content = alternativeTranscript.map((t) => t.text).join(" ");
            console.log("Successfully fetched transcript with alternative method");
          } else {
            throw new Error("Invalid video ID or transcript not available");
          }
        } catch (alternativeError) {
          console.error("Error fetching transcript with alternative method:", alternativeError);
          
          // Method 3: Try RapidAPI
          try {
            const rapidApiKey = process.env.RAPIDAPI_KEY;
            if (!rapidApiKey) {
              throw new Error("RapidAPI key not configured");
            }
            
            const rapidApiResponse = await axios.get(
              `https://youtube-transcript3.p.rapidapi.com/api/transcript?videoId=${videoId}`,
              {
                headers: {
                  'x-rapidapi-key': rapidApiKey,
                  'x-rapidapi-host': 'youtube-transcript3.p.rapidapi.com'
                }
              }
            );
            
            if (rapidApiResponse.data && rapidApiResponse.data.transcript) {
              content = rapidApiResponse.data.transcript;
              console.log("Successfully fetched transcript with RapidAPI");
            } else {
              throw new Error("No transcript data in RapidAPI response");
            }
          } catch (rapidApiError) {
            console.error("Error fetching transcript with RapidAPI:", rapidApiError);
            
            // Method 4: Try Supadata API
            try {
              const supadataApiKey = process.env.SUPADATA_API_KEY;
              if (!supadataApiKey) {
                throw new Error("Supadata API key not configured");
              }
              
              const supadataResponse = await axios.get(
                `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}`,
                {
                  headers: {
                    'x-api-key': supadataApiKey
                  }
                }
              );
              
              if (supadataResponse.data && supadataResponse.data.transcript) {
                content = supadataResponse.data.transcript;
                console.log("Successfully fetched transcript with Supadata API");
              } else {
                throw new Error("No transcript data in Supadata API response");
              }
            } catch (supadataError) {
              console.error("Error fetching transcript with Supadata API:", supadataError);
              
              // All methods failed, return empty content but include title for fallback
              return NextResponse.json(
                { 
                  content: "", // Empty content indicates transcript extraction failed
                  imageUrl,
                  title, // Still return the title for fallback mechanism
                  error: "Unable to extract YouTube transcript. Using video title as fallback.",
                  details: "All transcript extraction methods failed."
                },
                { status: 200 } // Return 200 instead of 500 to allow processing to continue
              );
            }
          }
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