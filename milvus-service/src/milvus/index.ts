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
  async Insert(param: InsertReq) {
    return await this.client.insert(param);
  }

  // 更新数据 (Upsert)
  async Update(param: UpsertReq) {
    return await this.client.upsert(param);
  }

  // 删除数据
  async Delete(param: DeleteReq) {
    return await this.client.delete(param);
  }

  // 搜索数据
  async Search(param: Partial<SearchReq> = {}) {
    return await this.client.search({
      collection_name: COLLECTION_NAME,
      limit: 2,
      metric_type: MetricType.COSINE,
      output_fields: ["id", "content", "date", "mood", "tags"],
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
