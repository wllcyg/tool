import { parse } from 'path';
import { EPubLoader } from "@langchain/community/document_loaders/fs/epub";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import milvusStore from "../milvus/index.js";
import embeddingsService from "../embedding/index.js";
import { COLLECTION_NAME_EBOOK, BOOK_ID } from "../contance/index.js";
export class SplitterService {
  /**
   * 处理 EPUB 文件：加载、分段、向量化并存储
   * @param filePath EPUB 文件在服务器上的路径
   */
  async processEpub(filePath: string) {
    console.log(`Processing EPUB: ${filePath}`);
    const bookName = parse(filePath).name;
    const bookId = String(BOOK_ID);

    // 1. 加载文件
    const loader = new EPubLoader(filePath, { splitChapters: true });
    const docs = await loader.load();
    const cleanDocs = docs.filter(doc =>
      doc.pageContent.length > 10 && !doc.pageContent.includes('.html#')
    );

    const splitter = new RecursiveCharacterTextSplitter({
      separators: ['\n\n', '\n', '。', '！', '？', ' ', ''],
      chunkSize: 500,
      chunkOverlap: 50,
    });

    let totalInserted = 0;
    for (let i = 0; i < cleanDocs.length; i++) {
      const chapterNum = i + 1;
      const chunks = await splitter.splitText(cleanDocs[i].pageContent);
      if (chunks.length === 0) {
        continue;
      }

      console.log(`  Chapter ${chapterNum}/${cleanDocs.length}: ${chunks.length} chunks`);

      // 批量向量化
      const vectors = await embeddingsService.embedDocuments(chunks);

      // 构建与 AI_EBOOK_SCHEMA 对应的插入数据
      const insertData = chunks.map((content, chunkIndex) => ({
        id: `${bookId}_${chapterNum}_${chunkIndex}`,
        book_id: bookId,
        book_name: bookName,
        chapter_num: chapterNum,
        index: chunkIndex,
        content,
        vector: vectors[chunkIndex],
      }));

      const result = await milvusStore.Insert({
        collection_name: COLLECTION_NAME_EBOOK,
        data: insertData,
      });

      const inserted = Number(result.insert_cnt) || 0;
      totalInserted += inserted;
      console.log(`  ✓ Inserted ${inserted} records (total: ${totalInserted})`);
    }

    return {
      count: totalInserted,
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
