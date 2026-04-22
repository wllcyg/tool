import { ChatOpenAI } from "@langchain/openai";
import { config } from "dotenv";

config();

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const response = await model.invoke("你简单介绍一下自己");
console.log(response);
