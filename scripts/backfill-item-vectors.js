import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EMBED_MODEL = "text-embedding-3-large";

function buildText(item) {
  return `
  ${item.name || ""}
  Category: ${item.category || ""}
  Description: ${item.description || ""}
  `.trim();
}

async function run() {
  const { data: items, error } = await supabase
    .from("items")
    .select("id,user_id,name,category,description");

  if (error) throw error;

  console.log("Items found:", items.length);

  for (const item of items) {
    const text = buildText(item);
    if (!text) continue;

    const embeddingResponse = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: text,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Note: item_vectors does not have a source_text column (optional). If you add it later, you can store `text` for debugging.
    const { error: upsertError } = await supabase
      .from("item_vectors")
      .upsert(
        {
          item_id: item.id,
          user_id: item.user_id,
          embedding,
        },
        { onConflict: "item_id" }
      );

    if (upsertError) throw upsertError;

    console.log("Embedded item:", item.id, item.name);
  }

  console.log("✅ Backfill complete");
}

run().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});