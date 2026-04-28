# 向量数据库抽象层

## 📖 概述

本抽象层为向量数据库操作提供了统一的接口，使得应用程序可以轻松地在不同的向量数据库之间切换，而无需修改业务代码。

## 🎯 为什么需要抽象层？

### 当前问题

原始的 `milvus/index.ts` 存在以下问题：

1. **紧耦合**：代码直接依赖 Milvus SDK 的类型和实现
2. **难以测试**：无法轻松 mock 数据库操作
3. **难以迁移**：切换数据库需要修改所有业务代码
4. **缺乏灵活性**：无法支持多数据库场景

### 解决方案

通过引入抽象层，我们获得：

✅ **松耦合**：业务代码只依赖抽象接口  
✅ **易于测试**：可以轻松创建 Mock 实现  
✅ **易于迁移**：切换数据库只需修改配置  
✅ **多数据库支持**：可以同时使用多种向量数据库  
✅ **可维护性**：清晰的架构和职责分离

## 🏗️ 架构设计

```
vector-store/
├── types.ts              # 通用类型定义
├── interface.ts          # 向量数据库接口
├── factory.ts            # 工厂类
├── adapters/             # 适配器实现
│   ├── milvus.adapter.ts # Milvus 适配器
│   ├── pinecone.adapter.ts (未来)
│   └── qdrant.adapter.ts (未来)
├── index.ts              # 统一导出
├── example.ts            # 使用示例
└── README.md             # 本文档
```

### 核心组件

#### 1. 类型定义 (`types.ts`)
定义了所有通用的数据类型和接口，与具体数据库实现无关。

#### 2. 抽象接口 (`interface.ts`)
`IVectorStore` 接口定义了向量数据库的标准操作。

#### 3. 适配器 (`adapters/*.adapter.ts`)
将特定数据库的 SDK 适配到统一接口。

#### 4. 工厂类 (`factory.ts`)
负责创建和管理数据库实例。

## 🚀 快速开始

### 基础使用

```typescript
import { VectorStoreFactory, VectorStoreType } from './vector-store';

// 创建 Milvus 实例
const store = await VectorStoreFactory.create({
  type: VectorStoreType.MILVUS,
  connection: {
    address: 'localhost:19530'
  }
});

// 使用统一接口操作
const result = await store.search({
  collectionName: 'my_collection',
  vector: [0.1, 0.2, 0.3],
  limit: 10
});
```

### 便捷方法

```typescript
// 直接创建 Milvus 实例
const store = await VectorStoreFactory.createMilvus({
  address: 'localhost:19530'
});
```

### 完整示例

```typescript
import {
  VectorStoreFactory,
  FieldType,
  VectorMetricType
} from './vector-store';

async function main() {
  // 1. 创建数据库实例
  const store = await VectorStoreFactory.createMilvus({
    address: 'localhost:19530'
  });

  // 2. 创建集合
  await store.createCollection({
    name: 'ai_diary',
    fields: [
      {
        name: 'id',
        type: FieldType.INT64,
        isPrimary: true,
        autoID: true
      },
      {
        name: 'content',
        type: FieldType.VARCHAR,
        maxLength: 65535
      },
      {
        name: 'embedding',
        type: FieldType.FLOAT_VECTOR,
        dimension: 1536
      }
    ]
  });

  // 3. 创建索引
  await store.createIndex({
    collectionName: 'ai_diary',
    fieldName: 'embedding',
    metricType: VectorMetricType.COSINE
  });

  // 4. 加载集合
  await store.loadCollection('ai_diary');

  // 5. 插入数据
  await store.insert({
    collectionName: 'ai_diary',
    data: [
      {
        content: '今天天气很好',
        vector: [0.1, 0.2, /* ... */]
      }
    ]
  });

  // 6. 向量搜索
  const searchResult = await store.search({
    collectionName: 'ai_diary',
    vector: [0.1, 0.2, /* ... */],
    limit: 5,
    outputFields: ['id', 'content']
  });

  console.log(searchResult.results);
}
```

## 🔄 数据库迁移

### 从原始实现迁移

**之前（紧耦合）：**
```typescript
import { milvusStore } from './milvus';

// 直接使用 Milvus 特定的类型
const result = await milvusStore.Search({
  collection_name: COLLECTION_NAME,
  vector: embedding,
  limit: 2,
  metric_type: MetricType.COSINE,
  output_fields: ['id', 'content']
} as SearchReq);
```

**之后（松耦合）：**
```typescript
import { VectorStoreFactory } from './vector-store';

const store = await VectorStoreFactory.createMilvus();

// 使用通用接口
const result = await store.search({
  collectionName: 'ai_diary',
  vector: embedding,
  limit: 2,
  metricType: VectorMetricType.COSINE,
  outputFields: ['id', 'content']
});
```

