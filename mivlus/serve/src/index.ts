import { MilvusClient } from '@zilliz/milvus2-sdk-node';

const address = 'localhost:19530';
const milvusClient = new MilvusClient({ address });

async function main() {
  console.log('Connecting to Milvus at', address);
  try {
    const health = await milvusClient.checkHealth();
    console.log('Milvus Health:', health);
    
    const version = await milvusClient.getVersion();
    console.log('Milvus Version:', version);
  } catch (error) {
    console.error('Failed to connect to Milvus:', error);
  }
}

main();
