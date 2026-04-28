/**
 * 向量数据库使用示例
 * 展示如何使用抽象层进行数据库操作
 */

import {
  VectorStoreFactory,
  VectorStoreType,
  IVectorStore,
  FieldType,
  VectorMetricType,
} from "./index";

// ========== 示例1: 创建向量数据库实例 ==========
async function example1_CreateVectorStore() {
  console.log("=== 示例1: 创建向量数据库实例 ===");

  // 方式1: 使用工厂创建（推荐）
  const store = await VectorStoreFactory.create({
    type: VectorStoreType.MILVUS,
    connection: {
      address: "localhost:19530",
    },
  });

  // 方式2: 使用便捷方法
  const milvusStore = await VectorStoreFactory.createMilvus({
    address: "localhost:19530",
  });

  console.log("向量数据库实例创建成功");
  return store;
}

// ========== 示例2: 创建集合 ==========
async function example2_CreateCollection(store: IVectorStore) {
  console.log("\n=== 示例2: 创建集合 ===");

  const result = await store.createCollection({
    name: "ai_diary",
    description: "AI日记向量数据库",
    fields: [
      {
        name: "id",
        type: FieldType.INT64,
        isPrimary: true,
        autoID: true,
      },
      {
        name: "content",
        type: FieldType.VARCHAR,
        maxLength: 65535,
      },
      {
        name: "date",
        type: FieldType.VARCHAR,
        maxLength: 100,
      },
      {
        name: "mood",
        type: FieldType.VARCHAR,
        maxLength: 50,
      },
      {
        name: "tags",
        type: FieldType.VARCHAR,
        maxLength: 500,
      },
      {
        name: "embedding",
        type: FieldType.FLOAT_VECTOR,
        dimension: 1536, // OpenAI embedding 维度
      },
    ],
    enableDynamicField: true,
  });

  console.log("集合创建结果:", result);
}

// ========== 示例3: 创建索引并加载集合 ==========
async function example3_CreateIndexAndLoad(store: IVectorStore) {
  console.log("\n=== 示例3: 创建索引并加载集合 ===");

  // 创建向量索引
  const indexResult = await store.createIndex({
    collectionName: "ai_diary",
    fieldName: "embedding",
    indexType: "IVF_FLAT",
    metricType: VectorMetricType.COSINE,
    params: { nlist: 128 },
  });

  console.log("索引创建结果:", indexResult);

  // 加载集合到内存
  const loadResult = await store.loadCollection("ai_diary");
  console.log("集合加载结果:", loadResult);
}

// ========== 示例4: 插入数据 ==========
async function example4_InsertData(store: IVectorStore) {
  console.log("\n=== 示例4: 插入数据 ===");

  const result = await store.insert({
    collectionName: "ai_diary",
    data: [
      {
        content: "今天天气很好，心情愉快",
        date: "2024-01-15",
        mood: "happy",
        tags: "天气,心情",
        vector: new Array(1536).fill(0).map(() => Math.random()),
      },
      {
        content: "学习了新的编程技术，很有收获",
        date: "2024-01-16",
        mood: "excited",
        tags: "学习,编程",
        vector: new Array(1536).fill(0).map(() => Math.random()),
      },
      {
        content: "今天有点累，需要好好休息",
        date: "2024-01-17",
        mood: "tired",
        tags: "休息,疲惫",
        vector: new Array(1536).fill(0).map(() => Math.random()),
      },
    ],
  });

  console.log("插入结果:", result);
}

// ========== 示例5: 向量搜索 ==========
async function example5_VectorSearch(store: IVectorStore) {
  console.log("\n=== 示例5: 向量搜索 ===");

  // 模拟查询向量
  const queryVector = new Array(1536).fill(0).map(() => Math.random());

  const searchResult = await store.search({
    collectionName: "ai_diary",
    vector: queryVector,
    limit: 5,
    outputFields: ["id", "content", "date", "mood", "tags"],
    metricType: VectorMetricType.COSINE,
  });

  console.log("搜索结果:");
  searchResult.results.forEach((item, index) => {
    console.log(`${index + 1}. ID: ${item.id}, 相似度: ${item.score}`);
    console.log(`   内容: ${item.content}`);
    console.log(`   日期: ${item.date}, 心情: ${item.mood}`);
  });
}

// ========== 示例6: 标量查询 ==========
async function example6_Query(store: IVectorStore) {
  console.log("\n=== 示例6: 标量查询 ===");

  // 使用过滤条件查询
  const result = await store.query({
    collectionName: "ai_diary",
    filter: 'mood == "happy"',
    outputFields: ["id", "content", "date", "mood"],
    limit: 10,
  });

  console.log("查询结果:");
  result.data.forEach((item, index) => {
    console.log(`${index + 1}. ${item.content} (${item.date})`);
  });
}

