import {
  MilvusClient,
  MetricType,
  CreateCollectionReq,
  CreateIndexRequest,
  LoadCollectionReq,
  InsertReq,
  SearchReq,
  QueryReq,
  UpsertReq,
  DeleteReq,
} from "@zilliz/milvus2-sdk-node";

import { COLLECTION_NAME_EBOOK } from "../contance/index.js";

export const COLLECTION_NAME = "ai_diary";

export class MilvusVectorStore {
  private static instance: MilvusVectorStore;
  // 初始化 client 实例
  public client: MilvusClient;

  private constructor() {
    const mode = process.env.MILVUS_MODE || "local";
    
    // 根据模式选取连接地址和 Token
    const address = mode === "cloud" 
      ? (process.env.MILVUS_CLOUD_ADDRESS || "") 
      : (process.env.MILVUS_LOCAL_ADDRESS || "localhost:19530");
      
    const token = mode === "cloud" 
      ? process.env.MILVUS_CLOUD_TOKEN 
      : undefined;

    this.client = new MilvusClient({
      address,
      token,
      ssl: mode === "cloud",
    });
  }

  /** @internal */
  public static getInstance(): MilvusVectorStore {
    if (!MilvusVectorStore.instance) {
      MilvusVectorStore.instance = new MilvusVectorStore();
    }
    return MilvusVectorStore.instance;
  }

  // 连接数据库
  async connect() {
    await this.client.connectPromise;
  }

  // 创建 collection
  async CreateCollection(collectionOption: CreateCollectionReq) {
    return await this.client.createCollection(collectionOption);
  }

  // 创建索引
  async CreateIndex(param: CreateIndexRequest) {
    return await this.client.createIndex(param);
  }

  // 加载集合
  async LoadCollection(param: LoadCollectionReq) {
    return await this.client.loadCollection(param);
  }

  // 插入数据
  async Insert(param: Partial<InsertReq> & { collection_name?: string }) {
    return await this.client.insert({
      collection_name: param.collection_name || COLLECTION_NAME,
      ...param,
    } as InsertReq);
  }

  // 更新数据 (Upsert)
  async Update(param: Partial<UpsertReq> & { collection_name?: string }) {
    return await this.client.upsert({
      collection_name: param.collection_name || COLLECTION_NAME,
      ...param,
    } as UpsertReq);
  }

  // 删除数据
  async Delete(param: Partial<DeleteReq> & { collection_name?: string }) {
    return await this.client.delete({
      collection_name: param.collection_name || COLLECTION_NAME,
      ...param,
    } as DeleteReq);
  }

  // 根据 ID 批量删除
  async DeleteByIds(ids: string | string[], collectionName?: string) {
    const idArray = Array.isArray(ids) ? ids : [ids];
    const filter = `id in [${idArray.map((id) => `'${id}'`).join(",")}]`;
    return await this.client.delete({
      collection_name: collectionName || COLLECTION_NAME,
      filter,
    });
  }

  // 搜索数据
  async Search(param: Partial<SearchReq> & { collection_name?: string } = {}) {
    const isEbook = param.collection_name === COLLECTION_NAME_EBOOK;
    return await this.client.search({
      collection_name: param.collection_name || COLLECTION_NAME,
      limit: 3,
      metric_type: MetricType.COSINE,
      output_fields: isEbook 
        ? ["id", "content", "book_name", "chapter_num", "book_id", "index"] 
        : ["id", "content", "date", "mood", "tags"],
      ...param,
    } as SearchReq);
  }

  // 查询数据
  async Query(param: Partial<QueryReq> = {}) {
    return await this.client.query({
      collection_name: COLLECTION_NAME,
      filter: "",
      limit: 10,
      ...param,
    } as QueryReq);
  }
}

export const initMilvusVectorStore = (): MilvusVectorStore => {
  return MilvusVectorStore.getInstance();
};

export const milvusStore = MilvusVectorStore.getInstance();
export default milvusStore;
