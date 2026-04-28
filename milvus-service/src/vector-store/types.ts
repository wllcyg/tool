// 通用向量数据库类型定义

/**
 * 度量类型 - 用于向量相似度计算
 */
export enum VectorMetricType {
  L2 = "L2",
  IP = "IP", // 内积
  COSINE = "COSINE", // 余弦相似度
}

/**
 * 字段数据类型
 */
export enum FieldType {
  INT64 = "Int64",
  VARCHAR = "VarChar",
  FLOAT_VECTOR = "FloatVector",
  BOOL = "Bool",
  FLOAT = "Float",
  DOUBLE = "Double",
  JSON = "JSON",
}

/**
 * 字段定义
 */
export interface FieldSchema {
  name: string;
  type: FieldType;
  isPrimary?: boolean;
  autoID?: boolean;
  dimension?: number; // 向量维度
  maxLength?: number; // VARCHAR 最大长度
  description?: string;
}

/**
 * 集合配置
 */
export interface CollectionConfig {
  name: string;
  description?: string;
  fields: FieldSchema[];
  enableDynamicField?: boolean;
}

/**
 * 索引配置
 */
export interface IndexConfig {
  collectionName: string;
  fieldName: string;
  indexType?: string;
  metricType?: VectorMetricType;
  params?: Record<string, any>;
}

/**
 * 向量数据
 */
export interface VectorData {
  id?: string | number;
  vector: number[];
  [key: string]: any; // 其他自定义字段
}

/**
 * 插入参数
 */
export interface InsertParams {
  collectionName: string;
  data: VectorData[];
}

/**
 * 更新参数
 */
export interface UpsertParams {
  collectionName: string;
  data: VectorData[];
}

/**
 * 删除参数
 */
export interface DeleteParams {
  collectionName: string;
  filter?: string; // 过滤表达式
  ids?: (string | number)[]; // 指定 ID 删除
}

/**
 * 搜索参数
 */
export interface SearchParams {
  collectionName: string;
  vector: number[] | number[][]; // 单个或多个查询向量
  limit?: number;
  offset?: number;
  filter?: string; // 过滤条件
  outputFields?: string[]; // 需要返回的字段
  metricType?: VectorMetricType;
  params?: Record<string, any>; // 额外的搜索参数
}

/**
 * 查询参数
 */
export interface QueryParams {
  collectionName: string;
  filter?: string;
  outputFields?: string[];
  limit?: number;
  offset?: number;
  ids?: (string | number)[];
}

/**
 * 搜索结果项
 */
export interface SearchResultItem {
  id: string | number;
  score: number; // 相似度分数
  [key: string]: any; // 其他返回字段
}

/**
 * 搜索结果
 */
export interface SearchResult {
  results: SearchResultItem[];
  status?: {
    code: number;
    message: string;
  };
}

/**
 * 查询结果
 */
export interface QueryResult {
  data: Record<string, any>[];
  status?: {
    code: number;
    message: string;
  };
}

/**
 * 操作结果
 */
export interface OperationResult {
  success: boolean;
  message?: string;
  insertCount?: number;
  deleteCount?: number;
  upsertCount?: number;
  [key: string]: any;
}

/**
 * 连接配置
 */
export interface ConnectionConfig {
  address?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  [key: string]: any; // 扩展配置
}
