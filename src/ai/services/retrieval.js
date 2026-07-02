const { getPineconeIndex, TOP_K } = require("../config/pinecone");

async function retrieveContext(query) {
  if (!process.env.PINECONE_API_KEY) {
    return null;
  }

  try {
    const index = getPineconeIndex();
    if (!index) return null;
    const results = await index.searchRecords({
      query: {
        inputs: { text: query },
        topK: TOP_K,
      },
      fields: ["text", "source", "chapter"],
    });

    const matches = results?.result?.hits || [];
    if (!matches.length) return null;

    const contextChunks = matches
      .filter((match) => match._score > 0.5)
      .map((match, i) => {
        const source = match.fields?.source || "Unknown source";
        const chapter = match.fields?.chapter || "";
        const text = match.fields?.text || "";
        const label = chapter ? `${source} — ${chapter}` : source;
        return `[${i + 1}] ${label}:\n${text}`;
      });

    return contextChunks.length ? contextChunks.join("\n\n") : null;
  } catch (err) {
    console.error("[ai.retrieval] Pinecone search failed:", err?.message || err);
    return null;
  }
}

module.exports = { retrieveContext };
