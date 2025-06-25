// import fs from "node:fs/promises";
import { DataAPIClient } from "@datastax/astra-db-ts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import OpenAI from "openai";

import { config } from "dotenv";
config();

interface ArtsmiaItem {
  id?: string | number;
  title?: string;
  artist?: string;
  culture?: string;
  dated?: string;
  medium?: string;
  department?: string;
  text?: string;
  name?: string;
  description?: string;
  dateBegin?: string;
  dateEnd?: string;
  displayDate?: string;
}

type TSimilarityMetric = "dot_product" | "cosine" | "euclidean";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY,
} = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, {
  keyspace: ASTRA_DB_NAMESPACE,
});

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

// * To get a list of all JSON files in repo `atrsmia/collection`:
const getGitHubJsonPaths = async (): Promise<string[]> => {
  const response = await fetch(
    "https://api.github.com/repos/artsmia/collection/git/trees/main?recursive=1",
  );
  if (!response.ok) throw new Error("🔴 Failed to fetch GitHub file tree");

  const data: { tree: { path: string; type: string }[] } =
    await response.json();
  return data.tree
    .filter(
      (entry: { path: string; type: string }) =>
        entry.type === "blob" && entry.path.endsWith(".json"),
    )
    .map((entry: Record<string, string>) => entry.path);
};

// * Generate a text representations of the content
const getTextContent = (type: string, item: ArtsmiaItem): string => {
  if (type === "objects") {
    return `
      Type: Object
      ID: ${item.id}
      Title: ${item.title}
      Artist: ${item.artist || "Unknown"}
      Culture: ${item.culture || "N/A"}
      Date: ${item.dated || "N/A"}
      Medium: ${item.medium || "N/A"}
      Department: ${item.department || "N/A"}
      Description: ${item.text || "No description"}
    `;
  }

  if (type === "exhibitions") {
    return `
      Type: Exhibition
      Title: ${item.title || "Untitled"}
      Exhibition ID: ${item.id || "N/A"}
      Date Start: ${item.dateBegin || "N/A"}
      Date End: ${item.dateEnd || "N/A"}
      Display Date: ${item.displayDate || "N/A"}
      Description: ${item.text || "No description"}
    `;
  }

  if (type === "departments") {
    return `
      Type: Department
      ID: ${item.id || "N/A"}
      Name: ${item.name || "Unknown"}
      Description: ${item.description || "No description"}
    `;
  }

  return `
    Type: Unknown
    Content: ${JSON.stringify(item, null, 2)}
  `;
};

const createCollection = async (
  similarityMetric: TSimilarityMetric = "dot_product",
) => {
  const response = await db.createCollection(ASTRA_DB_COLLECTION, {
    vector: {
      dimension: 1536,
      metric: similarityMetric,
    },
  });

  console.log("✅ [Artsmia Collection]: Created successfully", response);
};

const splitPathsArrayIntoChunks = <T>(array: T[], chunkSize: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += 1) {
    result.push(array.slice(i, i + chunkSize));
  }

  return result;
};

const loadSampleData = async () => {
  const paths: string[] = (await getGitHubJsonPaths()).filter((p) =>
    p.startsWith("objects/"),
  );
  const collection = await db.collection(ASTRA_DB_COLLECTION);

  //* Batch size: 10 files at a time
  const batches = splitPathsArrayIntoChunks(paths, 10);

  // const sessionLogName = `embeddings-log-${Date.now()}.json`;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];

    console.log(`🟡 Processing batch ${batchIndex + 1} of ${batches.length}`);

    const results: PromiseSettledResult<void>[] = await Promise.allSettled(
      batch.map(async (path: string): Promise<void> => {
        const url = `https://raw.githubusercontent.com/artsmia/collection/main/${path}`;
        const type = path.split("/")[0];

        try {
          const res = await fetch(url);
          if (!res.ok) {
            console.warn(`⚪️ Skipping ${url} (status: ${res.status})`);
            return;
          }

          /**
           * @info I found out that some JSON files in `artsmia/collection` are empty.
           * So, I decided to refactor for this solution, instead of:
           * `const item: ArtsmiaItem = await res.json();`
           * */
          const text = await res.text();

          //* Skip empty files
          if (!text.trim()) {
            console.warn(`⚪️ Skipping ${url}: empty file`);
            return;
          }

          let item: ArtsmiaItem;

          try {
            item = JSON.parse(text);
          } catch (error) {
            if (error instanceof Error) {
              console.warn(`⚪️ Skipping ${url}: invalid JSON`);
              return;
            }
          }
          const content = getTextContent(type, item);
          const chunks: string[] = await splitter.splitText(content);

          for (let j = 0; j < chunks.length; j += 1) {
            const chunk = chunks[j];

            const exists = await collection.findOne({ text: chunk });
            if (exists) {
              console.log(
                `⚪️ [${j + 1}/${chunks.length}] ${path}: Already exists`,
              );
              continue;
            }

            const embedding = await openai.embeddings.create({
              model: "text-embedding-3-small",
              input: chunk,
              encoding_format: "float",
            });

            const vector = embedding.data[0].embedding;

            await collection.insertOne({
              $vector: vector,
              text: chunk,
              source: url,
              type: type,
            });

            console.log(`🟢 ${path} [${j + 1}/${chunks.length}]: Inserted`);

            //* This is to let a bit between requests to OpenAI:
            await new Promise((res) => setTimeout(res, 100));

            //* Embeddings Log keeper:
            // await fs.appendFile(
            //   sessionLogName,
            //   JSON.stringify(
            //     {
            //       type,
            //       source: url,
            //       chunk,
            //       vector,
            //     },
            //     null,
            //     2,
            //   ) + ",\n",
            // );
          }
        } catch (error) {
          if (error instanceof Error)
            console.error(
              `🔴 Error processing ${path}:`,
              (error as Error).message,
            );
        }
      }),
    );

    const fulfilled = results.filter(
      (result) => result.status === "fulfilled",
    ).length;
    const rejected = results.length - fulfilled;
    console.log(
      `✅ Batch ${batchIndex + 1} was complete.\n\tSuccess: ${fulfilled},\n\tFailed: ${rejected}`,
    );
  }

  console.log("✅ All JSON data loaded into Astra DB.");
};

// createCollection().then(() => loadSampleData());
(async () => {
  const start = Date.now();

  try {
    const existingCollections = await db.listCollections();
    const collectionNames = existingCollections.map((c) => c.name);

    if (!collectionNames.includes(ASTRA_DB_COLLECTION!)) {
      console.log(
        `🆕 Collection "${ASTRA_DB_COLLECTION}" does not exist. Creating...`,
      );
      await createCollection();
    } else {
      console.log(
        `ℹ️ Collection "${ASTRA_DB_COLLECTION}" already exists. Skipping creation.`,
      );
    }

    await loadSampleData();
  } catch (error) {
    console.error("❌ Seeding error:", (error as Error).message);
    process.exit(1);
  }

  const end = Date.now();
  console.log(`✅ Done in ${((end - start) / 1000).toFixed(1)}s`);
})();
