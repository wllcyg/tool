import { OpenAIEmbeddings } from '@langchain/openai';


export class EmbeddingsService {
    private static instance: EmbeddingsService;
    private dimension: number;
    private embedding: OpenAIEmbeddings;

    private constructor(dimension: number = 1024) {
        this.dimension = dimension;
        this.embedding = new OpenAIEmbeddings({
            model: process.env.EMBEDDINGS_MODEL_NAME,
            apiKey: process.env.OPENAI_API_KEY,
            configuration: {
                baseURL: process.env.OPENAI_BASE_URL,
            },
            dimensions: this.dimension,
        });
    }

    /** @internal */
    public static getInstance(dimension: number = 1024): EmbeddingsService {
        if (!EmbeddingsService.instance) {
            EmbeddingsService.instance = new EmbeddingsService(dimension);
        }
        return EmbeddingsService.instance;
    }

    public static get default(): EmbeddingsService {
        return this.getInstance();
    }

    async embedQuery(query: string): Promise<number[]> {
        return this.embedding.embedQuery(query);
    }

    /**
     * 将文档数组转换为向量，内部自动处理分批以绕过 API 限制 (默认每批 10 条)
     */
    async embedDocuments(documents: string[], batchSize: number = 10): Promise<number[][]> {
        if (documents.length <= batchSize) {
            return this.embedding.embedDocuments(documents);
        }

        let results: number[][] = [];
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            console.log(`[Embeddings] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}...`);
            const batchVectors = await this.embedding.embedDocuments(batch);
            results = results.concat(batchVectors);
        }
        return results;
    }
}

export const getEmbeddings = (dimension: number = 1024): EmbeddingsService => {
    return EmbeddingsService.default;
};

// If the user wants to pass a custom dimension, they can use this factory function.
// Note: Since this is a singleton, only the first call that initializes the service will respect the dimension.
export const initEmbeddings = (dimension: number = 1024): EmbeddingsService => {
    return EmbeddingsService.getInstance(dimension);
};

export const embeddingsService = EmbeddingsService.default;
export default embeddingsService;
