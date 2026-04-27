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

    async embedDocuments(documents: string[]): Promise<number[][]> {
        return this.embedding.embedDocuments(documents);
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
