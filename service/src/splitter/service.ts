import { EPubLoader } from "@langchain/community/document_loaders/fs/epub";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import milvusStore, { COLLECTION_NAME } from "../milvus/index.js";
import embeddingsService from "../embedding/index.js";

export class SplitterService {
  /**
   * 处理 EPUB 文件：加载、分段、向量化并存储
   * @param filePath EPUB 文件在服务器上的路径
   */
  async processEpub(filePath: string) {
    console.log(`Processing EPUB: ${filePath}`);
    
    // 1. 加载文件
    const loader = new EPubLoader(filePath);
    const docs = await loader.load();
    
    // 2. 文本分段
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });
    const splitDocs = await splitter.splitDocuments(docs);
    console.log(`Split into ${splitDocs.length} chunks`);

    // 3. 向量化并准备数据
    const dataToInsert = await Promise.all(
      splitDocs.map(async (doc) => {
        const vector = await embeddingsService.embedQuery(doc.pageContent);
        return {
          content: doc.pageContent,
          date: new Date().toISOString().split('T')[0],
          mood: "Neutral",
          tags: ["epub-upload"],
          vector: vector,
        };
      })
    );

    // 4. 插入 Milvus
    const result = await milvusStore.Insert({
      collection_name: COLLECTION_NAME,
      data: dataToInsert,
    });

    console.log(`✓ Inserted ${result.insert_cnt} chunks into Milvus`);
    return {
      count: result.insert_cnt
    };
  }

  /**
   * 加载 EPUB 文件并返回文档数据
   * @param filePath EPUB 文件在服务器上的路径
   */
  async getEpubData(filePath: string) {
    console.log(`Loading EPUB from: ${filePath}`);
    const loader = new EPubLoader(filePath);
    const docs = await loader.load();
    
    // 返回读取到的原始文档数据
    return docs.map(doc => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata
    }));
  }
}

export default new SplitterService();
