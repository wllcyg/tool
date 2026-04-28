// 统一导出文件

// 导出类型定义
export {
  VectorMetricType,
  FieldType,
  FieldSchema,
  CollectionConfig,
  IndexConfig,
  VectorData,
  InsertParams,
  UpsertParams,
  DeleteParams,
  SearchParams,
  QueryParams,
  SearchResultItem,
  SearchResult,
  QueryResult,
  OperationResult,
  ConnectionConfig,
} from "./types";

// 导出接口
export { IVectorStore } from "./interface";

// 导出适配器
export { MilvusAdapter } from "./adapters/milvus.adapter";

// 导出工厂
export { VectorStoreFactory, VectorStoreType } from "./factory";
export type { VectorStoreFactoryConfig } from "./factory";

// 默认导出工厂类
export { default } from "./factory";

/**
 * 使用示例:
 *
 * // 方式1: 使用工厂创建
 * import { VectorStoreFactory, VectorStoreType } from './vector-store';
 *
 * const store = await VectorStoreFactory.create({
 *   type: VectorStoreType.MILVUS,
 *   connection: { address: 'localhost:19530' }
 * });
 *
 * // 方式2: 使用便捷方法
 * const store = await VectorStoreFactory.createMilvus({
 *   address: 'localhost:19530'
 * });
 *
 * // 方式3: 直接使用适配器
 * import { MilvusAdapter } from './vector-store';
 *
 * const adapter = MilvusAdapter.getInstance();
 * await adapter.connect({ address: 'localhost:19530' });
 *
 * // 使用统一接口操作
 * await store.search({
 *   collectionName: 'my_collection',
 *   vector: [0.1, 0.2, 0.3],
 *   limit: 10
 * });
 */
