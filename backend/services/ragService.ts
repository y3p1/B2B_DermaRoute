import { GoogleGenerativeAI } from "@google/generative-ai";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { documentChunks } from "../../db/document-chunks";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require("pdf-parse") as {
  PDFParse: new (data: Uint8Array) => {
    load(): Promise<void>;
    getText(): Promise<{ text: string; total: number }>;
  };
};

function getGemini(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY environment variable is not set");
  return new GoogleGenerativeAI(key);
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
    const result = await model.embedContent(text);
    embeddings.push(result.embedding.values);
  }
  return embeddings;
}

export async function ingestDocument(
  buffer: Buffer,
  filename: string,
): Promise<{ chunksCreated: number }> {
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
        LIMIT 5`,
  )) as RawChunkRow[];

  const sources: Source[] = rows
    .filter((r) => Number(r.similarity) > 0.3)
    .map((r) => ({
      file: r.source_file,
      excerpt: r.content.slice(0, 300),
      similarity: Math.round(Number(r.similarity) * 100) / 100,
    }));

  if (sources.length === 0) {
    return {
      answer:
        "I don't have enough information in the uploaded documents to answer that question.",
      sources: [],
    };
  }

  const context = sources
    .map((s, i) => `[Source ${i + 1}: ${s.file}]\n${s.excerpt}`)
    .join("\n\n");

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = `You are a clinical policy assistant for a healthcare portal. Answer the user's question based ONLY on the provided context. Cite the source document name when referencing information. If the context doesn't contain enough information, say "I don't have enough information in the uploaded documents to answer that question."

Context:
${context}

Question: ${question}`;

  const result = await model.generateContent(prompt);
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
