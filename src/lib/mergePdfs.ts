import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Product } from '../types';

const LINES_PER_CONTENTS_PAGE = 42;
const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const LINE_HEIGHT = 18;
const TITLE_SIZE = 20;
const ENTRY_SIZE = 12;

interface MergeEntry {
  product: Product;
  pageCount: number;
  startPage: number; // 1-indexed page in the final merged document
}

/**
 * Merges the selected products' PDFs into one document, prefixed with a
 * Table of Contents page (or pages) listing each product and the page it
 * starts on. Products are sorted by type then name before merging so the
 * Contents order always matches the merged page order.
 */
export async function mergeSelectedPdfs(selected: Product[]): Promise<Uint8Array> {
  const sorted = [...selected].sort((a, b) => {
    const t = a.type.localeCompare(b.type);
    if (t !== 0) return t;
    return a.name.localeCompare(b.name);
  });

  // Fetch and load every source PDF first so we know page counts up front.
  const loaded = await Promise.all(
    sorted.map(async (product) => {
      if (product.pdfUrl.includes('drive.google.com')) {
        throw new Error(
          `"${product.name}" still points at a Google Drive PDF, which can't be fetched for merging (CORS). Re-upload it to Firebase Storage first.`
        );
      }
      let res: Response;
      try {
        res = await fetch(product.pdfUrl);
      } catch {
        throw new Error(`Could not reach the PDF for ${product.name}.`);
      }
      if (!res.ok) throw new Error(`Could not download PDF for ${product.name}`);
      const bytes = await res.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      return { product, doc, pageCount: doc.getPageCount() };
    })
  );

  const contentsPageCount = Math.max(1, Math.ceil(loaded.length / LINES_PER_CONTENTS_PAGE));

  const entries: MergeEntry[] = [];
  let cursor = contentsPageCount + 1; // first product page, 1-indexed
  for (const item of loaded) {
    entries.push({ product: item.product, pageCount: item.pageCount, startPage: cursor });
    cursor += item.pageCount;
  }

  const merged = await PDFDocument.create();
  const font = await merged.embedFont(StandardFonts.Helvetica);
  const boldFont = await merged.embedFont(StandardFonts.HelveticaBold);

  // --- Contents page(s) ---
  let page = merged.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  page.drawText('Table of Contents', { x: MARGIN, y, size: TITLE_SIZE, font: boldFont });
  y -= TITLE_SIZE + 20;

  let lineCountOnPage = 0;
  for (const entry of entries) {
    if (lineCountOnPage >= LINES_PER_CONTENTS_PAGE) {
      page = merged.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
      lineCountOnPage = 0;
    }
    const label = `${entry.product.type} — ${entry.product.name}`;
    const pageLabel = `p. ${entry.startPage}`;
    page.drawText(label, { x: MARGIN, y, size: ENTRY_SIZE, font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(pageLabel, ENTRY_SIZE),
      y,
      size: ENTRY_SIZE,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= LINE_HEIGHT;
    lineCountOnPage += 1;
  }

  // --- Copy every product's pages in sorted order ---
  for (const item of loaded) {
    const copiedPages = await merged.copyPages(item.doc, item.doc.getPageIndices());
    copiedPages.forEach((p) => merged.addPage(p));
  }

  return merged.save();
}

export function downloadMergedPdf(bytes: Uint8Array, filename = 'kk-umbrellas-catalog.pdf') {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