// ========== 示例7: 更新数据 ==========
async function example7_UpdateData(store: IVectorStore) {
  console.log("\n=== 示例7: 更新数据 ===");

  const result = await store.upsert({
    collectionName: "ai_diary",
    data: [
      {
        id: 1,
        content: "今天天气很好，心情非常愉快（已更新）",
        date: "2024-01-15",
        mood: "very_happy",
        tags: "天气,心情,更新",
        vector: new Array(1536).fill(0).map(() => Math.random()),
      },
    ],
  });

  console.log("更新结果:", result);
}

// ========== 示例8: 删除数据 ==========
async function example8_DeleteData(store: IVectorStore) {
  console.log("\n=== 示例8: 删除数据 ===");

  // 方式1: 通过ID删除
  const result1 = await store.delete({
    collectionName: "ai_diary",
    ids: [1, 2],
  });
  console.log("通过ID删除结果:", result1);

  // 方式2: 通过过滤条件删除
  const result2 = await store.delete({
    collectionName: "ai_diary",
    filter: 'mood == "tired"',
  });
  console.log("通过条件删除结果:", result2);
}

// ========== 示例9: 获取集合统计信息 ==========
async function example9_GetStats(store: IVectorStore) {
  console.log("\n=== 示例9: 获取集合统计信息 ===");

  if (store.getCollectionStats) {
    const stats = await store.getCollectionStats("ai_diary");
    console.log("集合统计信息:", stats);
    console.log(`总记录数: ${stats.rowCount}`);
  }
}

// ========== 示例10: 完整的业务流程 ==========
async function example10_CompleteWorkflow() {
  console.log("\n=== 示例10: 完整的业务流程 ===");

  try {
    // 1. 创建数据库实例
    const store = await VectorStoreFactory.createMilvus({
      address: "localhost:19530",
    });

    // 2. 检查集合是否存在
    if (store.hasCollection) {
      const exists = await store.hasCollection("ai_diary");
      console.log("集合是否存在:", exists);

      if (!exists) {
        // 3. 创建集合
        await example2_CreateCollection(store);

        // 4. 创建索引并加载
        await example3_CreateIndexAndLoad(store);
      }
    }

    // 5. 插入数据
    await example4_InsertData(store);

    // 6. 执行搜索
    await example5_VectorSearch(store);

    // 7. 执行查询
    await example6_Query(store);

    // 8. 获取统计信息
    await example9_GetStats(store);

    console.log("\n✅ 完整流程执行成功");
  } catch (error) {
    console.error("❌ 流程执行失败:", error);
  }
}

// ========== 示例11: 切换数据库的便利性展示 ==========
async function example11_SwitchDatabase() {
  console.log("\n=== 示例11: 切换数据库展示 ===");

  // 使用统一的接口，业务代码不需要修改
  async function businessLogic(store: IVectorStore) {
    // 插入数据
    await store.insert({
      collectionName: "test_collection",
      data: [{ vector: [0.1, 0.2, 0.3], text: "测试" }],
    });

    // 搜索数据
    const result = await store.search({
      collectionName: "test_collection",
      vector: [0.1, 0.2, 0.3],
      limit: 10,
    });

    return result;
  }

  // 当前使用 Milvus
  const milvusStore = await VectorStoreFactory.create({
    type: VectorStoreType.MILVUS,
    connection: { address: "localhost:19530" },
  });
  await businessLogic(milvusStore);

  // 未来切换到其他数据库，只需要修改配置，业务代码完全不变
  // const pineconeStore = await VectorStoreFactory.create({
  //   type: VectorStoreType.PINECONE,
  //   connection: { apiKey: "your-api-key" }
  // });
  // await businessLogic(pineconeStore);  // 业务代码完全相同！

  console.log("切换数据库只需修改工厂配置，业务代码无需改动！");
}

// ========== 主函数：运行所有示例 ==========
async function main() {
  console.log("========================================");
  console.log("向量数据库抽象层使用示例");
  console.log("========================================");

  try {
    // 运行完整流程示例
    await example10_CompleteWorkflow();

    // 展示切换数据库的便利性
    await example11_SwitchDatabase();
  } catch (error) {
    console.error("示例执行出错:", error);
  }
}

// 如果直接运行此文件，则执行示例
if (require.main === module) {
  main().catch(console.error);
}

// 导出所有示例函数供外部使用
export {
  example1_CreateVectorStore,
  example2_CreateCollection,
  example3_CreateIndexAndLoad,
  example4_InsertData,
  example5_VectorSearch,
  example6_Query,
  example7_UpdateData,
  example8_DeleteData,
  example9_GetStats,
  example10_CompleteWorkflow,
  example11_SwitchDatabase,
};
