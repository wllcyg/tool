import Router from "@koa/router";
import { PassThrough } from "stream";
import milvusStore from "../milvus/index.js";
import embeddingsService from "../embedding/index.js";
import Client from "../util/client.js";
import { UserPrompt } from "../prompt/index.js";

import { COLLECTION_NAME_EBOOK, SIMILARITY_THRESHOLD } from "../contance/index.js";

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
    
    // 1. 并行搜索日记和电子书集合
    const [diarySearch, ebookSearch] = await Promise.all([
      milvusStore.Search({ vectors: queryVec }), // 默认是 ai_diary
      milvusStore.Search({ vectors: queryVec, collection_name: COLLECTION_NAME_EBOOK })
    ]);

    let context = "";

    // 2. 提取并格式化日记内容
    const filteredDiaries = (diarySearch.results || []).filter(res => res.score > SIMILARITY_THRESHOLD);
    if (filteredDiaries.length > 0) {
      const diaryText = filteredDiaries
        .map((diary, i) => {
          return `[日记资源 ${i + 1}] 日期: ${diary.date}, 内容: ${diary.content}`;
        })
        .join("\n");
      context += "【个人日记相关信息】\n" + diaryText + "\n\n";
    }

    // 3. 提取并格式化电子书内容
    const filteredEbooks = (ebookSearch.results || []).filter(res => res.score > SIMILARITY_THRESHOLD);
    if (filteredEbooks.length > 0) {
      const ebookText = filteredEbooks
        .map((ebook, i) => {
          return `[小说资源 ${i + 1}] 书名: ${ebook.book_name}, 章节: ${ebook.chapter_num}, 索引: ${ebook.index}, 内容: ${ebook.content}`;
        })
        .join("\n");
      context += "【小说书籍相关信息】\n" + ebookText;
    }

    // 4. 将混合上下文发送给 AI
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
