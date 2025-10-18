import { Router, Response } from 'express';
import { db } from '../config/database';
import { books, chapters, blocks, users } from '../models/schema';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { eq, desc } from 'drizzle-orm';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';

const router = Router();

/**
 * Export book to HTML
 * GET /api/export/book/:bookId/html
 */
router.get('/book/:bookId/html', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookId } = req.params;
    const userId = req.user?.userId;

    // Get book with chapters and blocks from DB
    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
      with: {
        owner: true,
      }
    });

    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: 'BOOK_NOT_FOUND', message: 'Book not found' }
      });
      return;
    }

    // Check access - only owner or admin can export
    if (book.ownerId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' }
      });
      return;
    }

    // Get all chapters with blocks
    const bookChapters = await db.query.chapters.findMany({
      where: eq(chapters.bookId, bookId),
      orderBy: [chapters.position]
    });

    const chaptersWithBlocks = await Promise.all(
      bookChapters.map(async (chapter) => {
        const chapterBlocks = await db.query.blocks.findMany({
          where: eq(blocks.chapterId, chapter.id),
          orderBy: [blocks.position]
        });
        return { ...chapter, blocks: chapterBlocks };
      })
    );

    // Generate HTML
    const html = generateHTML(book, chaptersWithBlocks);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(book.title)}.html"`);
    res.send(html);
  } catch (error) {
    console.error('Export HTML error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'EXPORT_ERROR', message: 'Failed to export book' }
    });
  }
});

/**
 * Export book to DOCX
 * GET /api/export/book/:bookId/docx
 */
router.get('/book/:bookId/docx', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookId } = req.params;
    const userId = req.user?.userId;

    // Get book from DB
    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
      with: {
        owner: true,
      }
    });

    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: 'BOOK_NOT_FOUND', message: 'Book not found' }
      });
      return;
    }

    // Check access
    if (book.ownerId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' }
      });
      return;
    }

    // Get all chapters with blocks
    const bookChapters = await db.query.chapters.findMany({
      where: eq(chapters.bookId, bookId),
      orderBy: [chapters.position]
    });

    const chaptersWithBlocks = await Promise.all(
      bookChapters.map(async (chapter) => {
        const chapterBlocks = await db.query.blocks.findMany({
          where: eq(blocks.chapterId, chapter.id),
          orderBy: [blocks.position]
        });
        return { ...chapter, blocks: chapterBlocks };
      })
    );

    // Generate DOCX
    const docxBuffer = await generateDOCX(book, chaptersWithBlocks);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(book.title)}.docx"`);
    res.send(Buffer.from(docxBuffer));
  } catch (error) {
    console.error('Export DOCX error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'EXPORT_ERROR', message: 'Failed to export book' }
    });
  }
});

/**
 * Export book metadata (for PDF generation on frontend)
 * GET /api/export/book/:bookId/data
 */
router.get('/book/:bookId/data', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookId } = req.params;
    const userId = req.user?.userId;

    // Get book from DB
    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
      with: {
        owner: true,
      }
    });

    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: 'BOOK_NOT_FOUND', message: 'Book not found' }
      });
      return;
    }

    // Check access
    if (book.ownerId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access denied' }
      });
      return;
    }

    // Get all chapters with blocks
    const bookChapters = await db.query.chapters.findMany({
      where: eq(chapters.bookId, bookId),
      orderBy: [chapters.position]
    });

    const chaptersWithBlocks = await Promise.all(
      bookChapters.map(async (chapter) => {
        const chapterBlocks = await db.query.blocks.findMany({
          where: eq(blocks.chapterId, chapter.id),
          orderBy: [blocks.position]
        });
        return { ...chapter, blocks: chapterBlocks };
      })
    );

    res.json({
      success: true,
      data: {
        book,
        chapters: chaptersWithBlocks
      }
    });
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'EXPORT_ERROR', message: 'Failed to get book data' }
    });
  }
});

// Helper function to generate HTML
function generateHTML(book: any, chapters: any[]): string {
  let html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(book.title)}</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 0.5em;
      color: #1a1a1a;
    }
    h2 {
      font-size: 1.8em;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      color: #2c2c2c;
      border-bottom: 2px solid #ddd;
      padding-bottom: 0.3em;
    }
    .metadata {
      color: #666;
      margin-bottom: 2em;
      font-size: 0.9em;
    }
    .chapter {
      margin-bottom: 3em;
    }
    .block {
      margin-bottom: 1.5em;
    }
    .block-image img {
      max-width: 100%;
      height: auto;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(book.title)}</h1>
  <div class="metadata">`;

  if (book.author) html += `<p><strong>Автор:</strong> ${escapeHtml(book.author)}</p>`;
  if (book.grade) html += `<p><strong>Класс:</strong> ${book.grade}</p>`;
  if (book.description) html += `<p><strong>Описание:</strong> ${escapeHtml(book.description)}</p>`;

  html += `  </div>\n`;

  // Add chapters
  chapters.forEach((chapter) => {
    html += `  <div class="chapter">
    <h2>${escapeHtml(chapter.title)}</h2>\n`;

    if (chapter.description) {
      html += `    <p>${escapeHtml(chapter.description)}</p>\n`;
    }

    // Add blocks
    chapter.blocks.forEach((block: any) => {
      html += `    <div class="block block-${block.type}">\n`;

      if (block.type === 'text' && block.content?.text) {
        const text = block.content.html || block.content.text;
        html += `      <div>${text}</div>\n`;
      } else if (block.type === 'image' && block.content?.url) {
        html += `      <div class="block-image"><img src="${escapeHtml(block.content.url)}" alt="${escapeHtml(block.content.alt || '')}" /></div>\n`;
      } else if (block.type === 'code' && block.content?.code) {
        html += `      <pre><code>${escapeHtml(block.content.code)}</code></pre>\n`;
      }

      html += `    </div>\n`;
    });

    html += `  </div>\n`;
  });

  html += `</body>
</html>`;

  return html;
}

// Helper function to generate DOCX
async function generateDOCX(book: any, chapters: any[]): Promise<Uint8Array> {
  const docChildren: any[] = [];

  // Title
  docChildren.push(
    new Paragraph({
      text: book.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 }
    })
  );

  // Metadata
  if (book.author) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Автор: ', bold: true }),
          new TextRun(book.author)
        ],
        spacing: { after: 100 }
      })
    );
  }

  if (book.grade) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Класс: ', bold: true }),
          new TextRun(String(book.grade))
        ],
        spacing: { after: 100 }
      })
    );
  }

  if (book.description) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Описание: ', bold: true }),
          new TextRun(book.description)
        ],
        spacing: { after: 300 }
      })
    );
  }

  // Chapters
  chapters.forEach((chapter) => {
    // Chapter title
    docChildren.push(
      new Paragraph({
        text: chapter.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    if (chapter.description) {
      docChildren.push(
        new Paragraph({
          text: chapter.description,
          spacing: { after: 200 }
        })
      );
    }

    // Blocks
    chapter.blocks.forEach((block: any) => {
      if (block.type === 'text' && block.content?.text) {
        docChildren.push(
          new Paragraph({
            text: block.content.text,
            spacing: { after: 150 }
          })
        );
      } else if (block.type === 'code' && block.content?.code) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: block.content.code,
                font: 'Courier New'
              })
            ],
            spacing: { after: 150 }
          })
        );
      }
    });
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: docChildren
    }]
  });

  return await Packer.toBuffer(doc);
}

// Helper to escape HTML
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export default router;
