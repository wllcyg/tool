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

export class MivlusClient {
  private static instance: MivlusClient;
  // 初始化 client 实例
  public client: MilvusClient;

  private constructor(address: string = "localhost:19530") {
    this.client = new MilvusClient({
      address: address,
    });
  }

  /** @internal */
  public static getInstance(address: string = "localhost:19530"): MivlusClient {
    if (!MivlusClient.instance) {
      MivlusClient.instance = new MivlusClient(address);
    }
    return MivlusClient.instance;
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

export const initMivlusClient = (
  address: string = "localhost:19530",
): MivlusClient => {
  return MivlusClient.getInstance(address);
};

export const mivlusClient = MivlusClient.getInstance();
export default mivlusClient;
