import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import "cheerio";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const getPageContent = async (
  url = "https://juejin.cn/post/7614036943890907142",
) => {
  const resultLoader = new CheerioWebBaseLoader(url, {
    selector: ".main-area p",
  });

  const documents = await resultLoader.load();

  // 分割文本

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 400,
    chunkOverlap: 50,
    separators: ["。", "？", "！"],
  });

  const splitDocuments = await textSplitter.splitDocuments(documents);
  return splitDocuments;
};

export { getPageContent };
