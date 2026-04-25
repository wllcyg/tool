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

  registerTools(tools) {
    const toolList = Array.isArray(tools) ? tools : [tools];
    for (const t of toolList) {
      const langchainTool = tool(t.func, {
        name: t.name,
        description: t.description,
        schema: t.schema,
      });
      this.tools.push(langchainTool);
      this.toolMap[t.name] = t.func;
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
      this.messages.push(new ToolMessage(msg));
    } else {
      this.messages.push(msg);
    }
  }

  /**
   * 封装 Agent 运行循环
   * @param {string} userInput 用户输入的消息
   */
  async chat(userInput) {
    if (userInput) {
      this.addMessage(userInput, "user");
    }

    let res = await this.invoke();

    // ReAct 循环
    while (res.tool_calls && res.tool_calls.length > 0) {
      for (const toolCall of res.tool_calls) {
        const selectedToolFn = this.toolMap[toolCall.name];
        if (selectedToolFn) {
          try {
            const result = await selectedToolFn(toolCall.args);
            this.addMessage(
              {
                content:
                  typeof result === "string" ? result : JSON.stringify(result),
                tool_call_id: toolCall.id,
              },
              "tool",
            );
          } catch (error) {
            this.addMessage(
              {
                content: `Error: ${error.message}`,
                tool_call_id: toolCall.id,
              },
              "tool",
            );
          }
        }
      }
      res = await this.invoke();
    }
    return res;
  }
}

export default Client;
