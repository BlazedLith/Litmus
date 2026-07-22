import { PDFParse } from "pdf-parse";

const MIN_USEFUL_CHARS = 80;

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = (result.text || "").replace(/\s+/g, " ").trim();

    if (text.length < MIN_USEFUL_CHARS) {
      throw new Error(
        "Couldn't extract text from this PDF. It may be scanned or image-only."
      );
    }

    return text;
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
