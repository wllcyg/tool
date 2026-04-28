/**
 * SSE 流式聊天 API
 * 封装与后端 /chat/stream 端点的通信
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/** SSE chunk 解析后的数据 */
export interface ChatChunk {
  text?: string
  error?: string
}

/** fetchChatStream 的配置项 */
export interface ChatStreamOptions {
  /** 用户提问 */
  question: string
  /** 每收到一个文本片段时触发 */
  onChunk: (text: string) => void
  /** 流式传输完成时触发 */
  onDone: () => void
  /** 发生错误时触发 */
  onError: (error: Error) => void
  /** 用于中断请求的 AbortSignal */
  signal?: AbortSignal
}

/**
 * 通过 fetch + ReadableStream 消费后端 SSE 推送
 *
 * 数据格式：
 *   data: {"text":"chunk"}\n\n   — 正常文本块
 *   data: [DONE]\n\n               — 结束标记
 *   data: {"error":"msg"}\n\n     — 错误信息
 */
export async function fetchChatStream({
  question,
  onChunk,
  onDone,
  onError,
  signal,
}: ChatStreamOptions): Promise<void> {
  try {
    const url = `${API_URL}/chat/stream?question=${encodeURIComponent(question)}`

    const response = await fetch(url, { signal })

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取响应流')
    }

    const decoder = new TextDecoder()
    // 缓冲区，用于处理跨 chunk 的不完整 SSE 行
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE 以双换行分隔事件
      const parts = buffer.split('\n\n')
      // 最后一段可能不完整，留在 buffer 中
      buffer = parts.pop() || ''

      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data: ')) continue

        const payload = line.slice(6) // 去掉 "data: "

        // 结束标记
        if (payload === '[DONE]') {
          onDone()
          return
        }

        // 解析 JSON
        try {
          const data: ChatChunk = JSON.parse(payload)
          if (data.error) {
            onError(new Error(data.error))
            return
          }
          if (data.text) {
            onChunk(data.text)
          }
        } catch {
          // 忽略无法解析的行
          console.warn('[SSE] 无法解析:', payload)
        }
      }
    }

    // 流自然结束但未收到 [DONE]
    onDone()
  } catch (err: unknown) {
    // AbortError 是正常中断，不报错
    if (err instanceof DOMException && err.name === 'AbortError') return
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}
