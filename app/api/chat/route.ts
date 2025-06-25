import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { DataAPIClient } from "@datastax/astra-db-ts";

export const runtime = "edge";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY,
} = process.env;

const astraClient = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = astraClient.db(ASTRA_DB_API_ENDPOINT!, {
  keyspace: ASTRA_DB_NAMESPACE!,
});

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    const userMessage = messages
      ?.filter((msg) => msg.role === "user")
      .at(-1)?.content;

    let context = "";

    if (userMessage) {
      const { default: OpenAI } = await import("openai");
      const openaiAdk = new OpenAI({ apiKey: OPENAI_API_KEY });

      const embeddingResponse = await openaiAdk.embeddings.create({
        model: "text-embedding-3-small",
        input: userMessage,
        encoding_format: "float",
      });
      const vector = embeddingResponse.data[0].embedding;

      const collection = await db.collection(ASTRA_DB_COLLECTION!);
      const cursor = await collection.find(
        {},
        { limit: 10, sort: { $vector: vector } },
      );

      const results = [];
      for await (const doc of cursor) {
        results.push(doc);
      }

      context = results.map((doc) => doc.text).join("\n---\n");
    }

    const systemPrompt = context
      ? `Use the following information from the Minneapolis Institute of Art's collection to answer the user's question:\n${context}`
      : "You are a helpful assistant knowledgeable about the Art collection of the Minneapolis Institute of Art.";

    const result = await streamText({
      model: openai.chat("gpt-3.5-turbo"),
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    });
    return result.toDataStreamResponse();
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
