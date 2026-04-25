import { client } from "../util/index.js";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

// 添加我的 mcp 工具
const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    "my-mcp-server": {
      command: "node",
      args: ["/Users/moliang/Desktop/coder/tool-test/src/mcp/index.js"],
    },
  },
});

const tools = await mcpClient.getTools();
client.registerTools(tools);

const getResourceContent = async () => {
  const res = await mcpClient.listResources();

  // 并行读取所有资源
  const readPromises = Object.entries(res).flatMap(([serverName, resources]) =>
    resources.map((resource) =>
      mcpClient.readResource(serverName, resource.uri),
    ),
  );

  const allContents = await Promise.all(readPromises);

  // 提取 text 并拼接
  const resourceStr = allContents
    .flatMap((content) => content.map((item) => item.text))
    .filter(Boolean)
    .join("\n\n");
  return resourceStr;
};

async function runChat(params) {
  const resourceStr = await getResourceContent();
  client.addMessage(params + `\n${resourceStr}`, "system");
  const res = await client.chat();
  console.log(res.content);
  await mcpClient.close();
}

runChat("MCP Server 的使用指南是什么");
