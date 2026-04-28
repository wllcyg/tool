import { IVectorStore } from "./interface";
import { MilvusAdapter } from "./adapters/milvus.adapter";
import { ConnectionConfig } from "./types";

/**
 * 支持的向量数据库类型
 */
export enum VectorStoreType {
  MILVUS = "milvus",
  // 未来可扩展其他向量数据库
  // PINECONE = "pinecone",
  // QDRANT = "qdrant",
  // WEAVIATE = "weaviate",
  // CHROMA = "chroma",
}

/**
 * 向量数据库工厂配置
 */
export interface VectorStoreFactoryConfig {
  type: VectorStoreType;
  connection?: ConnectionConfig;
}

/**
 * 向量数据库工厂类
 * 负责创建和管理不同类型的向量数据库实例
 */
export class VectorStoreFactory {
  private static instances: Map<string, IVectorStore> = new Map();

  /**
   * 创建向量数据库实例
   * @param config 工厂配置
   * @param singleton 是否使用单例模式（默认 true）
   */
  public static async create(
    config: VectorStoreFactoryConfig,
    singleton: boolean = true
  ): Promise<IVectorStore> {
    const key = `${config.type}_${config.connection?.address || "default"}`;

    // 如果使用单例且已存在实例，直接返回
    if (singleton && this.instances.has(key)) {
      return this.instances.get(key)!;
    }

    let store: IVectorStore;

    switch (config.type) {
      case VectorStoreType.MILVUS:
        store = MilvusAdapter.getInstance();
        await store.connect(config.connection);
        break;

      // 未来可以在这里添加其他向量数据库的适配器
      // case VectorStoreType.PINECONE:
      //   store = new PineconeAdapter();
      //   await store.connect(config.connection);
      //   break;

      // case VectorStoreType.QDRANT:
      //   store = new QdrantAdapter();
      //   await store.connect(config.connection);
      //   break;

      default:
        throw new Error(`Unsupported vector store type: ${config.type}`);
    }

    // 缓存实例
    if (singleton) {
      this.instances.set(key, store);
    }

    return store;
  }

  /**
   * 获取已存在的实例
   * @param type 数据库类型
   * @param address 连接地址（可选）
   */
  public static getInstance(
    type: VectorStoreType,
    address?: string
  ): IVectorStore | undefined {
    const key = `${type}_${address || "default"}`;
    return this.instances.get(key);
  }

  /**
   * 清除所有缓存的实例
   */
  public static async clearAll(): Promise<void> {
    for (const [key, store] of this.instances.entries()) {
      if (store.disconnect) {
        await store.disconnect();
      }
    }
    this.instances.clear();
  }

  /**
   * 清除特定实例
   * @param type 数据库类型
   * @param address 连接地址（可选）
   */
  public static async clear(
    type: VectorStoreType,
    address?: string
  ): Promise<void> {
    const key = `${type}_${address || "default"}`;
    const store = this.instances.get(key);

    if (store) {
      if (store.disconnect) {
        await store.disconnect();
      }
      this.instances.delete(key);
    }
  }

  /**
   * 创建 Milvus 实例的便捷方法
   * @param connection 连接配置
   */
  public static async createMilvus(
    connection?: ConnectionConfig
  ): Promise<IVectorStore> {
    return this.create({
      type: VectorStoreType.MILVUS,
      connection,
    });
  }

  // 未来可以添加其他数据库的便捷方法
  // public static async createPinecone(connection?: ConnectionConfig): Promise<IVectorStore> {
  //   return this.create({
  //     type: VectorStoreType.PINECONE,
  //     connection,
  //   });
  // }

  // public static async createQdrant(connection?: ConnectionConfig): Promise<IVectorStore> {
  //   return this.create({
  //     type: VectorStoreType.QDRANT,
  //     connection,
  //   });
  // }
}

/**
 * 默认导出工厂类
 */
export default VectorStoreFactory;
