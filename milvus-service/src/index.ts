import milvusStore from "./milvus/index.js";
import embeddingsService from "./embedding/index.js";
import { DataType, MetricType, IndexType } from "@zilliz/milvus2-sdk-node";
import { COLLECTION_NAME } from "./milvus/index.js";
import Client from "./util/client.js";
import { UserPrompt } from "./prompt/index.js";
import data from "./data.js";



const agent = new Client({
  apiKey: process.env.OPENAI_API_KEY,
})

const VECTOR_DIM = 1024;
async function start(question: string) {
  try {
    console.log("start connecting to Milvus");
    await milvusStore.connect();
    console.log("Connected to Milvus");

    // 创建一个集合
    await milvusStore.CreateCollection({
      collection_name: COLLECTION_NAME,
      fields: [
        {
          name: "id",
          data_type: DataType.VarChar,
          max_length: 50,
          is_primary_key: true,
        },
        { name: "vector", data_type: DataType.FloatVector, dim: VECTOR_DIM },
        { name: "content", data_type: DataType.VarChar, max_length: 5000 },
        { name: "date", data_type: DataType.VarChar, max_length: 50 },
        { name: "mood", data_type: DataType.VarChar, max_length: 50 },
        {
          name: "tags",
          data_type: DataType.Array,
          element_type: DataType.VarChar,
          max_capacity: 10,
          max_length: 50,
        },
      ],
    });

    // 创建索引
    await milvusStore.CreateIndex({
      collection_name: COLLECTION_NAME,
      field_name: "vector",
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE,
      params: { nlist: 1024 },
    });
    console.log("Index created");

    // 加载集合
    await milvusStore.LoadCollection({
      collection_name: COLLECTION_NAME,
    });

    // 向量化数据
    const embeddings = await Promise.all(
      data.map(async (item) => ({
        ...item,
        vector: await embeddingsService.embedQuery(item.content),
      })),
    );

    // 插入数据
    const insertResult = await milvusStore.Insert({
      collection_name: COLLECTION_NAME,
      data: embeddings,
    });

    // 获取数据,先向量化 再查询
    const queryVec = await embeddingsService.embedQuery(question);
    const search = await milvusStore.Search({ vectors: queryVec });
    if (search.results && search.results.length > 0) {
      const context = search.results
        .map((diary, i) => {
          return `[日记 ${i + 1}]
日期: ${diary.date}
心情: ${diary.mood}
标签: ${diary.tags?.join(", ")}
内容: ${diary.content}`;
        })
        .join("\n\n━━━━━\n\n");

      console.log('AI 开始回答!!!!!!');

      const res = await agent.chat(UserPrompt(context, question));
      console.log(res.content);

    } else {
      console.log("No results found");
    }
    console.log(`✓ Inserted ${insertResult.insert_cnt} records\n`);
  } catch (error) {
    console.error("Failed to connect to Milvus:", error);
  }
}


function main() {
  start('我最近做了什么让我感到快乐的事情？');
}

main();
