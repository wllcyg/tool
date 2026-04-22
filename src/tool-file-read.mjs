import {config} from "dotenv";
import {ChatOpenAI} from "@langchain/openai";
import {tool} from "@langchain/core/tools";
import {HumanMessage, SystemMessage, ToolMessage} from '@langchain/core/messages'
import fs from 'node:fs/promises';
import {z} from 'zod'

config()
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

const tools = [readFileTool]

const modelWidthTools = model.bindTools(tools)

const messages = [
    new SystemMessage(`你是一个代码助手，可以使用工具读取文件并解释代码。

工作流程：
1. 用户要求读取文件时，立即调用 read_file 工具
2. 等待工具返回文件内容
3. 基于文件内容进行分析和解释

可用工具：
- read_file: 读取文件内容（使用此工具来获取文件内容）
`),
    new HumanMessage(`请读取 src/tool-file-read.mjs 文件内容并解释代码`)
]
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
}

console.log('\n[最终回复]');
console.log(response.content);














