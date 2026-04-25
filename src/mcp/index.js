import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const database = {
  users: [
    { id: "001", name: "Alice", email: "alice@example.com", role: "管理员" },
    { id: "002", name: "Bob", email: "bob@example.com", role: "普通用户" },
  ],
};

const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
});

server.registerTool(
  "query_user",
  {
    description:
      "查询数据库中的用户信息。输入用户 ID，返回该用户的详细信息（姓名、邮箱、角色）。",
    inputSchema: {
      userId: z.string().describe("用户 ID，例如: 001, 002, 003"),
    },
  },
  async ({ userId }) => {
    const user = database.users.find((u) => u.id === userId);
    if (!user) {
      return {
        content: [
          {
            type: "text",
            text: `未找到用户 ID ${userId} 的信息。请检查输入的用户 ID 是否正确。`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `用户信息：姓名 - ${user.name}, 邮箱 - ${user.email}, 角色 - ${user.role}`,
        },
      ],
    };
  },
);

server.registerResource(
  "使用指南",
  "docs://guide",
  {
    description: "MCP SERVER 使用文档",
    mimeType: "text/plain",
  },
  async () => {
    return {
      contents: [
        {
          uri: "docs://guide",
          mimeType: "text/plain",
          text: `MCP Server 使用指南,功能：提供用户查询等工具。使用：在 Cursor 等 MCP Client 中通过自然语言对话，Cursor 会自动调用相应工具。`,
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
