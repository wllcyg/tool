import { ChatOpenAI } from "@langchain/openai";
import { tool, StructuredToolInterface } from "@langchain/core/tools";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
  BaseMessage,
  AIMessage,
} from "@langchain/core/messages";
import { z } from "zod";

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
  private model: any;
  private messages: BaseMessage[] = [];
  private tools: StructuredToolInterface[] = [];
  private toolMap: Record<string, (args: any) => Promise<any>> = {};

  constructor(params: {
    apiKey?: string;
    modelName?: string;
    baseURL?: string;
    maxIterations?: number;
  } = {}) {
    this.apiKey = params.apiKey || process.env.OPENAI_API_KEY || "";
    this.modelName = params.modelName || process.env.MODEL_NAME || "qwen3.6-plus";
    this.baseURL = params.baseURL || process.env.OPENAI_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
    this.maxIterations = params.maxIterations || 30;

    // 如果提供了 API Key，则自动创建模型实例
    if (this.apiKey) {
      this.createClient();
    }
  }

  /**
   * 创建 LangChain 客户端
   * @param temperature 温度系数
   */
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

    if (!this.model) {
      throw new Error("请先创建模型再绑定工具");
    }
    // 绑定工具到模型
    this.model = this.model.bindTools(this.tools);
  }

  /**
   * 核心调用方法
   */
  async invoke(): Promise<AIMessage> {
    if (!this.model) {
      throw new Error("请先创建模型");
    }
    const res = await this.model.invoke(this.messages);
    this.messages.push(res); // 自动记住 AI 的回复
    return res;
  }

  /**
   * 手动添加消息
   */
  addMessage(msg: any, type: "user" | "system" | "tool" | "raw") {
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
   * 封装 Agent 运行循环 (ReAct)
   * @param userInput 用户输入的消息
   * @param maxIterations 最大迭代次数
   */
  async chat(userInput?: string, maxIterations = this.maxIterations): Promise<AIMessage> {
    if (userInput) {
      this.addMessage(userInput, "user");
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
      console.log(`\n🛠️  AI 决定调用 ${res.tool_calls.length} 个工具...`);

      for (const toolCall of res.tool_calls) {
        console.log(
          `   └─ [调用] ${toolCall.name}，参数: ${JSON.stringify(toolCall.args)}`,
        );
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

            this.addMessage(
              {
                content: contentStr,
                tool_call_id: toolCall.id,
              },
              "tool",
            );
          } catch (error: any) {
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

    if (iterations >= maxIterations) {
      console.warn(
        `\n⚠️ 警告：已达到最大迭代次数 (${maxIterations})，强制停止。`,
      );
    }

    return res;
  }
}

export default Client;
