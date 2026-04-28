import { useState, useRef, useEffect, useCallback, memo } from 'react'
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Card, Input, Button } from 'animal-island-ui'
import { fetchChatStream } from '../../services/chatApi'
import './ChatBox.css'

/** 单条消息类型 */
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

/**
 * 打字机组件 — 用 requestAnimationFrame 驱动动画，与浏览器刷新率同步
 *
 * 原理：
 *   - pendingRef 队列存放"收到但未显示"的字符
 *   - rAF 每帧检查距上次显示字符是否已超过 charInterval ms
 *   - 到时间就取一个字符追加并调度下一帧；未到则直接调度下一帧等待
 *   - 比 setInterval 更精准，不存在计时器漂移，且与浏览器 paint 同步
 */
const TypewriterText = memo(function TypewriterText({
  text,
  charInterval = 30,
}: {
  text: string
  /** 每个字符之间的最小间隔（ms），默认 30ms ≈ 33 字/秒 */
  charInterval?: number
}) {
  const [displayed, setDisplayed] = useState('')
  const displayedLenRef = useRef(0)   // 已显示字符数（规避闭包陈旧）
  const pendingRef = useRef('')       // 待显示字符队列
  const rafRef = useRef<number>(0)    // rAF id
  const lastTimeRef = useRef<number>(0) // 上次显示字符的时间戳

  useEffect(() => {
    // 把新增字符追加到队列
    const totalHandled = displayedLenRef.current + pendingRef.current.length
    if (text.length > totalHandled) {
      pendingRef.current += text.slice(totalHandled)
    }

    // 启动 rAF 循环（若已在运行则不重复启动）
    if (!rafRef.current && pendingRef.current.length > 0) {
      const tick = (timestamp: number) => {
        if (pendingRef.current.length === 0) {
          rafRef.current = 0
          return
        }

        // 节流：距上次显示未满 charInterval ms 则跳过本帧
        if (timestamp - lastTimeRef.current >= charInterval) {
          lastTimeRef.current = timestamp
          const char = pendingRef.current[0]
          pendingRef.current = pendingRef.current.slice(1)
          displayedLenRef.current++
          setDisplayed((prev) => prev + char)
        }

        // 调度下一帧
        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    }
  }, [text, charInterval])

  // 卸载时取消挂起的 rAF
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
  }, [])

  return <>{displayed}</>
})

export default function ChatBox() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是 Milvus AI 助手 🌿 有什么可以帮你的吗？',
      timestamp: Date.now(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  /** 正在流式输出的 assistant 消息 ID */
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  /** 用于中断当前 SSE 请求 */
  const abortRef = useRef<AbortController | null>(null)

  /** 滚动到底部 */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  /** 组件卸载时中断进行中的请求 */
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  /** 发送消息 */
  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isLoading) return

    // 中断上一次进行中的请求
    abortRef.current?.abort()

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    }

    // 创建一条空的 assistant 消息，后续 SSE chunk 会追加
    const assistantId = `ai-${Date.now()}`
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInputValue('')
    setIsLoading(true)
    setStreamingId(assistantId)

    const controller = new AbortController()
    abortRef.current = controller

    await fetchChatStream({
      question: trimmed,
      signal: controller.signal,
      onChunk: (text) => {
        // 把收到的文本追加到 content，TypewriterText 会负责打字机动画
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: msg.content + text }
              : msg,
          ),
        )
      },
      onDone: () => {
        setIsLoading(false)
        setStreamingId(null)
        abortRef.current = null
      },
      onError: (error) => {
        console.error('[ChatBox] SSE Error:', error)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: msg.content || `⚠️ 出错了：${error.message}` }
              : msg,
          ),
        )
        setIsLoading(false)
        setStreamingId(null)
        abortRef.current = null
      },
    })
  }, [inputValue, isLoading])

  /** 键盘回车发送 */
  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  /** 格式化时间 */
  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="chatbox">
      {/* 标题栏 */}
      <Card type="title">
        <div className="chatbox-header">
          <span className="chatbox-header__dot" />
          <h2>Milvus AI 助手</h2>
        </div>
      </Card>

      {/* 消息区域 */}
      <div className="chatbox-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chatbox-bubble chatbox-bubble--${msg.role}`}
          >
            <Card
              color={msg.role === 'assistant' ? 'app-teal' : 'app-yellow'}
            >
              <p>
                {/* 正在流式输出的消息：使用打字机动画组件 */}
                {msg.role === 'assistant' && msg.id === streamingId ? (
                  <TypewriterText text={msg.content} charInterval={30} />
                ) : (
                  msg.content
                )}
              </p>
            </Card>
            <span className="chatbox-bubble__time">
              {formatTime(msg.timestamp)}
            </span>
          </div>
        ))}

        {/* 加载指示 — 仅在 assistant 消息还没有内容时显示 */}
        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="chatbox-bubble chatbox-bubble--assistant">
            <Card color="default">
              <div className="chatbox-typing">
                <span className="chatbox-typing__dot" />
                <span className="chatbox-typing__dot" />
                <span className="chatbox-typing__dot" />
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="chatbox-input-area" onKeyDown={handleKeyDown}>
        <div className="chatbox-input-wrapper">
          <Input
            size="large"
            placeholder="输入你的问题…"
            value={inputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setInputValue(e.target.value)
            }
            allowClear
            onClear={() => setInputValue('')}
          />
        </div>
        <Button
          type="primary"
          size="large"
          loading={isLoading}
          onClick={handleSend}
          disabled={!inputValue.trim()}
        >
          发送
        </Button>
      </div>
    </div>
  )
}
