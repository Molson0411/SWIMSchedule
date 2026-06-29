# SWIMSchedule

## 2026-06-29 泳池使用概況介面精簡
- 移除舊版「場地週表」按鈕、Modal 組件與相關狀態，只保留最新的「一週總表」入口。
- 移除「教學概況匯出」卡片、CSV 下載、日期範圍切換、欄位 Checkbox，以及其 Firestore 查詢與匯出邏輯。
- `PoolMonitor` 現在專注顯示泳池即時負載，週課程預覽統一由 `WeeklyTimetable` 提供。

## 2026-06-29 一週二維課表
- 新增 `WeeklyTimetable`，將 Firestore 一週課程依「星期一至星期日」與「09:00 至 20:00」整點區段分群呈現。
- 課程以開始時間歸入對應整點，例如 `09:30` 顯示於 `09:00` 列；同格多筆課程完整列出教練、起訖時間、學生與課型。
- 使用原生 HTML Table，支援橫向捲動、內容自動增高與直接反白複製到 Excel，並提供前一週、本週、下一週切換。
- 在監控面板加入「一週總表」入口，並保留既有場地週表功能。

## 2026-06-25 監控面板教學概況 CSV 匯出紀錄

- 監控面板新增「教學概況匯出」區塊，可切換當天與當週範圍。
- 當週模式會以目前選取日期計算週一至週日，並查詢 Firestore `lessons` 的 `date >= startDate` 與 `date <= endDate`。
- 匯出前可勾選日期、時段、教練姓名、學生姓名或備註、泳池與位置、課程型態、實際上課人數、簽到出勤狀態。
- CSV 下載加入 UTF-8 BOM，讓 Excel 開啟繁體中文時保持正常顯示。

## 2026-06-25 新增課程容量預覽修復紀錄

- 新增課程表單加入即時容量檢查，會依日期、開始時間、結束時間、池別與水道查詢同日課程。
- 25m 大池以同水道統計「學生數 + 1 位教練」，上限 8 人；小池統計同時段小池總人數，上限 30 人。
- 泳道區塊下方新增容量提示框，安全、擁擠、額滿分別以綠色、橘色、紅色呈現。
- 當容量達 100% 時，儲存按鈕會停用，送出函式也會再次攔截，避免額滿時硬送表單。

## 2026-06-25 資料擁有者編輯權限修復紀錄

- 課程卡片新增資料擁有者判斷，只有 `lesson.coachId === currentUser.uid` 的教練會看到編輯與簽到按鈕。
- App 開啟編輯表單前會再次檢查課程擁有者，非本人會顯示「權限不足」提示並停止操作。
- 課程表單送出更新與刪除前會再次檢查資料擁有者，避免繞過 UI 後修改他人課程。
- Firestore `lessons` 規則改為登入者可讀取總表，但 create/update/delete 必須符合 `coachId === request.auth.uid`。

## 2026-06-25 簽到時間窗口調整紀錄

- 簽到開始時間維持為課程開始前 15 分鐘。
- 簽到截止時間改為課程當日 23:59:59，教練可在當天結束前補簽。
- 尚未開放時按鈕顯示灰色「尚未開放」，可簽到時顯示薄荷綠「點擊簽到」，逾期未簽時顯示紅色「缺簽」。

## 2026-06-24 前端管理員限制移除紀錄

- 已移除前端課程編輯入口的 `Admin` / 擁有者判斷，所有已登入教練都能開啟課程編輯表單。
- 底部導覽列固定顯示「管理」分頁，不再依 `isAdmin` 決定是否顯示。
- 課程卡片不再接收 `isAdmin` 權限 prop，簽到操作只會在課程已簽到後停用。
- 月報頁開放所有已登入使用者切換「我的 / 全部」報表，CSV 檔名依目前檢視模式產生。
- 課程表單的審核狀態、簽到狀態與管理備註欄位改為登入後即可顯示，配合 Firestore 已登入 CRUD 規則使用。

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
## 教練個人時間防撞修復紀錄

### 防止同一教練同日同時段重複排課

課程送出前已加入 Firestore 非同步檢查，會先查詢同一位教練在同一天的既有課程，再用分鐘數比較是否時間重疊。

Firestore 查詢條件：

```ts
query(
  collection(db, 'lessons'),
  where('coachId', '==', coachId),
  where('date', '==', date)
)
```

時間重疊公式：

```ts
newStart < existingEnd && newEnd > existingStart
```

送出流程：

