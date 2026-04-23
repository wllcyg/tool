import { config } from "dotenv";
import Client from "./client.js";

config();

const client = new Client(
  process.env.OPENAI_API_KEY,
  process.env.MODEL_NAME,
  process.env.OPENAI_BASE_URL,
);

client.createClient();

export { client };
export default client;
