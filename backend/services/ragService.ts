import { GoogleGenerativeAI } from "@google/generative-ai";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { documentChunks } from "../../db/document-chunks";

function getGemini(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY environment variable is not set");
  return new GoogleGenerativeAI(key);
}

// Retry transient Gemini 503 (overload) with exponential backoff.
// Note: we deliberately do NOT retry 429 (rate limit) — an inline retry
// lands inside the same per-minute window, so it just burns more quota
// and the request timeout. 429s surface to the controller as-is.
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable =
        msg.includes("503") ||
        msg.includes("Service Unavailable") ||
        msg.includes("overloaded");
      if (!retryable || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
    }
  }
  throw lastErr;
}

function chunkText(text: string, chunkSize = 2000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const chunk = text.slice(start, start + chunkSize).trim();
    if (chunk.length > 0) chunks.push(chunk);
    start += chunkSize - overlap;
  }
  return chunks;
}

async function embedTexts(genAI: GoogleGenerativeAI, texts: string[]): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const embeddings: number[][] = [];
  for (const text of texts) {
    const result = await withRetry(() => model.embedContent(text));
    embeddings.push(result.embedding.values);
  }
  return embeddings;
}

export async function ingestDocument(
  buffer: Buffer,
  filename: string,
): Promise<{ chunksCreated: number }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require("pdf-parse") as {
    PDFParse: new (data: Uint8Array) => {
      load(): Promise<void>;
      getText(): Promise<{ text: string; total: number }>;
    };
  };
  const parser = new PDFParse(new Uint8Array(buffer));
  await parser.load();
  const { text } = await parser.getText();
  const chunks = chunkText(text);
  if (chunks.length === 0) return { chunksCreated: 0 };

  const genAI = getGemini();
  const db = getDb();

  for (let i = 0; i < chunks.length; i += 5) {
    const batch = chunks.slice(i, i + 5);
    const embeddings = await embedTexts(genAI, batch);
    for (let j = 0; j < batch.length; j++) {
      await db.insert(documentChunks).values({
        content: batch[j]!,
        embedding: embeddings[j]!,
        sourceFile: filename,
        chunkIndex: i + j,
        metadata: null,
      });
    }
    if (i + 5 < chunks.length) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return { chunksCreated: chunks.length };
}

type Source = { file: string; excerpt: string; similarity: number };

type RawChunkRow = {
  content: string;
  source_file: string;
  similarity: number | string;
};

export async function queryDocuments(
  question: string,
): Promise<{ answer: string; sources: Source[] }> {
  const genAI = getGemini();
  const db = getDb();

  const [questionEmbedding] = await embedTexts(genAI, [question]);
  const vectorStr = `[${questionEmbedding!.join(",")}]`;

  const rows = (await db.execute(
    sql`SELECT content, source_file, 1 - (embedding <=> ${vectorStr}::vector) as similarity
        FROM document_chunks
        ORDER BY embedding <=> ${vectorStr}::vector
        LIMIT 10`,
  )) as RawChunkRow[];

  const filtered = rows.filter((r) => Number(r.similarity) > 0.2);

  if (filtered.length === 0) {
    return {
      answer:
        "I don't have enough information in the uploaded documents to answer that question.",
      sources: [],
    };
  }

  const sources: Source[] = filtered.map((r) => ({
    file: r.source_file,
    excerpt: r.content.slice(0, 400),
    similarity: Math.round(Number(r.similarity) * 100) / 100,
  }));

  // Use full chunk content for the model, not the truncated excerpt
  const context = filtered
    .map((r, i) => `[Source ${i + 1}: ${r.source_file}]\n${r.content}`)
    .join("\n\n");

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `You are a clinical policy assistant for a wound care and tissue products portal. Answer the user's question using the provided context from uploaded policy documents. Cite the source document name when referencing information. Synthesize and summarize information from multiple sources when helpful. If the context genuinely does not contain relevant information, say so briefly.

Context:
${context}

Question: ${question}`;

  const result = await withRetry(() => model.generateContent(prompt));
  const answer = result.response.text();

  return { answer, sources };
}

export async function listDocuments(): Promise<
  Array<{ sourceFile: string; chunkCount: number; ingestedAt: string }>
> {
  const db = getDb();
  const rows = (await db.execute(
    sql`SELECT source_file, COUNT(*) as chunk_count, MIN(created_at) as ingested_at
        FROM document_chunks
        GROUP BY source_file
        ORDER BY MIN(created_at) DESC`,
  )) as Array<{ source_file: string; chunk_count: string; ingested_at: string }>;

  return rows.map((r) => ({
    sourceFile: r.source_file,
    chunkCount: parseInt(r.chunk_count, 10),
    ingestedAt: r.ingested_at,
  }));
}

export async function deleteDocument(filename: string): Promise<void> {
  const db = getDb();
  await db.execute(sql`DELETE FROM document_chunks WHERE source_file = ${filename}`);
}
