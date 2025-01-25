import { NextRequest, NextResponse } from "next/server";
import * as mammoth from "mammoth";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import pdf from 'pdf-parse';
import { generateTitle } from "@/lib/ai";
import { getTextExtractor  } from 'office-text-extractor';

// Ensure these are set for proper API route handling
export const config = {
  api: {
    bodyParser: false,
  },
};

// Keep these exports
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log("API route hit - Method:", request.method);
  
  if (request.method !== 'POST') {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    console.log('Request received');
    console.log('File:', file?.name);

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = join(tmpdir(), file.name);
    await writeFile(tempPath, buffer);

    let content = "";
    let title = file.name;
    let imageUrl = null;

    const fileType = file.name.split('.').pop()?.toLowerCase();

    const extractor = getTextExtractor();

    try {
      switch (fileType) {
        case 'pdf':
          const pdfData = await pdf(buffer);
          content = pdfData.text;
          title = await generateTitle(content);
          break;

        case 'docx':
          const docxResult = await mammoth.extractRawText({ path: tempPath });
          content = docxResult.value;
          title = await generateTitle(content);
          break;

        case 'txt':
        case 'md':
          content = buffer.toString('utf-8');
          title = await generateTitle(content);
          break;

        case 'pptx':
        case 'ppt':
        case 'pptm':
          try {
            content = await extractor.extractText({ input: buffer, type: 'buffer' })
            title = await generateTitle(content);
          } catch (pptError) {
            console.error('PowerPoint extraction error:', pptError);
            throw new Error('Failed to extract content from PowerPoint file');
          }
          break;

        default:
          throw new Error("Unsupported file type. Please upload PDF, DOCX, TXT, MD, or PowerPoint files.");
      }

      // Clean up temp file
      await unlink(tempPath).catch(console.error);

      return NextResponse.json({
        content,
        imageUrl,
        title
      }, { status: 200 });

    } catch (error) {
      // Clean up temp file on error
      await unlink(tempPath).catch(console.error);
      throw error;
    }

  } catch (error) {
    console.error("Error processing file:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process file" },
      { status: 500 }
    );
  }
}