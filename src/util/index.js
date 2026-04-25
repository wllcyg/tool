import { config } from "dotenv";
import Client from "./client.js";

config();

const client = new Client(
  process.env.OPENAI_API_KEY,
  process.env.MODEL_NAME,
  process.env.OPENAI_BASE_URL,
  process.env.MAX_ITERATIONS ? parseInt(process.env.MAX_ITERATIONS) : 30,
);

client.createClient();

export { client };
export default client;
