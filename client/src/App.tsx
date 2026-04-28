import { Cursor, Footer, Divider } from 'animal-island-ui'
import { ChatBox } from './components/ChatBox'

function App() {
  return (
    <Cursor>
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#f8f8f0',
        }}
      >
        {/* 聊天区域 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatBox />
        </div>

        {/* 底部装饰 */}
        <Divider type="wave-yellow" />
        <Footer type="sea" />
      </main>
    </Cursor>
  )
}

export default App
