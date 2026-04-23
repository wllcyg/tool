import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { spawn } from "node:child_process";
const readFile = {
  name: "read_file",
  description: "读取指定路径的文件内容",
  schema: z.object({
    filePath: z.string().describe("要读取的文件路径"),
  }),
  func: async ({ filePath }) => {
    try {
      const context = await fs.readFile(filePath, "utf8");
      console.log(
        `---> 工具执行: read_file ${filePath} (成功读取 ${context.length} 字节)`,
      );
      return `文件内容:\n${context}`;
    } catch (error) {
      return `读取失败: ${error.message}`;
    }
  },
};

const writeFile = {
  name: "write_file",
  description: "向指定路径写入文件内容，自动创建目录",
  schema: z.object({
    filePath: z.string().describe("要写入的文件路径"),
    content: z.string().describe("要写入的文件内容"),
  }),
  func: async ({ filePath, content }) => {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");
      console.log(
        `---> 工具执行: write_file ${filePath} (成功写入 ${content.length} 字节)`,
      );
      return `写入成功！内容长度: ${content.length}`;
    } catch (error) {
      return `写入失败: ${error.message}`;
    }
  },
};

//命令执行
const runBashCommand = {
  name: "run_bash_command",
  description: "执行系统命令，支持指定工作目录，实时显示输出",
  schema: z.object({
    command: z.string().describe("要执行的 bash 命令"),
    workingDirectory: z.string().optional().describe("工作目录（推荐指定）"),
  }),
  func: async ({ command, workingDirectory }) => {
    try {
      const cwd = workingDirectory || process.cwd();
      console.log(`---> 工具执行: run_bash_command ${command} in ${cwd}`);
      return new Promise((resolve, reject) => {
        const child = spawn(command, { cwd, stdio: "inherit", shell: true });
        let errorMsg = "";

        child.on("error", (err) => {
          errorMsg = err.message;
          reject(err);
        });
        child.on("close", (code) => {
          if (code === 0) {
            console.log(
              `  [工具调用] execute_command("${command}") - 执行成功`,
            );
            const cwdInfo = workingDirectory
              ? `\n\n重要提示：命令在目录 "${workingDirectory}" 中执行成功。如果需要在这个项目目录中继续执行命令，请使用 workingDirectory: "${workingDirectory}" 参数，不要使用 cd 命令。`
              : "";
            resolve(`命令执行成功: ${command}${cwdInfo}`);
          } else {
            console.log(
              `  [工具调用] execute_command("${command}") - 执行失败，退出码: ${code}`,
            );
            resolve(
              `命令执行失败，退出码: ${code}${errorMsg ? "\n错误: " + errorMsg : ""}`,
            );
          }
        });
      });
    } catch (error) {
      return `命令执行失败: ${error.message}`;
    }
  },
};

export const allTools = [readFile, writeFile, runBashCommand];
