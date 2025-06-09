# stoneEXPthree

此專案是一個簡易的 Three.js 爆炸效果示例，載入岩石模型並以粒子特效呈現爆炸。

## 執行方式
直接以瀏覽器開啟 `index.html`，需能存取外部 CDN 以載入 Three.js、dat.GUI 及其他套件。

## URL Hash 參數
程式會解析網址 `#` 後的參數，可用 `key=value&key2=value2` 的形式撰寫，也接受以 base64 編碼的 JSON。

- **clean**：設定為 `true` 時進入簡潔模式，隱藏 GUI 與統計資訊，並啟用狀態輪詢機制。
- **clear**：設定為 `true` 時同樣隱藏 GUI 與統計資訊，但不進行狀態輪詢。
- **listenURL**：指定狀態檢查的網址，預設為 `127.0.0.1:20597/status`。僅在開啟 `clean` 模式時生效。

## 功能說明
- 載入 `Rock1` 目錄中的岩石模型 (`Rock1.obj`/`Rock1.mtl`)。
- dat.GUI 控制項（非 `clean` 或 `clear` 模式顯示）：
  - `explosionTrigger`：手動觸發爆炸，並隱藏岩石。
  - `pointSize`：調整粒子尺寸。
  - `cameraNear`：變更相機近裁剪面。
  - `lightX`、`lightY`、`lightZ`：調整方向光位置。
- Stats 面板呈現渲染效能。
- 在 `clean` 模式下，如設定 `listenURL`，網頁會每 100ms 輪詢該網址，若回傳 `True` 即自動觸發爆炸。

## 檔案結構
- `index.html`：網頁入口。
- `index.js`：主要邏輯及特效程式碼。
- `index.css`：樣式設定。
- `Rock1/`：模型與材質檔。
- `smoke.png`：粒子貼圖。
