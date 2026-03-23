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
