import { IndexType, MetricType } from "@zilliz/milvus2-sdk-node";
import milvusStore, { COLLECTION_NAME } from "./index.js";
import embeddingsService from "../embedding/index.js";
import { AI_DIARY_SCHEMA, AI_EBOOK_SCHEMA } from "./schema.js";
import data from "../data.js";
import { COLLECTION_NAME_EBOOK } from "../contance/index.js";
export async function initMilvus() {
  console.log("Connecting to Milvus...");
  await milvusStore.connect();
  console.log("Connected to Milvus ✓");

  const { value: exists } = await milvusStore.client.hasCollection({
    collection_name: COLLECTION_NAME,
  });

  if (!exists) {
    console.log("Collection not found, initializing...");
    await milvusStore.CreateCollection({ collection_name: COLLECTION_NAME, fields: AI_DIARY_SCHEMA });
    await milvusStore.CreateIndex({
      collection_name: COLLECTION_NAME,
      field_name: "vector",
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE,
      params: { nlist: 1024 },
    });

    const embeddings = await Promise.all(
      data.map(async (item) => ({
        ...item,
        vector: await embeddingsService.embedQuery(item.content),
      }))
    );
    const result = await milvusStore.Insert({ collection_name: COLLECTION_NAME, data: embeddings });
    console.log(`✓ Inserted ${result.insert_cnt} records`);
  } else {
    console.log("Collection already exists, skipping init ✓");
  }
}

// 创建 ebook 集合
export async function initEbookCollection() {
  console.log("Connecting to Milvus...");
  await milvusStore.connect();
  console.log("Connected to Milvus ✓");

  const { value: exists } = await milvusStore.client.hasCollection({
    collection_name: COLLECTION_NAME_EBOOK,
  });

  if (!exists) {
    console.log("Collection not found, initializing...");
    await milvusStore.CreateCollection({ collection_name: COLLECTION_NAME_EBOOK, fields: AI_EBOOK_SCHEMA });
    await milvusStore.CreateIndex({
      collection_name: COLLECTION_NAME_EBOOK,
      field_name: "vector",
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE,
      params: { nlist: 1024 },
    });
    try {
      await milvusStore.LoadCollection({ collection_name: COLLECTION_NAME_EBOOK })
    } catch (error) {
      console.log('加载 ebbok error: ', error);

    }

  } else {
    console.log("Collection already exists, skipping init ✓");
  }
}