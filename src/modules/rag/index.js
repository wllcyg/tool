import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { config } from "dotenv";
import { client } from "../../core/index.js";
import documents from "./documents.js";
import chalk from "chalk";
import { getPageContent } from "../loader/index.js";
config();

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-v4",
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const doc = await getPageContent();
console.log("我们获取到到了 几个文档", doc.length);

const vectorStore = await MemoryVectorStore.fromDocuments(doc, embeddings);

const retrieve = vectorStore.asRetriever({ k: 3 });

const query = "AI 是不是来淘汰老程序员的?";

const startchart = async (question) => {
  console.log(chalk.blue.bold("\n[问题]"), chalk.cyan(question));

  // 获取文档
  process.stdout.write(chalk.yellow("正在检索档案... "));
  const retrievedDocs = await retrieve.invoke(question);
  console.log(chalk.green("完成"));

  // 构建 prompt
  const context = retrievedDocs
    .map((doc) => `姓名：${doc.metadata.character}\n简介：${doc.pageContent}`)
    .join("\n\n");
  const prompt = `
    你是一个档案管理员,根据以下档案内容回答用户的问题：
    档案内容: ${context}
    用户问题：${question}
    请根据以上档案内容回答用户的问题。
  `;
  await client.addMessage(prompt, "user");

  process.stdout.write(chalk.yellow("AI 正在思考... "));
  const response = await client.invoke();
  console.log(chalk.green("完成\n"));

  console.log(chalk.bgBlue.white.bold(" AI 回复 "), "\n");
  console.log(chalk.white(response.content));
  console.log(chalk.gray("\n" + "─".repeat(50) + "\n"));
};

startchart(query);
