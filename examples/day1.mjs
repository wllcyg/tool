import {config} from "dotenv";
import {ChatOpenAI} from "@langchain/openai";
import {tool} from "@langchain/core/tools";
import {HumanMessage, SystemMessage, ToolMessage} from '@langchain/core/messages'
import fs from 'node:fs/promises';
import {z} from 'zod'
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

config()
const rl = readline.createInterface({ input, output });
const model = new ChatOpenAI({
    modelName: process.env.MODEL_NAME,
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    }
})

const readFileTool = tool(
    async ({filePath}) => {
        const context = await fs.readFile(filePath, 'utf8');
        console.log(`工具正在调用,readfile ${filePath} - 成功读取了${context.length} 字节`);
        return `文件内容"\n${context}`;
    },
    {
        name: "read-file",
        description: '用此工具来读取文件内容。当用户要求读取文件、查看代码、分析文件内容时，调用此工具。输入文件路径（可以是相对路径或绝对路径）。',
        schema: z.object({
            filePath: z.string().describe('要读取的文件路径'),
        })
    }
)

const listFiles = tool(
    async ({path}) => {
        console.log(`工具正在调用,list-files ${path}`);
        const files = await fs.readdir(path)
        return `所有路径"\n${files}`;
    },
    {
        name: "list-files",
        description: '用此工具来列出目录下的文件。当用户要求列出文件时，调用此工具。输入目录路径（可以是相对路径或绝对路径）。',
        schema: z.object({
            path: z.string().describe('要列出的目录路径'),
        })
    }
)

const getSysStats = tool(
    async () => {
        console.log(`工具正在调用,get-sys-stats`);
        const stats = {
            platform: process.platform,
            nodeVersion: process.version,
            currentTime: new Date().toISOString(),
        }
        return `系统状态"\n${JSON.stringify(stats)}`;
    },
    {
        name: "get-sys-stats",
        description: '获取系统实时状态。当你需要查询当前时间、系统平台、Node版本时，请务必使用此工具。',
        schema: z.object({
        })
    }
)

const tools = [readFileTool,listFiles,getSysStats]

const modelWidthTools = model.bindTools(tools)

const messages = [
    new SystemMessage(`你是一个代码助手，可以使用工具读取文件并解释代码。

工作流程：
1. 用户要求读取文件时，立即调用 read_file 工具
2. 等待工具返回文件内容
3. 基于文件内容进行分析和解释
4. 用户要求列出文件时，立即调用 list_files 工具
5. 用户要求获取系统状态时，立即调用 get_sys_stats 工具

可用工具：
- read_file: 读取文件内容（使用此工具来获取文件内容）
- list_files: 列出目录下的文件（使用此工具来获取目录下的文件）
- get_sys_stats: 获取系统状态（使用此工具来获取系统状态）
`),
    // new HumanMessage(`帮我看看 src 文件夹下有哪些文件，然后随便挑一个 .mjs 文件读一读它的内容，并简要告诉我那个文件是干什么的`)
]
//调用模型前增加交互
console.log("\n=== 智能管家已就绪 ===");
const userInput = await rl.question("请输入你的指令 (比如：看看当前文件夹): \n> ");
messages.push(new HumanMessage(userInput));
console.log("[系统] 任务启动中...");

//调用模型
let response = await modelWidthTools.invoke(messages)
console.log(response)

// 暂存大模型对话记录
messages.push(response)

while (response.tool_calls && response.tool_calls.length > 0) {
    console.log(`我们检测到了${response.tool_calls.length}个工具!`)
    //批量执行所有工具
    const  toolResult = await Promise.all(
        response.tool_calls.map(async toolCall => {
            const tool = tools.find(t => t.name === toolCall.name )
            if (!tool) {
                return `发生了错误,找不到工具${toolCall.name}`
            }
            try {
                // 调用 ai,获取返回的结果
                return await tool.invoke(toolCall.args)
            }catch(err) {
                return `错误${err.messages}`
            }
        })
    )

    response.tool_calls.forEach((toolCall,index) => {
        messages.push(
            new ToolMessage({
                content:toolResult[index],
                tool_call_id:toolCall.id,
            })
        )
    })
    response = await modelWidthTools.invoke(messages)
    messages.push(response)
}

console.log('\n[最终回复]');
console.log(response.content);

rl.close();














