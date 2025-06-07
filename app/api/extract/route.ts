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
    let title: string;

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
      // Existing YouTube extraction logic
      const videoId = url.match(
        /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/
      )?.[1];

      if (!videoId) {
        return NextResponse.json(
          { error: "Invalid YouTube URL" },
          { status: 400 }
        );
      }

      const videoResponse = await axios.get(
        `https://www.youtube.com/watch?v=${videoId}`,
        { headers }
      );
      const $ = cheerioLoad(videoResponse.data);
      title = $("title").text().replace("- YouTube", "").trim() || "YouTube Video";

      imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      try {
        const imageRes = await axios.get(imageUrl, { headers });
        if (imageRes.status !== 200) {
          imageUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
      } catch {
        imageUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }

      // Try primary method first
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: "en",
        });
        content = transcript.map((t) => t.text).join(" ");
      } catch (primaryError) {
        console.error("Error fetching transcript with primary method:", primaryError);
        
        // Try alternative method using youtube-transcript-api
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
          return NextResponse.json(
            { 
              content: "", // Empty content indicates transcript extraction failed
              imageUrl,
              title, // Still return the title for fallback mechanism
              error: "Unable to extract YouTube transcript. Using video title as fallback.",
              details: "Both transcript extraction methods failed."
            },
            { status: 200 } // Return 200 instead of 500 to allow processing to continue
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

        title =
          $('meta[property="og:title"]').attr("content") ||
          $("title").text() ||
          "Article";

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