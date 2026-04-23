// 封装 client
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";

class Client {
  constructor(apiKey, modelName, baseURL) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.baseURL = baseURL;
    this.model = null;
    this.messages = [];
    this.tools = [];
    this.toolMap = {}; // 用于存储工具名到函数的映射
  }

  createClient(temperature = 0) {
    this.model = new ChatOpenAI({
      modelName: this.modelName,
      apiKey: this.apiKey,
      configuration: {
        baseURL: this.baseURL,
      },
      temperature,
    });
  }

  // 改进：支持批量注册或单个对象注册
  registerTools(tools) {
    const toolList = Array.isArray(tools) ? tools : [tools];
    for (const t of toolList) {
      const langchainTool = tool(t.func, {
        name: t.name,
        description: t.description,
        schema: t.schema,
      });
      this.tools.push(langchainTool);
      this.toolMap[t.name] = t.func; // 自动维护映射表
    }
    
    if (!this.model) {
      throw new Error("请先创建模型再绑定工具");
    }
    this.model = this.model.bindTools(this.tools);
  }

  async invoke() {
    if (!this.model) {
      throw new Error("请先创建模型");
    }
    const res = await this.model.invoke(this.messages);
    this.messages.push(res); // 自动记住 AI 的回复
    return res;
  }

  addMessage(msg, type) {
    if (type === "user") {
      this.messages.push(new HumanMessage(msg));
    } else if (type === "system") {
      this.messages.push(new SystemMessage(msg));
    } else if (type === "tool") {
      // msg 应该包含 { content: string, tool_call_id: string }
      this.messages.push(new ToolMessage(msg));
    } else {
      this.messages.push(msg);
    }
  }
}

export default Client;
