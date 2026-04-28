import { DataType, FieldType } from "@zilliz/milvus2-sdk-node";
import { VECTOR_DIM } from "../contance/index.js";
// 1. TypeScript 实体类型接口定义 (用于代码中的类型提示和校验)
export interface DiaryEntity {
  id?: string;
  vector: number[];
  content: string;
  date: string;
  mood: string;
  tags?: string[];
}

// 2. ORM 形式的 Milvus Schema 映射定义
export const AI_DIARY_SCHEMA: FieldType[] = [
  {
    name: "id",
    data_type: DataType.VarChar,
    max_length: 50,
    is_primary_key: true,
  },
  {
    name: "vector",
    data_type: DataType.FloatVector,
    dim: 1024
  },
  {
    name: "content",
    data_type: DataType.VarChar,
    max_length: 5000
  },
  {
    name: "date",
    data_type: DataType.VarChar,
    max_length: 50
  },
  {
    name: "mood",
    data_type: DataType.VarChar,
    max_length: 50
  },
  {
    name: "tags",
    data_type: DataType.Array,
    element_type: DataType.VarChar,
    max_capacity: 10,
    max_length: 50,
  },
];



export const AI_EBOOK_SCHEMA: FieldType[] = [
  { name: 'id', data_type: DataType.VarChar, max_length: 100, is_primary_key: true },
  { name: 'book_id', data_type: DataType.VarChar, max_length: 100 },
  { name: 'book_name', data_type: DataType.VarChar, max_length: 200 },
  { name: 'chapter_num', data_type: DataType.Int32 },
  { name: 'index', data_type: DataType.Int32 },
  { name: 'content', data_type: DataType.VarChar, max_length: 10000 },
  { name: 'vector', data_type: DataType.FloatVector, dim: VECTOR_DIM }

];  