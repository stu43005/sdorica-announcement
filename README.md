# 自動發佈 Sdorica 遊戲公告 Discord bot

## 介紹
此腳本會自動抓取[Sdorica官方網站](https://www.sdorica.com/zh/)的公告API、及遊戲內的公告API，自動匹配新公告及異常狀況更新，並透過Discord Webhook發送至頻道中。

## 部屬
1. 建立新的 [Google Apps Script](https://script.google.com/home) 專案。
2. 將`index.gs`及複製至專案上。
3. 建立新的 [Google Spreadsheets](https://docs.google.com/spreadsheets/) 試算表文件，並記下試算表ID。
4. 開啟`index.gs`，將`sheetId`變數修改為試算表ID。
5. 修改`locale`變數改變公告語言 (中文: `zh_TW`，英文: `en_US`，日文: `ja_JP`，韓文: `ko_KR`)。
6. 先執行一遍函式`doCheck`，提示要求權限請確認
> 此步驟是先讓試算表紀錄當前所有公告內容，避免後續重發所有公告。
7. 在 Discord 中建立 Webhook，並記下網址。
8. 開啟`index.gs`，將`webhookUrl`變數修改為 Webhook 網址。
9. 設定觸發程序 (`編輯` > `現有專案的啟動程序`)，執行的功能為`doCheck`，請自行設定觸發時間。
10. 🎉 完成 🎉

## 限制
* Discord embed 內文最大只支援 2000 個字元。