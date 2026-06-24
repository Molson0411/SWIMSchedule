# SWIMSchedule

游泳課程排程與泳池管理系統。此專案提供教練排課、泳池使用監控、月報統計、使用者權限管理與課程通知等功能，適合用於泳池場館或游泳教學團隊的日常營運管理。

## 功能特色

- Google 登入與 Firebase 使用者驗證
- 教練課程新增、編輯與每日排程檢視
- 25m 泳池與小池課程管理
- 課程狀態、學生人數、教練與泳道資訊記錄
- 泳池使用狀況監控與每週場地排程
- 月報統計與課程資料彙整
- 管理員可管理使用者角色
- 透過 SMTP 寄送課程通知信

## 技術架構

- 前端：React 19、TypeScript、Vite
- UI 與互動：Tailwind CSS、lucide-react、motion
- 後端：Express
- 資料庫與驗證：Firebase Auth、Cloud Firestore
- 表單與驗證：react-hook-form、zod
- 郵件服務：nodemailer

## 專案結構

```text
.
├── src/
│   ├── components/      # 頁面元件與功能模組
│   ├── contexts/        # 驗證與全域狀態
│   ├── lib/             # Firebase、排程與工具函式
│   ├── services/        # Firestore 資料存取服務
│   ├── App.tsx          # 應用程式主畫面
│   └── main.tsx         # React 入口
├── .github/workflows/   # GitHub Actions 自動化流程
├── server.ts            # Express 伺服器與通知 API
├── firebase-applet-config.json
├── firestore.rules
├── package.json
└── vite.config.ts
```

## 開發環境需求

- Node.js
- npm
- Firebase 專案與 Firestore 資料庫
- Gmail App Password 或其他可用的 SMTP 憑證

## 環境設定

1. 安裝套件：

   ```bash
   npm install
   ```

2. 建立環境變數檔案：

   ```bash
   cp .env.example .env
   ```

3. 設定 SMTP 參數：

   ```env
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM_NAME=Swimming Management
   ```

4. 確認 `firebase-applet-config.json` 已填入正確的 Firebase 設定。

## 啟動專案

開發模式：

```bash
npm run dev
```

預設服務位址：

```text
http://localhost:3000
```

## 建置與正式執行

建置專案：

```bash
npm run build
```

執行正式版本：

```bash
npm start
```

## GitHub Pages 自動部署

專案已設定 GitHub Actions workflow：

```text
.github/workflows/deploy.yml
```

部署流程會在以下情況執行：

- push 到 `main` 分支
- 在 GitHub Actions 頁面手動執行 `Deploy to GitHub Pages`

第一次使用 GitHub Pages 時，請到 GitHub repository：

1. 開啟 `Settings`
2. 進入 `Pages`
3. Source 選擇 `GitHub Actions`
4. 將程式 push 到 `main`

workflow 會自動執行：

- 安裝依賴
- 執行 TypeScript 檢查
- 建置 Vite 靜態網站
- 上傳 `dist`
- 部署到 GitHub Pages

> 注意：GitHub Pages 只能部署靜態前端。`server.ts` 內的 Express API 與 SMTP 寄信功能需要部署到支援 Node.js 後端的平台，例如 Render、Railway、Fly.io 或 VPS。

## 線上寄信設定

線上版部署在 GitHub Pages 時沒有 Node.js 後端，因此寄信功能預設會改用 Firebase 的 `mail` collection。建議搭配 Firebase 官方 Trigger Email Extension 使用。

設定方式：

1. 到 Firebase Console 開啟此專案。
2. 進入 `Extensions`。
3. 安裝 `Trigger Email` extension。
4. 將郵件集合名稱設定為：

   ```text
   mail
   ```

5. 依照 extension 指示設定 SMTP，例如 Gmail App Password。
6. 部署 Firestore rules：

   ```bash
   firebase deploy --only firestore:rules
   ```

完成後，使用者新增課程時，前端會建立 `mail` 文件，Trigger Email Extension 會負責實際寄出郵件。

如果你另外部署了 Node.js 後端，也可以設定：

```env
VITE_NOTIFY_LESSON_URL=https://your-api.example.com/api/notify-lesson
```

有設定 `VITE_NOTIFY_LESSON_URL` 時，前端會優先呼叫該 API；未設定時，本機會使用 `/api/notify-lesson`，線上 GitHub Pages 會使用 Firebase `mail` collection。

## 可用指令

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 啟動本機開發伺服器 |
| `npm run build` | 建置前端與後端輸出檔 |
| `npm start` | 執行建置後的正式版本 |
| `npm run lint` | 執行 TypeScript 型別檢查 |
| `npm run clean` | 清除建置輸出 |

## 資料與權限

系統主要使用 Firestore 儲存以下資料：

- `lessons`：課程資料、日期、時間、教練、學生、泳池與簽到狀態
- `users`：使用者基本資料與角色

角色分為：

- `Coach`：一般教練，可管理自己的課程
- `Admin`：管理員，可管理使用者與更完整的課程資料

## 注意事項

- `.env`、金鑰與服務帳號檔案不應提交到版本控制。
- SMTP 未設定時，系統仍可運作，但課程通知信會略過寄送。
- Firebase 設定與 Firestore 規則會影響登入、讀寫與角色管理權限。
- 如果部署到 GitHub Pages，請確認 Firebase Auth 已允許 GitHub Pages 網域。

## 修復紀錄

### Firestore `addDoc()` undefined field

新增課程時，Firestore 不接受任何值為 `undefined` 的欄位。課程建立流程已加入以下保護：

- 新增模式不再把 `id` 放入 payload，文件 ID 由 `addDoc()` 自動產生。
- `lessonsService.createLesson()` 會在寫入前移除 `id` 與所有 `undefined` 欄位。
- 選填欄位如 `studentNames`、`adminNote` 會以空字串儲存。
- 小池課程不需要泳道時，`lane` 會以 `null` 儲存。
## Firestore 權限修復紀錄

### `Missing or insufficient permissions`

課程寫入需要 Firestore Security Rules 允許已登入使用者操作 `lessons` 集合。目前 `firestore.rules` 的課程規則採用基本安全版：

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    match /lessons/{lessonId} {
      allow read, create, update, delete: if isSignedIn();
    }
  }
}
```

Firebase Console 更新位置：

1. 開啟 Firebase Console。
2. 選擇此專案。
3. 進入 `Firestore Database`。
4. 切換到 `Rules` 頁籤。
5. 貼上或同步此專案的 `firestore.rules`。
6. 按下 Publish 發布規則。

前端送出表單前會確認登入狀態：

```ts
if (!user) {
  setError('請先登入後再新增或更新課程。');
  return;
}

if (!profile) {
  setError('已取得登入狀態，正在載入使用者資料，請稍後再試。');
  return;
}
```
