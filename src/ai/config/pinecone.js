const { Pinecone } = require("@pinecone-database/pinecone");

let pineconeClient = null;

function getPineconeClient() {
  if (!process.env.PINECONE_API_KEY) return null;
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return pineconeClient;
}

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || "dls-chatbot";
const TOP_K = parseInt(process.env.PINECONE_TOP_K, 10) || 5;

function getPineconeIndex() {
  const client = getPineconeClient();
  if (!client) return null;
  return client.index(INDEX_NAME).namespace("dls-books");
}

module.exports = {
  getPineconeClient,
  getPineconeIndex,
  INDEX_NAME,
  TOP_K,
};
