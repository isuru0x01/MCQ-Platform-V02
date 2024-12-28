import { NextResponse } from "next/server";
import axios from "axios";
import { load as cheerioLoad } from "cheerio";
import { YoutubeTranscript } from "youtube-transcript";
import { youtube_v3 } from "@googleapis/youtube";
import { Buffer } from "buffer";
import protobuf from "protobufjs";

// Initialize YouTube Data API client
const youtubeClient = new youtube_v3.Youtube({
  auth: process.env.YOUTUBE_API_KEY,
});

/**
 * Helper function to encode a message into a base64-encoded protobuf
 * to be used with the YouTube InnerTube API.
 * @param {Object} message - The message to encode
 * @returns {String} - The base64-encoded protobuf message
 */
function getBase64Protobuf(message) {
  const root = protobuf.Root.fromJSON({
    nested: {
      Message: {
        fields: {
          param1: { id: 1, type: "string" },
          param2: { id: 2, type: "string" },
        },
      },
    },
  });
  const MessageType = root.lookupType("Message");

  const buffer = MessageType.encode(message).finish();

  return Buffer.from(buffer).toString("base64");
}

/**
 * Returns the default subtitle language of a video on YouTube.
 * @param {String} videoId
 * @returns {Promise<{ trackKind: String, language: String }>} - The default subtitle language and the track kind (e.g., 'asr' or 'standard').
 */
async function getDefaultSubtitleLanguage(videoId) {
  // Get video default language
  const videos = await youtubeClient.videos.list({
    part: ["snippet"],
    id: videoId,
  });

  if (videos.data.items.length !== 1) {
    throw new Error(`Multiple videos found for video: ${videoId}`);
  }

  const preferredLanguage =
    videos.data.items[0].snippet.defaultLanguage ||
    videos.data.items[0].snippet.defaultAudioLanguage;

  // Get available subtitles
  const subtitles = await youtubeClient.captions.list({
    part: ["snippet"],
    videoId: videoId,
  });

  if (subtitles.data.items.length < 1) {
    throw new Error(`No subtitles found for video: ${videoId}`);
  }

  const { trackKind, language } = (
    subtitles.data.items.find(
      (sub) => sub.snippet.language === preferredLanguage
    ) || subtitles.data.items[0]
  ).snippet;

  return { trackKind, language };
}

/**
 * Helper function to extract text from certain elements.
 * Inspired by Invidious' extractors_utils.cr
 * https://github.com/iv-org/invidious/blob/384a8e200c953ed5be3ba6a01762e933fd566e45/src/invidious/yt_backend/extractors_utils.cr#L1-L30
 * @param {Object} item - The item to extract text from.
 * @returns {string} The extracted text.
 */
function extractText(item) {
  return item.simpleText || item.runs?.map((run) => run.text).join("");
}

/**
 * Function to retrieve subtitles for a given YouTube video.
 * @param {Object} options - The options for retrieving subtitles
 * @param {String} options.videoId - The ID of the video
 * @param {String} options.trackKind - The track kind of the subtitles (e.g., 'asr' or 'standard')
 * @param {String} options.language - The language of the subtitles
 * @returns {Promise<String>} - The subtitles of the video as a single string
 */
async function getSubtitles({ videoId, trackKind, language }) {
  const message = {
    param1: videoId,
    param2: getBase64Protobuf({
      // Only include `trackKind` for automatically-generated subtitles
      param1: trackKind === "asr" ? trackKind : null,
      param2: language,
    }),
  };

  const params = getBase64Protobuf(message);

  const url = "https://www.youtube.com/youtubei/v1/get_transcript";
  const headers = { "Content-Type": "application/json" };
  const data = {
    context: {
      client: {
        clientName: "WEB",
        clientVersion: "2.20240826.01.00",
      },
    },
    params,
  };

  const response = await axios.post(url, data, { headers });

  // Mapping inspired by Invidious' transcript.cr
  // https://github.com/iv-org/invidious/blob/432c25ad8626fee401b1f349b463515d21718ac8/src/invidious/videos/transcript.cr#L51-L101
  const initialSegments =
    response.data.actions[0].updateEngagementPanelAction.content
      .transcriptRenderer.content.transcriptSearchPanelRenderer.body
      .transcriptSegmentListRenderer.initialSegments;

  if (!initialSegments) {
    throw new Error(`Requested transcript does not exist for video: ${videoId}`);
  }

  let subtitles = "";
  initialSegments.forEach((segment) => {
    const line =
      segment.transcriptSectionHeaderRenderer ||
      segment.transcriptSegmentRenderer;

    const { snippet } = line;

    const text = extractText(snippet);

    subtitles += text + ". ";
  });

  return subtitles;
}

/**
 * Fallback function to fetch subtitles using the YouTube InnerTube API.
 * @param {String} videoId - The ID of the video
 * @returns {Promise<String>} - The subtitles of the video as a single string
 */
async function fetchSubtitlesFallback(videoId) {
  try {
    const { language, trackKind } = await getDefaultSubtitleLanguage(videoId);
    const subtitles = await getSubtitles({ videoId, trackKind, language });
    return subtitles;
  } catch (error) {
    console.error("Error fetching subtitles with fallback:", error);
    return "";
  }
}

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
      const videoId = url.match(
        /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/
      )?.[1];

      if (!videoId) {
        return NextResponse.json(
          { error: "Invalid YouTube URL" },
          { status: 400 }
        );
      }

      // Get YouTube video title
      const videoResponse = await axios.get(
        `https://www.youtube.com/watch?v=${videoId}`
      );
      const $ = cheerioLoad(videoResponse.data);
      title = $("title").text().replace("- YouTube", "").trim() || "YouTube Video";

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

      // Fetch transcript using youtube-transcript
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: "en", // Fetch English transcript
        });
        content = transcript.map((t) => t.text).join(" ");
      } catch (error) {
        console.error("Error fetching transcript with youtube-transcript:", error);
        // Fallback to InnerTube API if youtube-transcript fails
        content = await fetchSubtitlesFallback(videoId);
      }
    } else {
      // Handle non-YouTube URLs
      const response = await axios.get(url);
      const $ = cheerioLoad(response.data);

      // Extract title
      title =
        $('meta[property="og:title"]').attr("content") ||
        $("title").text() ||
        "Article";

      // Extract image URL
      const possibleImages = [
        $('meta[property="og:image"]').attr("content"),
        $('meta[name="twitter:image"]').attr("content"),
        $("article img").first().attr("src"),
        $(".post-content img").first().attr("src"),
        $("img").first().attr("src"),
      ].filter(Boolean);
      imageUrl = possibleImages[0] || null;

      // Extract content
      content =
        $("article, main, .content, .article-content, .post-content")
          .first()
          .text()
          .trim() || $("body").text().trim();
    }

    return NextResponse.json({ content, imageUrl, title });
  } catch (error) {
    console.error("Extraction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract content" },
      { status: 500 }
    );
  }
}