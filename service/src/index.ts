import Koa from "koa";
import Router from "@koa/router";
import cors from "@koa/cors";
import { PassThrough } from "stream";
import milvusStore from "./milvus/index.js";
import embeddingsService from "./embedding/index.js";
import { COLLECTION_NAME } from "./milvus/index.js";
import { AI_DIARY_SCHEMA } from "./milvus/schema.js";
import { IndexType, MetricType } from "@zilliz/milvus2-sdk-node";
import Client from "./util/client.js";
import { UserPrompt } from "./prompt/index.js";
import data from "./data.js";

const app = new Koa();
process.on('uncaughtException', (err) => {
  console.error("uncaughtException:", err, err?.stack || "");
  console.error("Stringified error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
});
process.on('unhandledRejection', (reason: any) => {
  console.error("unhandledRejection:", reason, reason?.stack || "");
  console.error("Stringified reason:", JSON.stringify(reason, Object.getOwnPropertyNames(reason || {}), 2));
});
app.use(cors());
const router = new Router();

const agent = new Client({
  apiKey: process.env.OPENAI_API_KEY,
});

async function initMilvus() {
  console.log("start connecting to Milvus");
  await milvusStore.connect();
  console.log("Connected to Milvus");

  const hasCollection = await milvusStore.client.hasCollection({
    collection_name: COLLECTION_NAME,
  });

  if (!hasCollection.value) {
    console.log("Collection not found. Creating and initializing data...");
    await milvusStore.CreateCollection({
      collection_name: COLLECTION_NAME,
      fields: AI_DIARY_SCHEMA,
    });

    await milvusStore.CreateIndex({
      collection_name: COLLECTION_NAME,
      field_name: "vector",
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE,
      params: { nlist: 1024 },
    });
    console.log("Index created");

    const embeddings = await Promise.all(
      data.map(async (item) => ({
        ...item,
        vector: await embeddingsService.embedQuery(item.content),
      })),
    );

    const insertResult = await milvusStore.Insert({
      collection_name: COLLECTION_NAME,
      data: embeddings,
    });
    console.log(`✓ Inserted ${insertResult.insert_cnt} records`);
  } else {
    console.log("Collection already exists, skipping initialization.");
  }
}

initMilvus().catch(console.error);

router.get("/chat/stream", async (ctx) => {
  const question = ctx.query.question as string;
  if (!question) {
    ctx.status = 400;
    ctx.body = "Missing question";
    return;
  }

  // SSE header settings
  ctx.request.socket.setTimeout(0);
  ctx.req.socket.setNoDelay(true);
  ctx.req.socket.setKeepAlive(true);

  ctx.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const stream = new PassThrough();
  ctx.status = 200;
  ctx.body = stream;

  try {
    // 向量化数据并检索
    const queryVec = await embeddingsService.embedQuery(question);
    const search = await milvusStore.Search({ vectors: queryVec });
    let context = "";
    if (search.results && search.results.length > 0) {
      context = search.results
        .map((diary, i) => {
          return `[日记 ${i + 1}]
日期: ${diary.date}
心情: ${diary.mood}
标签: ${diary.tags?.join(", ")}
内容: ${diary.content}`;
        })
        .join("\n\n━━━━━\n\n");
    }

    const promptStr = UserPrompt(context, question);

    // 调用 streamChat 获取可迭代回答
    const streamIter = agent.streamChat(promptStr);

    for await (const chunk of streamIter) {
      // 按照 SSE 规范，写入格式: data: {JSON}\n\n
      stream.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }

    stream.write("data: [DONE]\n\n");
    stream.end();
  } catch (error: any) {
    console.error(error);
    stream.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    stream.end();
  }
});

app.use(router.routes());

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Koa SSE Server running on http://localhost:${PORT}`);
});
