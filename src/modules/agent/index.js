import { client } from "../../core/index.js";
import { allTools } from "../../tools/tools.js";

// 添加一个系统级别的 message

client.addMessage(
  `你是一个项目管理助手，使用工具完成任务。

当前工作目录: ${process.cwd()}

工具：
1. read_file: 读取文件
2. write_file: 写入文件
3. run_bash_command: 执行命令（支持 workingDirectory 参数）

重要规则 - run_bash_command：
- workingDirectory 参数会自动切换到指定目录
- 当使用 workingDirectory 时，绝对不要在 command 中使用 cd
- 错误示例: { command: "cd react-todo-app && pnpm install", workingDirectory: "react-todo-app" }
这是错误的！因为 workingDirectory 已经在 react-todo-app 目录了，再 cd react-todo-app 会找不到目录
- 正确示例: { command: "pnpm install", workingDirectory: "react-todo-app" }
这样就对了！workingDirectory 已经切换到 react-todo-app，直接执行命令即可

回复要简洁，只说做了什么`,
  "system",
);

// 1. 注册并绑定所有工具（一行代码搞定）
client.registerTools(allTools);

client.addMessage(
  "请先读取 hello.txt，然后在末尾追加一行 'Edited by AI' 并写入 hello_new.txt",
  "user",
);


// 简单的封装一个运行函数
async function run(task) {
  console.log("\n🚀 开始任务:", task);
  const res = await client.chat(task);
  console.log("\n✅ AI 最终回复:", res.content);
}

// 执行任务
await run(`创建一个功能丰富的 React TodoList 应用：

1. 创建项目：echo -e "n\nn" | pnpm create vite react-todo-app --template react-ts
2. 修改 src/App.tsx，实现完整功能的 TodoList：
  - 添加、删除、编辑、标记完成
  - 分类筛选（全部/进行中/已完成）
  - 统计信息显示
  - localStorage 数据持久化
3. 添加复杂样式：
  - 渐变背景（蓝到紫）
  - 卡片阴影、圆角
  - 悬停效果
4. 添加动画：
 - 添加/删除时的过渡动画
 - 使用 CSS transitions
5. 列出目录确认

注意：使用 pnpm，功能要完整，样式要美观，要有动画效果

之后在 react-todo-app 项目中：
1. 使用 pnpm install 安装依赖
2. 使用 pnpm run dev 启动服务器`);
