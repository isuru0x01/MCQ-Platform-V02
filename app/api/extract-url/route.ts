import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { PDFExtract } from 'pdf.js-extract';

export async function POST(request: Request) {
  try {
    const { url, userId } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if URL is a PDF
    const isPDF = url.toLowerCase().endsWith('.pdf');
    let content = '';
    let title = '';

    if (isPDF) {
      // Handle PDF extraction
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const pdfExtract = new PDFExtract();
      const pdfData = await pdfExtract.extractBuffer(Buffer.from(response.data));
      
      // Extract text from PDF pages
      content = pdfData.pages.map(page => 
        page.content.map(item => item.str).join(' ')
      ).join('\n');
      
      // Use filename as title if no better title is available
      title = url.split('/').pop()?.replace('.pdf', '') || 'PDF Document';
    } else {
      // Handle regular web page
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // Extract title
      title = $('title').text().trim();
      
      // Extract content (main text)
      // Remove script and style elements
      $('script, style').remove();
      
      // Get text from body or main content areas
      content = $('body').text().trim();
      
      // Try to focus on main content if available
      const mainContent = $('main, article, .content, #content, .main, #main').text().trim();
      if (mainContent) {
        content = mainContent;
      }
      
      // Clean up the content
      content = content.replace(/\s+/g, ' ').trim();
    }

    // Limit content length if needed
    const MAX_CONTENT_LENGTH = 10000;
    if (content.length > MAX_CONTENT_LENGTH) {
      content = content.substring(0, MAX_CONTENT_LENGTH);
    }

    return NextResponse.json({
      title,
      content,
      url
    });
  } catch (error) {
    console.error('Error processing URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process URL' },
      { status: 500 }
    );
  }
}