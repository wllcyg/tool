import { ChatOpenAI } from "@langchain/openai";
import { tool, StructuredToolInterface } from "@langchain/core/tools";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
  BaseMessage,
  AIMessage,
  getBufferString
} from "@langchain/core/messages";
import { z } from "zod";
import { FileSystemChatMessageHistory } from "@langchain/community/stores/message/file_system";
// import { InMemoryChatMessageHistory } from "@langchain/core/chat_history"; // 内存存储方案
import path from "path";
import fs from "fs";
import { MAX_HISTORY_MESSAGES, MAX_TOKENS } from "../contance/index.js";
import { countTokens } from "./tiktoken.js";
/**
 * 工具配置接口
 */
export interface ToolConfig {
  name: string;
  description: string;
  schema: z.ZodObject<any> | z.ZodTypeAny;
  func: (args: any) => Promise<any>;
}

class Client {
  private apiKey: string;
  private modelName: string;
  private baseURL: string;
  private maxIterations: number;
  private temperature: number;
  private model: any;
  private baseModel: any; // 基础模型，用于总结任务
  private history: FileSystemChatMessageHistory;
  // private history: InMemoryChatMessageHistory; // 内存存储方案
  private tools: StructuredToolInterface[] = [];
  private toolMap: Record<string, (args: any) => Promise<any>> = {};

  constructor(params: {
    apiKey?: string;
    modelName?: string;
    baseURL?: string;
    maxIterations?: number;
    temperature?: number;
    sessionId?: string;
  } = {}) {
    this.apiKey = params.apiKey || process.env.OPENAI_API_KEY || "";
    this.modelName = params.modelName || process.env.MODEL_NAME || "qwen3.6-plus";
    this.baseURL = params.baseURL || process.env.OPENAI_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
    this.maxIterations = params.maxIterations || 30;
    this.temperature = params.temperature ?? 0.7; // 默认改为 0.7

    const sessionId = params.sessionId || "user_session_01";
    const historyDir = path.join(process.cwd(), "memory");

    // 确保存储目录存在
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    this.history = new FileSystemChatMessageHistory({
      filePath: path.join(historyDir, `${sessionId}.json`),
      sessionId: sessionId,
    });
    // this.history = new InMemoryChatMessageHistory(); // 内存存储方案

    // 如果提供了 API Key，则自动创建模型实例
    if (this.apiKey) {
      this.createClient(this.temperature);
    }
  }

  /**
   * 创建 LangChain 客户端
   * @param temperature 温度系数
   */
  createClient(temperature = 0.7) {
    this.baseModel = new ChatOpenAI({
      modelName: this.modelName,
      apiKey: this.apiKey,
      configuration: {
        baseURL: this.baseURL,
      },
      temperature,
      streaming: true,
      modelKwargs: {
        enable_thinking: false,
      },
    });
    this.model = this.baseModel;
  }

  /**
   * 注册工具
   * @param tools 单个工具或工具数组
   */
  registerTools(tools: ToolConfig | ToolConfig[]) {
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

    if (!this.baseModel) {
      throw new Error("请先创建模型再绑定工具");
    }
    // 绑定工具到模型
    this.model = this.baseModel.bindTools(this.tools);
  }

  /**
   * 管理历史记录：Token 超限时进行总结压缩
   */
  private async manageHistory() {
    const messages = await this.history.getMessages();
    if (messages.length <= MAX_HISTORY_MESSAGES) return;

    const totalTokens = countTokens(messages);
    if (totalTokens <= MAX_TOKENS) return;

    // 计算切割点：保留最后 MAX_HISTORY_MESSAGES 条
    const splitIndex = messages.length - MAX_HISTORY_MESSAGES;
    const toSummarize = messages.slice(0, splitIndex);
    const toKeep = messages.slice(splitIndex);

    // 将旧消息格式化为字符串
    const bufferString = getBufferString(toSummarize, "用户", "助手");

    // 调用模型进行总结（使用 baseModel，不带工具）
    const summaryRes = await this.baseModel.invoke([
      new SystemMessage(
        "你是一个记忆管理助手。请对以下对话历史进行高度精简的总结，提取关键信息（如姓名、偏好、核心议题），该总结将作为后续对话的上下文背景。",
      ),
      new HumanMessage(`请总结以下历史内容：\n\n${bufferString}`),
    ]);

    const summaryContent = `[历史对话背景总结]：${summaryRes.content}`;

    // 更新历史记录：清空并重构
    await this.history.clear();
    await this.history.addMessage(new SystemMessage(summaryContent));
    for (const msg of toKeep) {
      await this.history.addMessage(msg);
    }
  }

