import { client } from "../util/index.js";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

// 添加我的 mcp 工具
const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    "my-mcp-server": {
      command: "node",
      args: ["/Users/moliang/Desktop/coder/tool-test/src/mcp/index.js"],
    },
    "amap-maps": {
      url: `https://mcp.amap.com/mcp?key=${process.env.AMAP_MAPS_API_KEY}`,
    },
    filesystem: {
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/moliang/Desktop/coder",
      ],
    },
    "chrome-devtools": {
      command: "npx",
      args: ["-y", "chrome-devtools-mcp@latest"],
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

runChat(
  "北京南站附近的酒店，最近的 3 个酒店，拿到酒店图片，打开浏览器，展示每个酒店的图片，每个 tab 一个 url 展示，并且在把那个页面标题改为酒店名",
);
