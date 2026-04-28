import Router from "@koa/router";
import splitterService from "./service.js";

const router = new Router();

router.post("/split/epub", async (ctx) => {
  const files = ctx.request.files;
  const file = files?.file || files?.files; // Common field names
  
  const singleFile = Array.isArray(file) ? file[0] : file;

  if (!singleFile || !singleFile.filepath) {
    ctx.status = 400;
    ctx.body = { error: "Missing file in request" };
    return;
  }

  try {
    const result = await splitterService.processEpub(singleFile.filepath);
    ctx.status = 200;
    ctx.body = { 
      message: "EPUB processed and vectorized successfully",
      count: result.count
    };
  } catch (error: any) {
    console.error(error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

export default router;
