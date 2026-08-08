# Google Apps Script 部署說明

正式活動 Script 專案：  
https://script.google.com/home/projects/1XOdg8BkKKyb-2h1pK3uQnlRDN90uIBc2PVbJUGeCFnG90YnDONxALc48/edit

原始碼：`Code.gs`（可用 `clasp push` 同步）

## 同步程式碼

```bash
cd google-apps-script
clasp push
```

## 部署成網頁應用程式

1. 開啟上方 Apps Script 專案
2. 按 **部署 → 新增部署作業**（或管理部署作業 → 編輯）
3. 類型選 **網頁應用程式**
4. 執行身分：**我**
5. 誰可以存取：**所有人**
6. 按 **部署**，完成授權
7. 複製 **網頁應用程式網址**（`https://script.google.com/macros/s/XXXX/exec`）
8. 貼到專案根目錄 `public/gas-config.json` 的 `gasWebAppUrl`，或設 Secrets `GAS_WEB_APP_URL`

## 資料存放

首次 API 呼叫會自動建立試算表「棕熊營闖關進度資料庫（正式）」，工作表：

- `Attempts`：闖關紀錄（eventId / teamId / stationId / status / createdAt）
- `Meta`：活動資訊

也可在編輯器手動執行 `setupDatabase` 先行建立試算表。
