import Koa from "koa";
import cors from "@koa/cors";
import { koaBody } from "koa-body";

import { initMilvus, initEbookCollection } from "./milvus/init.js";
import chatRouter from "./chat/controller.js";
import splitterRouter from "./splitter/controller.js";

// ── 全局错误监听 ─────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err?.stack || err);
});
process.on("unhandledRejection", (reason: any) => {
  console.error("unhandledRejection:", reason?.stack || reason);
});

// ── App 配置 ──────────────────────────────────────────────────
const app = new Koa();
app.use(cors());
app.use(koaBody({
  multipart: true,
  formidable: {
    maxFileSize: 200 * 1024 * 1024, // 200MB
    keepExtensions: true,
  }
}));

// ── 路由挂载 ──────────────────────────────────────────────────
app.use(splitterRouter.routes());
app.use(chatRouter.routes());

// ── 打印路由信息 ─────────────────────────────────────────────
[chatRouter, splitterRouter].forEach(router => {
  router.stack.forEach(layer => {
    const methods = layer.methods.filter(m => m !== 'HEAD').join('|');
    console.log(`📡 Route: [${methods}] ${layer.path}`);
  });
});

// ── 启动 ──────────────────────────────────────────────────────
const PORT = 3001;
initMilvus().catch(console.error);
initEbookCollection().catch(console.error);
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
