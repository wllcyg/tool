import { Document } from "@langchain/core/documents";

export default [
  new Document({
    pageContent: `我是一名前端开发工程师，拥有5年的工作经验。我熟悉HTML、CSS和JavaScript，并且在React和Vue框架方面有丰富的经验。我热爱编程，喜欢解决复杂的问题，并且一直在学习新的技术来提升自己的技能。`,
    metadata: {
      chapter: 1,
      character: "万亮",
      type: "角色介绍",
      mood: "技术热情",
    },
  }),
    new Document({
    pageContent: `我是一名后端开发工程师，拥有7年的工作经验。我熟悉Node.js、Python和Java，并且在数据库设计和API开发方面有丰富的经验。我喜欢编写高效、可维护的代码，并且一直在学习新的技术来提升自己的技能。`,
    metadata: {
      chapter: 1,
      character: "李华",
      type: "角色介绍",
      mood: "技术热情",
    },
  }),
  new Document({
    pageContent: `我是一名数据科学家，拥有3年的工作经验。我熟悉Python、R和SQL，并且在数据分析、机器学习和深度学习方面有丰富的经验。我喜欢从数据中挖掘有价值的信息，并且一直在学习新的技术来提升自己的技能。`,
    metadata: {
      chapter: 1,
      character: "张伟",
      type: "角色介绍",
      mood: "技术热情",
    },
  }),
  new Document({
    pageContent: `我是一名UI/UX设计师，拥有4年的工作经验。我熟悉Sketch、Figma和Adobe XD，并且在用户界面设计和用户体验方面有丰富的经验。我喜欢创造美观、易用的设计，并且一直在学习新的技术来提升自己的技能。`,
    metadata: {
      chapter: 1,
      character: "王芳",
      type: "角色介绍",
      mood: "设计热情",
    },
  }),
  new Document({
    pageContent: `我是一名项目经理，拥有6年的工作经验。我熟悉项目管理方法论，如敏捷和瀑布，并且在团队协调和项目规划方面有丰富的经验。我喜欢组织和管理项目，并且一直在学习新的技术来提升自己的技能。`,
    metadata: {
      chapter: 1,
      character: "赵强",
      type: "角色介绍",
      mood: "管理热情",
    },
  }),
];
