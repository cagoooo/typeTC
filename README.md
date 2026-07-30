# 成語填空大挑戰 (TypeTC)

一個專為學生設計的互動式成語學習遊戲，具有豐富的音效與視覺回饋。

## 🚀 核心功能
*   **互動學習**：隨機成語挖空，強化記憶。
*   **全域排行榜**：與全球玩家競爭，即時更新榮譽榜。
*   **霓虹古韻視覺**：融合現代與東方美學的極致 UI，支援物端響應式 (RWD)。
*   **PWA 支援**：支援離線啟動與將網頁加入手機主畫面，體驗如原生 App。
*   **大氣氛圍 (v1.3.1)**：內建隨機國樂背景音樂與優美的櫻花落下特效。
*   **安全防護**：落實金鑰隔離注入規範，確保開發安全。

## 🛠️ 技術棧
*   **核心**：Vite + Vanilla JS + Tailwind CSS
*   **視覺設計**：Neon Heritage (Red/Gold Theme) + Glassmorphism
*   **後端**：Firebase Firestore (Anonymous Auth)
*   **部署**：GitHub Actions + GitHub Pages

## 📖 使用指南
詳細操作說明請參閱 [使用說明.md](./使用說明.md)。

## 🛡️ 安全開發規範 (重要)
本專案遵循 **2026-03-06 API Key 零洩漏規範**：
1.  **佔位符機制**：`index.html` 中不含真實 API Key，使用 `__PLACEHOLDER__` 格式。
2.  **祕鑰注入**：透過 GitHub Secrets 結合 `.github/inject.py` 於部署階段注入真實值。

---
*Last Updated: 2026-03-23* - **v1.3.1 「大氣增強」正式版**。新增隨機國樂、櫻花特效、佈局修正與音樂預設開啟優化。

---

<!-- BEGIN:PROJECT_GUIDE -->
## 專案導覽

成語填空打字遊戲 (pro版)

- 專案定位：互動遊戲／遊戲化學習專案
- Repository：`cagoooo/typeTC`
- 可見性：公開
- 主要技術：JavaScript、Vite、Firebase、Tailwind CSS
- 線上入口：未在 GitHub repository metadata 設定

### 可以怎麼應用

- 課堂暖身、複習活動或學習站任務
- 校慶、闖關或社團活動中的互動挑戰
- 替換題庫、美術、音效與規則後，延伸成其他學科或主題遊戲

這些是依目前專案定位整理的延伸方向，不代表所有情境都已內建完成；實作前請先確認現有功能與資料格式。

### 技術與專案結構

- `README.md`
- `firebase.json`
- `index.html`
- `package.json`
- `public`
- `src`
- `vite.config.js`

檔案結構會隨版本演進；若本節與程式碼不一致，以目前預設分支的原始碼為準。

### 本機執行

```bash
npm install
# dev
npm run dev
# build
npm run build
```
請以 `package.json` 的 `scripts` 為準；若專案需要雲端服務，請先建立自己的環境變數與測試專案。

### 給 AI Agent 的接手指南

1. 先閱讀本 README、`AGENTS.md`（若有）、套件腳本與部署設定。
2. 先找出遊戲狀態、關卡／題庫資料與輸入控制的來源，再調整規則。
3. 更換素材時同步檢查授權、載入路徑、碰撞區域與不同螢幕比例。
4. 修改後至少驗證開始、遊玩、計分／勝負、重新開始，以及手機與桌面版面。
5. 不要捏造尚未存在的功能；README 與實作有落差時，應同時更新文件。
6. 提交前只納入本次任務檔案，並記錄實際執行過的驗證。

### 安全與資料注意事項

- 不要提交 `.env`、服務帳號、API 金鑰、token、學生個資或正式環境匯出資料。
- 使用 Firebase、Supabase、Google API 或其他雲端服務時，請建立自己的測試專案並套用最小權限。
- 若要公開衍生作品，請先確認程式碼、圖片、音訊、字型與教材內容的授權。

### 貢獻與客製化

歡迎依教學現場、活動或工作流程需求進行 fork／客製化。建議在變更說明中交代使用情境、主要修改、測試方式，以及是否影響資料格式或部署設定。
<!-- END:PROJECT_GUIDE -->