- 表單先完成本機欄位檢查。
- 再使用 `lessonsService.checkTimeConflict()` 查詢該教練同日課程。
- 若發現重疊，顯示：「您在這個時段已經有排課了，請選擇其他時間！」
- 發現衝突時直接 `return`，不執行 Firestore 寫入。
- 沒有衝突時，才繼續原本的新增或更新流程。

核心程式：

```ts
const hasCoachConflict = await lessonsService.checkTimeConflict({
  coachId: lesson.coachId,
  date: lesson.date,
  startTime: lesson.startTime,
  endTime: lesson.endTime,
  excludeLessonId: editLesson?.id,
});

if (hasCoachConflict) {
  const message = '您在這個時段已經有排課了，請選擇其他時間！';
  setError(message);
  window.alert(message);
  return;
}
```

## Firestore 編輯權限修復紀錄

### 課程編輯 `Missing or insufficient permissions`

課程編輯送出時會呼叫 `updateDoc()`，因此 Firestore Security Rules 必須明確允許 `update`。目前 `firestore.rules` 已調整為：`users` 與 `lessons` 集合只要是已登入使用者，即可進行 `read`, `create`, `update`, `delete`。

完整規則：

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    match /users/{userId} {
      allow read, create, update, delete: if isSignedIn();
    }

    match /lessons/{lessonId} {
      allow read, create, update, delete: if isSignedIn();
    }

    match /coachAvailability/{coachId} {
      allow read, create, update, delete: if isSignedIn();
    }

    match /mail/{mailId} {
      allow create: if isSignedIn() &&
        request.resource.data.keys().hasOnly(['to', 'message', 'createdAt', 'type']) &&
        request.resource.data.to == request.auth.token.email &&
        request.resource.data.type == 'lesson-confirmation' &&
        request.resource.data.message.subject is string &&
        request.resource.data.message.text is string &&
        request.resource.data.message.html is string;
      allow read, update, delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Firebase 後台發布位置：

1. 開啟 Firebase Console。
2. 選擇 SWIMSchedule 使用的 Firebase 專案。
3. 進入 `Firestore Database`。
4. 切換到 `Rules` 頁籤。
5. 用本專案的 `firestore.rules` 覆蓋原有規則。
6. 按下 `Publish` 發布。

## Google 登入 In-App Browser 修復紀錄

### `403 disallowed_useragent`

Google OAuth 不支援 LINE、Messenger、Instagram 等通訊軟體內建瀏覽器。登入頁已加入前端防呆：

- 使用 `isInAppBrowser()` 解析 `navigator.userAgent`。
- 偵測到 LINE、Messenger、Instagram、WeChat、KakaoTalk、TikTok 等內建瀏覽器時，隱藏「使用 Google 登入」按鈕。
- 顯示深紫色 `#2a0726` 提示卡，搭配白色與薄荷綠 `#d5f4d8` 文字。
- 提醒使用者從螢幕角落選單選擇【以預設瀏覽器開啟】。
- 提供 `googlechromes://` URL scheme 按鈕，嘗試喚醒 Chrome；若裝置或 app 不支援，使用者仍可手動以 Safari / Chrome 開啟。

核心偵測邏輯：

```ts
export function isInAppBrowser(userAgent = navigator.userAgent) {
  const normalizedUserAgent = userAgent.toLowerCase();
  const inAppBrowserPatterns = [
    'line/',
    'fbav',
    'fb_iab',
    'fban',
    'instagram',
    'micromessenger',
    'messenger',
    'kakaotalk',
    'tiktok',
  ];

  return inAppBrowserPatterns.some((pattern) => normalizedUserAgent.includes(pattern));
}
```

## 表單送出 UI 狀態修復紀錄

### 成功後清除錯誤、重置表單並關閉 Modal

課程表單送出流程已調整為清楚的成功/失敗狀態：

- 送出一開始先執行 `setError(null)`，清除舊的紅框錯誤。
- Firestore 寫入成功後執行 `resetFormState()`，重置表單資料與重複課程狀態。
- 寫入成功後呼叫 `onClose()` 關閉 Modal。
- 寫入成功後使用 `window.alert()` 顯示「課程新增成功」或「課程更新成功」。
- 寄信通知流程獨立捕捉錯誤，通知失敗不會阻擋課程新增成功後的 UI 收尾。
- 只有真正發生儲存錯誤時，才會在 catch 區塊寫入 `setError(...)` 顯示紅框。

核心送出流程：

```ts
try {
  setError(null);

  await lessonsService.createLesson(dataToSave);

  resetFormState();
  onClose();
  window.alert('課程新增成功');
} catch (err) {
  setError(err instanceof Error ? err.message : '儲存失敗，請稍後再試。');
}
```

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
