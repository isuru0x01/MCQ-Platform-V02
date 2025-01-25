import { NextResponse } from "next/server";
import axios from "axios";
import { load as cheerioLoad } from "cheerio";
import { YoutubeTranscript } from "youtube-transcript";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let content = "";
    let imageUrl: string | null = null;
    let title: string;

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
        `https://www.youtube.com/watch?v=${videoId}`
      );
      const $ = cheerioLoad(videoResponse.data);
      title = $("title").text().replace("- YouTube", "").trim() || "YouTube Video";

      imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      try {
        const imageRes = await axios.get(imageUrl);
        if (imageRes.status !== 200) {
          imageUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
      } catch {
        imageUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }

      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: "en",
        });
        content = transcript.map((t) => t.text).join(" ");
      } catch (error) {
        console.error("Error fetching transcript:", error);
        return NextResponse.json(
          { error: "Failed to fetch YouTube transcript" },
          { status: 500 }
        );
      }
    } else {
      // Existing article extraction logic
      const response = await axios.get(url);
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

      content =
        $("article, main, .content, .article-content, .post-content")
          .first()
          .text()
          .trim() || $("body").text().trim();
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

export const config = {
  api: {
    bodyParser: false,
  },
};