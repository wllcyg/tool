async function testStream() {
  const question = "你好";
  const url = `http://localhost:3000/chat/stream?question=${encodeURIComponent(question)}`;
  
  console.log(`Testing stream from: ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      console.error('No body reader');
      return;
    }

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      console.log('--- Chunk Received ---');
      console.log(decoder.decode(value));
    }

    console.log('--- Stream Ended ---');
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testStream();