### 切换到其他数据库

**切换到 Pinecone（未来）：**
```typescript
// 只需修改这一行配置
const store = await VectorStoreFactory.create({
  type: VectorStoreType.PINECONE,
  connection: { apiKey: 'your-api-key' }
});

// 业务代码完全不变！
const result = await store.search({
  collectionName: 'ai_diary',
  vector: embedding,
  limit: 2
});
```

## 🔧 添加新的数据库适配器

### 步骤 1: 创建适配器类

```typescript
// adapters/pinecone.adapter.ts
import { IVectorStore } from '../interface';
import { /* 所需类型 */ } from '../types';

export class PineconeAdapter implements IVectorStore {
  private client: any;

  async connect(config?: ConnectionConfig): Promise<void> {
    // 实现连接逻辑
  }

  async createCollection(config: CollectionConfig): Promise<OperationResult> {
    // 实现创建集合逻辑
  }

  // 实现其他必需的方法...
}
```

### 步骤 2: 在工厂中注册

```typescript
// factory.ts
export enum VectorStoreType {
  MILVUS = 'milvus',
  PINECONE = 'pinecone', // 添加新类型
}

// 在 create 方法中添加 case
case VectorStoreType.PINECONE:
  store = new PineconeAdapter();
  await store.connect(config.connection);
  break;
```

### 步骤 3: 添加便捷方法（可选）

```typescript
// factory.ts
public static async createPinecone(
  connection?: ConnectionConfig
): Promise<IVectorStore> {
  return this.create({
    type: VectorStoreType.PINECONE,
    connection
  });
}
```

## 📊 设计模式

### 1. 适配器模式 (Adapter Pattern)
将不同数据库的 API 适配到统一的接口。

### 2. 工厂模式 (Factory Pattern)
通过工厂类创建和管理数据库实例。

### 3. 单例模式 (Singleton Pattern)
确保每个配置只创建一个数据库实例。

### 4. 依赖倒置原则 (DIP)
业务代码依赖抽象接口，而不是具体实现。

## ✅ 优势总结

| 方面 | 原始实现 | 抽象层实现 |
|------|----------|------------|
| **耦合度** | 高度耦合 Milvus | 松耦合，依赖抽象 |
| **可测试性** | 难以 mock | 易于 mock 和测试 |
| **可维护性** | 修改影响全局 | 职责清晰，易于维护 |
| **可扩展性** | 难以添加新数据库 | 轻松添加新适配器 |
| **迁移成本** | 需修改所有业务代码 | 只需修改配置 |
| **多数据库支持** | 不支持 | 原生支持 |

## 📝 最佳实践

### 1. 使用依赖注入

```typescript
class DiaryService {
  constructor(private vectorStore: IVectorStore) {}

  async searchDiary(query: string) {
    const embedding = await getEmbedding(query);
    return this.vectorStore.search({
      collectionName: 'ai_diary',
      vector: embedding,
      limit: 10
    });
  }
}

// 创建服务
const store = await VectorStoreFactory.createMilvus();
const service = new DiaryService(store);
```

### 2. 使用环境变量配置

```typescript
const store = await VectorStoreFactory.create({
  type: process.env.VECTOR_DB_TYPE as VectorStoreType,
  connection: {
    address: process.env.VECTOR_DB_ADDRESS,
    username: process.env.VECTOR_DB_USER,
    password: process.env.VECTOR_DB_PASSWORD
  }
});
```

### 3. 错误处理

```typescript
try {
  const result = await store.search(params);
  if (!result.status || result.status.code !== 0) {
    console.error('搜索失败:', result.status?.message);
  }
} catch (error) {
  console.error('搜索出错:', error);
}
```

## 🧪 测试

### Mock 实现

```typescript
class MockVectorStore implements IVectorStore {
  async search(params: SearchParams): Promise<SearchResult> {
    return {
      results: [
        { id: 1, score: 0.95, content: 'Mock result' }
      ],
      status: { code: 0, message: 'Success' }
    };
  }
  // 实现其他方法...
}

// 在测试中使用
const mockStore = new MockVectorStore();
const service = new DiaryService(mockStore);
```

## 📚 参考

- [Milvus 官方文档](https://milvus.io/docs)
- [适配器模式](https://refactoring.guru/design-patterns/adapter)
- [工厂模式](https://refactoring.guru/design-patterns/factory-method)
- [依赖倒置原则](https://en.wikipedia.org/wiki/Dependency_inversion_principle)

## 🤝 贡献

欢迎提交新的数据库适配器！请确保：

1. 实现 `IVectorStore` 接口的所有方法
2. 编写单元测试
3. 更新本 README 文档
4. 添加使用示例

## 📄 许可证

MIT