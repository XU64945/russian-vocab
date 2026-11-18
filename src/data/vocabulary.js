import vocabulary from "./vocabulary.json";

export const topics = [
  {
    id: "u1",
    label: "代词与虚词",
    ru: "Местоимения",
    color: "#1d4f9f",
    soft: "#dbe9ff",
  },
  {
    id: "u2",
    label: "最高频动词 I",
    ru: "Глаголы I",
    color: "#2e67c7",
    soft: "#e0ebff",
  },
  {
    id: "u3",
    label: "最高频动词 II",
    ru: "Глаголы II",
    color: "#3f78d6",
    soft: "#e8f0ff",
  },
  {
    id: "u4",
    label: "时间、数量与频度",
    ru: "Время и число",
    color: "#285b93",
    soft: "#dce9f5",
  },
  {
    id: "u5",
    label: "人与家庭",
    ru: "Люди и семья",
    color: "#3c669e",
    soft: "#e4edf8",
  },
  {
    id: "u6",
    label: "居家与衣食",
    ru: "Дом и еда",
    color: "#1e6ca8",
    soft: "#dbeeff",
  },
  {
    id: "u7",
    label: "城市、出行与方位",
    ru: "Город и дорога",
    color: "#457db3",
    soft: "#e2f0fb",
  },
  {
    id: "u8",
    label: "身体、健康与情绪",
    ru: "Тело и чувства",
    color: "#315a8e",
    soft: "#dee8f5",
  },
  {
    id: "u9",
    label: "学习、工作与社会",
    ru: "Учёба и работа",
    color: "#4c75ad",
    soft: "#e3ecf8",
  },
  {
    id: "u10",
    label: "性质、状态与程度",
    ru: "Качество",
    color: "#355b9a",
    soft: "#dee8fa",
  },
];

export const words = vocabulary;
export const topicMap = Object.fromEntries(
  topics.map((topic) => [topic.id, topic]),
);
