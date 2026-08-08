/** 正式關卡定義（學員進度格與關主鎖定共用） */
export const EVENT_ID = "event-brown-bear-2026-main";
export const EVENT_NAME = "棕熊營闖關活動";

export const STATION_DEFS = [
  {
    order: 1,
    name: "龍門營地跳塔",
    shortName: "跳塔",
  },
  {
    order: 2,
    name: "血跡尋寶",
    shortName: "血跡尋寶",
  },
  {
    order: 3,
    name: "創意鑰匙圈手作",
    shortName: "鑰匙圈",
  },
  {
    order: 4,
    name: "神力布袋球積分賽",
    shortName: "布袋球",
  },
  {
    order: 5,
    name: "植物書籤",
    shortName: "植物書籤",
  },
  {
    order: 6,
    name: "蒙眼漫步",
    shortName: "蒙眼漫步",
  },
  {
    order: 7,
    name: "捲捲棒棒糖",
    shortName: "棒棒糖",
  },
  {
    order: 8,
    name: "快問快答",
    shortName: "快問快答",
  },
] as const;

export const TEAM_EMBLEMS = ["黑", "灰", "藍", "紅", "棕", "黃"] as const;
