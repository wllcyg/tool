import mivlusClient from "./mivlus/index.js";
import embeddingsService from "./embedding/index.js";
import { DataType, MetricType, IndexType } from "@zilliz/milvus2-sdk-node";
import data from "./data.js";
const COLLECTION_NAME = "ai_diary";
const VECTOR_DIM = 1024;
async function start() {
  try {
    console.log("start connecting to Milvus");
    await mivlusClient.connect();
    console.log("Connected to Milvus");

    // 创建一个集合
    await mivlusClient.CreateCollection({
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
    await mivlusClient.CreateIndex({
      collection_name: COLLECTION_NAME,
      field_name: "vector",
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE,
      params: { nlist: 1024 },
    });
    console.log("Index created");

    // 加载集合
    await mivlusClient.LoadCollection({
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
    const insertResult = await mivlusClient.Insert({
      collection_name: COLLECTION_NAME,
      data: embeddings,
    });
    console.log(`✓ Inserted ${insertResult.insert_cnt} records\n`);
  } catch (error) {
    console.error("Failed to connect to Milvus:", error);
  }
}

start();
