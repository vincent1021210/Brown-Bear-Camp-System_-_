# 棕熊營系統（正式／非雨備）

線上版：https://vincent1021210.github.io/Brown-Bear-Camp-System_-_/

學員闖關進度＋關主掃碼判定（8 關正式關卡、6 個顏色小隊）。

## 本機開發

```bash
npm install
npm run dev
```

開啟 http://localhost:3000

### 流程

1. **選擇身分**：學員／關主
2. **學員**：選小隊 → 顯示 8 關進度格＋小隊專屬 QR（初始全暗）
3. **關主**：輸入密碼 → 鎖定關卡 → 掃描 QR → 判定通過／不通過
4. 學員畫面會即時點亮該關，並顯示「通過」或「不通過」

## 小隊

黑、灰、藍、紅、棕、黃

## 關卡

1. 龍門營地跳塔
2. 血跡尋寶
3. 創意鑰匙圈手作
4. 神力布袋球積分賽
5. 植物書籤
6. 蒙眼漫步
7. 捲捲棒棒糖
8. 快問快答

## 關主實時看板

首頁選擇 **進度**（免密碼），或關主登入後右上角進入 **每小隊統計圖**（`/gm/board/`）：

- 一次顯示 6 小隊 × 8 關進度
- 每 2.5 秒自動更新
- 依通關數即時排序與通關率


推送到 `main` 後，GitHub Actions 會自動建置並部署到 Pages。

可選：在 repo Secrets 設定 `GAS_WEB_APP_URL`；未設定時讀取 `public/gas-config.json`。

## Apps Script 資料庫

見 [`google-apps-script/README.md`](./google-apps-script/README.md)

專案：https://script.google.com/home/projects/1XOdg8BkKKyb-2h1pK3uQnlRDN90uIBc2PVbJUGeCFnG90YnDONxALc48/edit
