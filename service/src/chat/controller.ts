import Router from "@koa/router";
import { PassThrough } from "stream";
import milvusStore from "../milvus/index.js";
import embeddingsService from "../embedding/index.js";
import Client from "../util/client.js";
import { UserPrompt } from "../prompt/index.js";

const router = new Router();

const agent = new Client({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const streamIter = agent.streamChat(promptStr);

    for await (const chunk of streamIter) {
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

export default router;
