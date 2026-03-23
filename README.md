# 成語填空大挑戰 (TypeTC)

一個專為學生設計的互動式成語學習遊戲，具有豐富的音效與視覺回饋。

## 🚀 核心功能
*   **互動學習**：隨機成語挖空，強化記憶。
*   **全域排行榜**：與全球玩家競爭，即時更新榮譽榜。
*   **極致體驗**：內建碎紙特效、立體合成音效 (BEEP) 與動態倒數計時。
*   **安全防護**：落實硬編碼隔離規範，保障 API 安全。

## 🛠️ 技術棧
*   **前端**：Vite + Vanilla JS + Tailwind CSS
*   **後端**：Firebase Firestore (Anonymous Auth)
*   **部署**：GitHub Actions + GitHub Pages

## 📖 使用指南
詳細操作說明請參閱 [使用說明.md](./使用說明.md)。

## 🛡️ 安全開發規範 (重要)
本專案遵循 **2026-03-06 API Key 零洩漏規範**：
1.  **佔位符機制**：`index.html` 中不含真實 API Key，使用 `__PLACEHOLDER__` 格式。
2.  **祕鑰注入**：透過 GitHub Secrets 結合 `.github/inject.py` 於部署階段注入真實值。