  /**
   * 核心调用方法
   */
  async invoke(): Promise<AIMessage> {
    if (!this.model) {
      throw new Error("请先创建模型");
    }

    // 在调用前检查并管理历史 Token
    await this.manageHistory();

    const messages = await this.history.getMessages();
    const res = await this.model.invoke(messages);
    await this.history.addMessage(res); // 自动记住 AI 的回复
    return res;
  }

  async addMessage(msg: any, type: "user" | "system" | "tool" | "raw") {
    if (type === "user") {
      await this.history.addMessage(new HumanMessage(msg));
    } else if (type === "system") {
      await this.history.addMessage(new SystemMessage(msg));
    } else if (type === "tool") {
      await this.history.addMessage(new ToolMessage(msg));
    } else {
      await this.history.addMessage(msg);
    }
  }

  /**
   * 封装 Agent 运行循环 (ReAct)
   * @param userInput 用户输入的消息
   * @param maxIterations 最大迭代次数
   */
  async chat(userInput?: string, maxIterations = this.maxIterations): Promise<AIMessage> {
    if (userInput) {
      await this.addMessage(userInput, "user");
    }

    let res = await this.invoke();
    let iterations = 0;

    // ReAct 循环
    while (
      res.tool_calls &&
      res.tool_calls.length > 0 &&
      iterations < maxIterations
    ) {
      iterations++;

      for (const toolCall of res.tool_calls) {
        const selectedToolFn = this.toolMap[toolCall.name];
        if (selectedToolFn) {
          try {
            const toolResult = await selectedToolFn(toolCall.args);
            let contentStr: string;

            if (typeof toolResult === "string") {
              contentStr = toolResult;
            } else if (toolResult && (toolResult as any).text) {
              // 如果返回对象有 text 字段，优先使用
              contentStr = (toolResult as any).text;
            } else {
              contentStr = JSON.stringify(toolResult);
            }

            await this.addMessage(
              {
                content: contentStr,
                tool_call_id: toolCall.id,
              },
              "tool",
            );
          } catch (error: any) {
            await this.addMessage(
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

  /**
   * 简单的流式聊天输出，不支持中间工具调用的细节，只管单次生成
   * 兼容 qwen3 思考模式（reasoning_content 阶段 content 为空）
   */
  async *streamChat(userInput?: string): AsyncGenerator<string, void, unknown> {
    if (userInput) {
      await this.addMessage(userInput, "user");
    }

    if (!this.model) {
      throw new Error("请先创建模型");
    }

    // 与 invoke 保持一致，流式调用前也检查并压缩历史
    await this.manageHistory();

    const messages = await this.history.getMessages();
    const stream = await this.model.stream(messages);

    let fullContent = "";
    for await (const chunk of stream) {
      // qwen3 在思考阶段 content 为空，最终回答才有 content
      // 直接 yield 有值的 content 片段，跳过空字符串
      const text = typeof chunk.content === "string" ? chunk.content : "";
      if (text) {
        fullContent += text;
        yield text;
      }
    }

    // 流式结束后，将完整回复存入历史
    if (fullContent) {
      await this.history.addMessage(new AIMessage(fullContent));
    }
  }

  /**
   * 获取所有历史消息
   */
  async getHistory(): Promise<BaseMessage[]> {
    return await this.history.getMessages();
  }

  /**
   * 打印历史对话到控制台
   */
  async printHistory() {
    const messages = await this.getHistory();
    console.log("\n📜 --- 历史对话记录 ---");
    messages.forEach((msg, i) => {
      const role = msg._getType();
      let icon = "❓";
      if (role === "human") icon = "👤 用户";
      else if (role === "ai") icon = "🤖 AI";
      else if (role === "system") icon = "⚙️ 系统";
      else if (role === "tool") icon = "🛠️ 工具";

      let content = msg.content;
      if (typeof content !== "string") {
        content = JSON.stringify(content);
      }

      console.log(`[${i}] ${icon}: ${content}`);

      // 如果是 AI 调用工具，打印工具调用详情
      if (role === "ai" && (msg as AIMessage).tool_calls?.length) {
        (msg as AIMessage).tool_calls?.forEach((tc) => {
          console.log(`    └─ 准备调用: ${tc.name}(${JSON.stringify(tc.args)})`);
        });
      }
    });
    console.log("------------------------\n");
  }

  /**
   * 清空对话历史
   */
  async clearHistory() {
    await this.history.clear();
  }
}

export default Client;
