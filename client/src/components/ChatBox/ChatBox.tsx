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
 * 关键设计：
 *   - 组件挂载时 text 为空 → 触发打字机动画（流式消息）
 *   - 组件挂载时 text 非空 → 直接显示，不播放动画（历史消息 / 欢迎语）
 *   - 通过 rAF + 时间戳节流控制字符显示速度，完全独立于数据到达速度
 *   - 彻底避免 streamingId 与 React 批量更新之间的竞态条件
 */
const TypewriterText = memo(function TypewriterText({
  text,
  charInterval = 30,
}: {
  text: string
  /** 每字符最小间隔 ms，默认 30ms ≈ 33 字/秒 */
  charInterval?: number
}) {
  // 挂载时 text 是否为空，决定要不要动画（只判断一次）
  const shouldAnimateRef = useRef(text === '')

  const [displayed, setDisplayed] = useState(
    // 有内容就直接显示，不播动画
    () => (shouldAnimateRef.current ? '' : text),
  )
  const displayedLenRef = useRef(shouldAnimateRef.current ? 0 : text.length)
  const pendingRef = useRef('')
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    // 非动画模式：直接同步显示（text 不会变，这条几乎不触发）
    if (!shouldAnimateRef.current) {
      setDisplayed(text)
      return
    }

    // 把新增字符追加到队列
    const totalHandled = displayedLenRef.current + pendingRef.current.length
    if (text.length > totalHandled) {
      pendingRef.current += text.slice(totalHandled)
    }

    // 启动 rAF 循环（已在运行则不重复）
    if (!rafRef.current && pendingRef.current.length > 0) {
      const tick = (timestamp: number) => {
        if (pendingRef.current.length === 0) {
          rafRef.current = 0
          return
        }
        // 节流：未到间隔就跳帧等待
        if (timestamp - lastTimeRef.current >= charInterval) {
          lastTimeRef.current = timestamp
          const char = pendingRef.current[0]
          pendingRef.current = pendingRef.current.slice(1)
          displayedLenRef.current++
          setDisplayed((prev) => prev + char)
        }
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isLoading) return

    abortRef.current?.abort()

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    }

    const assistantId = `ai-${Date.now()}`
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '', // ← 从空字符串开始，TypewriterText 检测到空就会启动动画
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInputValue('')
    setIsLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    await fetchChatStream({
      question: trimmed,
      signal: controller.signal,
      onChunk: (text) => {
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
        abortRef.current = null
      },
    })
  }, [inputValue, isLoading])

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="chatbox">
      <Card type="title">
        <div className="chatbox-header">
          <span className="chatbox-header__dot" />
          <h2>Milvus AI 助手</h2>
        </div>
      </Card>

      <div className="chatbox-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chatbox-bubble chatbox-bubble--${msg.role}`}
          >
            <Card color={msg.role === 'assistant' ? 'app-teal' : 'app-yellow'}>
              <p>
                {msg.role === 'assistant' ? (
                  /**
                   * 所有 assistant 消息都走 TypewriterText
                   * - 欢迎语：挂载时 text 非空 → 直接显示，不动画
                   * - 新消息：挂载时 text='' → 随 content 增长逐字显示
                   * - key={msg.id} 确保每条消息是独立实例，不互相影响
                   */
                  <TypewriterText
                    key={msg.id}
                    text={msg.content}
                    charInterval={30}
                  />
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
