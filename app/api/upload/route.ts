import { NextRequest, NextResponse } from "next/server";
import * as mammoth from "mammoth";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import pdf from 'pdf-parse';
import { generateTitle } from "@/lib/ai";
import { getTextExtractor } from 'office-text-extractor';

// Ensure these are set for proper API route handling
export const config = {
  api: {
    bodyParser: false,
  },
};

// Keep these exports
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper function to sanitize text
function sanitizeText(text: string) {
  return text
    .replace(/\u0000/g, '') // Remove null bytes
    .replace(/[\uD800-\uDFFF]/g, '') // Remove unpaired surrogate pairs
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Replace non-printable characters with spaces
    .trim();
}

// Remove unused imports and implement PDF handling directly
async function extractTextFromPdf(buffer: ArrayBuffer) {
  const data = await pdf(Buffer.from(buffer));
  return sanitizeText(data.text);
}

export async function POST(req: NextRequest) {
  try {
    console.log("Upload route hit");
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    console.log("File type:", file?.type);
    console.log("User ID:", userId);

    if (!file || !userId) {
      console.log("Missing required data:", { file: !!file, userId: !!userId });
      return NextResponse.json({ 
        error: !file ? 'No file provided' : 'No user ID provided' 
      }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    let content = '';
    let title = file.name;

    if (file.type === 'application/pdf') {
      console.log("Processing PDF file");
      content = await extractTextFromPdf(buffer);
      title = await generateTitle(content);
    } else {
      console.log("Processing non-PDF file");
      content = sanitizeText(await file.text());
      title = await generateTitle(content);
    }

    console.log("Content extracted, length:", content.length);
    console.log("Generated title:", title);

    if (!content) {
      return NextResponse.json({ error: 'No content could be extracted' }, { status: 400 });
    }

    return NextResponse.json({ content, title, userId });

  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file' },
      { status: 500 }
    );
  }
}