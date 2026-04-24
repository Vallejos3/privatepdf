import { PDFDocument } from 'pdf-lib';

export async function loadPdfSafe(file: File): Promise<PDFDocument> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    return await PDFDocument.load(arrayBuffer);
  } catch (error) {
    throw new Error('PDF is encrypted or corrupted. Please provide an unencrypted PDF.');
  }
}

export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    const pdf = await loadPdfSafe(file);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(page => mergedPdf.addPage(page));
  }
  return mergedPdf.save();
}

export function parsePageRange(range: string): number[] {
  const pages: number[] = [];
  const parts = range.split(',').map(s => s.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (isNaN(start) || isNaN(end)) continue;
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page)) pages.push(page);
    }
  }
  return pages;
}

export function filterValidPageRange(range: string, pageCount: number): number[] {
  const pages = parsePageRange(range);
  return pages.filter(page => page >= 1 && page <= pageCount);
}

export async function getPageCount(file: File): Promise<number> {
  const pdf = await loadPdfSafe(file);
  return pdf.getPageCount();
}

export async function splitPdf(file: File, range: string): Promise<Uint8Array> {
  const pdf = await loadPdfSafe(file);
  const pageCount = pdf.getPageCount();
  const validPages = filterValidPageRange(range, pageCount);
  if (validPages.length === 0) {
    throw new Error(`Page range invalid for this PDF. Enter pages between 1 and ${pageCount}.`);
  }
  const newPdf = await PDFDocument.create();
  const pageIndices = validPages.map(p => p - 1);
  const copiedPages = await newPdf.copyPages(pdf, pageIndices);
  copiedPages.forEach(page => newPdf.addPage(page));
  return newPdf.save();
}

export async function rotatePdf(file: File, rotation: number): Promise<Uint8Array> {
  const pdf = await loadPdfSafe(file);
  const pages = pdf.getPages();
  pages.forEach(page => {
    const currentRotation = page.getRotation();
    page.setRotation({ angle: currentRotation.angle + rotation, type: currentRotation.type });
  });
  return pdf.save();
}

export async function watermarkPdf(file: File, watermarkText: string): Promise<Uint8Array> {
  const pdf = await loadPdfSafe(file);
  const pages = pdf.getPages();
  const font = await pdf.embedFont('Helvetica');
  pages.forEach(page => {
    const { width, height } = page.getSize();
    page.drawText(watermarkText, {
      x: width / 2 - (watermarkText.length * 10) / 2,
      y: height / 2,
      size: 50,
      font,
      opacity: 0.3,
    });
  });
  return pdf.save();
}

export async function optimizePdf(file: File): Promise<Uint8Array> {
  const pdf = await loadPdfSafe(file);
  // pdf-lib doesn't have built-in optimization, but saving can sometimes reduce size
  return pdf.save();
}