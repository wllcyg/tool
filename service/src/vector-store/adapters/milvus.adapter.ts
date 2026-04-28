import {
  MilvusClient,
  MetricType,
  DataType,
  CreateCollectionReq,
  CreateIndexRequest,
  LoadCollectionReq,
  InsertReq,
  SearchReq,
  QueryReq,
  UpsertReq,
  DeleteReq,
} from "@zilliz/milvus2-sdk-node";

import { IVectorStore } from "../interface";
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
  VectorMetricType,
  FieldType,
} from "../types";

/**
 * Milvus 向量数据库适配器
 * 将通用接口适配到 Milvus SDK
 */
export class MilvusAdapter implements IVectorStore {
  private static instance: MilvusAdapter;
  private client: MilvusClient;
  private connected: boolean = false;

  private constructor() {
    // 私有构造函数，防止外部实例化
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): MilvusAdapter {
    if (!MilvusAdapter.instance) {
      MilvusAdapter.instance = new MilvusAdapter();
    }
    return MilvusAdapter.instance;
  }

  /**
   * 连接到 Milvus
   */
  async connect(config?: ConnectionConfig): Promise<void> {
    if (this.connected) {
      return;
    }

    const address = config?.address || `${config?.host || "localhost"}:${config?.port || 19530}`;

    this.client = new MilvusClient({
      address,
      username: config?.username,
      password: config?.password,
      database: config?.database,
    });

    await this.client.connectPromise;
    this.connected = true;
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      // Milvus SDK 可能没有显式的 disconnect 方法
      // 这里可以做一些清理工作
      this.connected = false;
    }
  }

  /**
   * 创建集合
   */
  async createCollection(config: CollectionConfig): Promise<OperationResult> {
    try {
      const fields = config.fields.map((field) => ({
        name: field.name,
        data_type: this.convertFieldType(field.type),
        is_primary_key: field.isPrimary || false,
        autoID: field.autoID || false,
        dim: field.dimension,
        max_length: field.maxLength,
        description: field.description || "",
      }));

      const createCollectionReq: CreateCollectionReq = {
        collection_name: config.name,
        description: config.description || "",
        fields: fields,
        enableDynamicField: config.enableDynamicField ?? false,
      };

      const result = await this.client.createCollection(createCollectionReq);

      return {
        success: result.error_code === "Success" || result.error_code === "",
        message: result.reason || "Collection created successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create collection",
      };
    }
  }

  /**
   * 删除集合
   */
  async dropCollection(collectionName: string): Promise<OperationResult> {
    try {
      const result = await this.client.dropCollection({
        collection_name: collectionName,
      });

      return {
        success: result.error_code === "Success" || result.error_code === "",
        message: result.reason || "Collection dropped successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to drop collection",
      };
    }
  }

  /**
   * 检查集合是否存在
   */
  async hasCollection(collectionName: string): Promise<boolean> {
    try {
      const result = await this.client.hasCollection({
        collection_name: collectionName,
      });
      return result.value || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 创建索引
   */
  async createIndex(config: IndexConfig): Promise<OperationResult> {
    try {
      const indexReq: CreateIndexRequest = {
        collection_name: config.collectionName,
        field_name: config.fieldName,
        index_type: config.indexType || "IVF_FLAT",
        metric_type: this.convertMetricType(config.metricType || VectorMetricType.COSINE),
        params: config.params || { nlist: 128 },
      };

      const result = await this.client.createIndex(indexReq);

      return {
        success: result.error_code === "Success" || result.error_code === "",
        message: result.reason || "Index created successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create index",
      };
    }
  }

  /**
   * 加载集合到内存
   */
  async loadCollection(collectionName: string): Promise<OperationResult> {
    try {
      const loadReq: LoadCollectionReq = {
        collection_name: collectionName,
      };

      const result = await this.client.loadCollection(loadReq);

      return {
        success: result.error_code === "Success" || result.error_code === "",
        message: result.reason || "Collection loaded successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to load collection",
      };
    }
  }

  /**
   * 释放集合
   */
  async releaseCollection(collectionName: string): Promise<OperationResult> {
    try {
      const result = await this.client.releaseCollection({
        collection_name: collectionName,
      });

      return {
        success: result.error_code === "Success" || result.error_code === "",
        message: result.reason || "Collection released successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to release collection",
      };
    }
  }

  /**
   * 插入数据
   */
  async insert(params: InsertParams): Promise<OperationResult> {
    try {
      const insertReq: InsertReq = {
        collection_name: params.collectionName,
        data: params.data as any,
      };

      const result = await this.client.insert(insertReq);

      return {
        success: result.status.error_code === "Success" || result.status.error_code === "",
        message: result.status.reason || "Data inserted successfully",
        insertCount: result.insert_cnt || params.data.length,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to insert data",
        insertCount: 0,
      };
    }
  }

  /**
   * 更新数据（Upsert）
   */
  async upsert(params: UpsertParams): Promise<OperationResult> {
    try {
      const upsertReq: UpsertReq = {
        collection_name: params.collectionName,
        data: params.data as any,
      };

      const result = await this.client.upsert(upsertReq);

      return {
        success: result.status.error_code === "Success" || result.status.error_code === "",
        message: result.status.reason || "Data upserted successfully",
        upsertCount: result.upsert_cnt || params.data.length,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to upsert data",
        upsertCount: 0,
      };
    }
  }

  /**
   * 删除数据
   */
  async delete(params: DeleteParams): Promise<OperationResult> {
    try {
      let filter = params.filter || "";

      // 如果提供了 ids，构建过滤表达式
      if (params.ids && params.ids.length > 0) {
        const idList = params.ids.map((id) =>
          typeof id === "string" ? `"${id}"` : id
        ).join(", ");
        filter = `id in [${idList}]`;
      }

      const deleteReq: DeleteReq = {
        collection_name: params.collectionName,
        filter: filter,
      };

      const result = await this.client.delete(deleteReq);

      return {
        success: result.status.error_code === "Success" || result.status.error_code === "",
        message: result.status.reason || "Data deleted successfully",
        deleteCount: result.delete_cnt || 0,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to delete data",
        deleteCount: 0,
      };
    }
  }

  /**
   * 向量搜索
   */
  async search(params: SearchParams): Promise<SearchResult> {
    try {
      const searchReq: SearchReq = {
        collection_name: params.collectionName,
        data: Array.isArray(params.vector[0]) ? params.vector : [params.vector],
        limit: params.limit || 10,
        offset: params.offset || 0,
        filter: params.filter || "",
        output_fields: params.outputFields || [],
        metric_type: this.convertMetricType(params.metricType || VectorMetricType.COSINE),
        params: params.params || {},
      } as SearchReq;

      const result = await this.client.search(searchReq);

      // 转换搜索结果
      const results = result.results.flatMap((queryResult: any) =>
        queryResult.map((item: any) => ({
          id: item.id,
          score: item.score,
          ...item,
        }))
      );

      return {
        results,
        status: {
          code: result.status.error_code === "Success" ? 0 : -1,
          message: result.status.reason || "",
        },
      };
    } catch (error: any) {
      return {
        results: [],
        status: {
          code: -1,
          message: error.message || "Search failed",
        },
      };
    }
  }

  /**
   * 标量查询
   */
  async query(params: QueryParams): Promise<QueryResult> {
    try {
      let filter = params.filter || "";

      // 如果提供了 ids，构建过滤表达式
      if (params.ids && params.ids.length > 0) {
        const idList = params.ids.map((id) =>
          typeof id === "string" ? `"${id}"` : id
        ).join(", ");
        filter = `id in [${idList}]`;
      }

      const queryReq: QueryReq = {
        collection_name: params.collectionName,
        filter: filter,
        output_fields: params.outputFields || ["*"],
        limit: params.limit || 10,
        offset: params.offset || 0,
      };

      const result = await this.client.query(queryReq);

      return {
        data: result.data,
        status: {
          code: result.status.error_code === "Success" ? 0 : -1,
          message: result.status.reason || "",
        },
      };
    } catch (error: any) {
      return {
        data: [],
        status: {
          code: -1,
          message: error.message || "Query failed",
        },
      };
    }
  }

  /**
   * 获取集合统计信息
   */
  async getCollectionStats(collectionName: string): Promise<{
    rowCount: number;
    [key: string]: any;
  }> {
    try {
      const result = await this.client.getCollectionStatistics({
        collection_name: collectionName,
      });

      return {
        rowCount: parseInt(result.stats.row_count || "0", 10),
        ...result.stats,
      };
    } catch (error) {
      return {
        rowCount: 0,
      };
    }
  }

  // ========== 私有辅助方法 ==========

  /**
   * 转换字段类型
   */
  private convertFieldType(type: FieldType): DataType {
    const typeMap: Record<FieldType, DataType> = {
      [FieldType.INT64]: DataType.Int64,
      [FieldType.VARCHAR]: DataType.VarChar,
      [FieldType.FLOAT_VECTOR]: DataType.FloatVector,
      [FieldType.BOOL]: DataType.Bool,
      [FieldType.FLOAT]: DataType.Float,
      [FieldType.DOUBLE]: DataType.Double,
      [FieldType.JSON]: DataType.JSON,
    };

    return typeMap[type] || DataType.None;
  }

  /**
   * 转换度量类型
   */
  private convertMetricType(type: VectorMetricType): MetricType {
    const metricMap: Record<VectorMetricType, MetricType> = {
      [VectorMetricType.L2]: MetricType.L2,
      [VectorMetricType.IP]: MetricType.IP,
      [VectorMetricType.COSINE]: MetricType.COSINE,
    };

    return metricMap[type] || MetricType.COSINE;
  }

  /**
   * 获取原始客户端（用于特殊场景）
   */
  public getRawClient(): MilvusClient {
    return this.client;
  }
}
