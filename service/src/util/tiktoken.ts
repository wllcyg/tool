import { getEncoding, TiktokenEncoding } from 'js-tiktoken'

/**
 * 计算消息列表的 token 数量
 */
export function countTokens(messages: any[], encoder_name: TiktokenEncoding = 'cl100k_base') {
  const encoding = getEncoding(encoder_name)
  let totalTokens = 0;

  // 如果你需要具体的计算逻辑（根据 OpenAI 官方算法）：
  for (const message of messages) {
    // 基础 token
    totalTokens += 4;
    // 内容 token
    totalTokens += encoding.encode(message.content || "").length;
    // 角色 token
    totalTokens += encoding.encode(message.role || "").length;
  }

  totalTokens += 3; // 结尾 token
  return totalTokens;
}