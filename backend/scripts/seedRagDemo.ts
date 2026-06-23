import dotenv from "dotenv";

process.env.DOTENV_CONFIG_QUIET ??= "true";
dotenv.config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { ingestDocument, listDocuments } from "../services/ragService";

async function main() {
  const demoDataDir = path.join(__dirname, "demo-data");

  if (!fs.existsSync(demoDataDir)) {
    console.error(`demo-data directory not found at: ${demoDataDir}`);
    console.error("Create the directory and add PDF files to seed.");
    process.exit(1);
  }

  const files = fs
    .readdirSync(demoDataDir)
    .filter((f) => f.toLowerCase().endsWith(".pdf"));

  if (files.length === 0) {
    console.error("No PDF files found in backend/scripts/demo-data/");
    console.error("Add CMS policy PDFs to that directory and re-run.");
    process.exit(1);
  }

  const existing = await listDocuments();
  const alreadyIngested = new Set(existing.map((d) => d.sourceFile));

  const toIngest = files.filter((f) => !alreadyIngested.has(f));
  console.log(
    `Found ${files.length} PDF(s), ${alreadyIngested.size} already ingested, ${toIngest.length} to process...`,
  );

  for (const filename of toIngest) {
    console.log(`  Ingesting: ${filename}`);
    const buffer = fs.readFileSync(path.join(demoDataDir, filename));
    const result = await ingestDocument(buffer, filename);
    console.log(`    ✓ ${result.chunksCreated} chunks created`);
  }

  console.log("RAG demo seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
