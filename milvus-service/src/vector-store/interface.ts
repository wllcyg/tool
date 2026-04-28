import {
  CollectionConfig,
  IndexConfig,
  InsertParams,
  UpsertParams,
  DeleteParams,
  SearchParams,
  QueryParams,
  SearchResult,
  QueryResult,
  OperationResult,
  ConnectionConfig,
} from "./types";

/**
 * 向量数据库接口
 * 所有向量数据库实现都应遵循此接口
 */
export interface IVectorStore {
  /**
   * 连接到数据库
   */
  connect(config?: ConnectionConfig): Promise<void>;

  /**
   * 断开连接
   */
  disconnect?(): Promise<void>;

  /**
   * 创建集合
   * @param config 集合配置
   */
  createCollection(config: CollectionConfig): Promise<OperationResult>;

  /**
   * 删除集合
   * @param collectionName 集合名称
   */
  dropCollection?(collectionName: string): Promise<OperationResult>;

  /**
   * 检查集合是否存在
   * @param collectionName 集合名称
   */
  hasCollection?(collectionName: string): Promise<boolean>;

  /**
   * 创建索引
   * @param config 索引配置
   */
  createIndex(config: IndexConfig): Promise<OperationResult>;

  /**
   * 加载集合到内存
   * @param collectionName 集合名称
   */
  loadCollection(collectionName: string): Promise<OperationResult>;

  /**
   * 释放集合
   * @param collectionName 集合名称
   */
  releaseCollection?(collectionName: string): Promise<OperationResult>;

  /**
   * 插入数据
   * @param params 插入参数
   */
  insert(params: InsertParams): Promise<OperationResult>;

  /**
   * 更新数据（Upsert）
   * @param params 更新参数
   */
  upsert(params: UpsertParams): Promise<OperationResult>;

  /**
   * 删除数据
   * @param params 删除参数
   */
  delete(params: DeleteParams): Promise<OperationResult>;

  /**
   * 向量搜索
   * @param params 搜索参数
   */
  search(params: SearchParams): Promise<SearchResult>;

  /**
   * 标量查询
   * @param params 查询参数
   */
  query(params: QueryParams): Promise<QueryResult>;

  /**
   * 获取集合统计信息
   * @param collectionName 集合名称
   */
  getCollectionStats?(collectionName: string): Promise<{
    rowCount: number;
    [key: string]: any;
  }>;
}
