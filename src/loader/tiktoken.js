import { getEncoding, getEncodingNameForModel } from "js-tiktoken";
const modelName = "gpt-4";
const encodingName = getEncodingNameForModel(modelName);
console.log(encodingName);

const enc = getEncoding(encodingName);
console.log("apple", enc.encode("apple").length);
