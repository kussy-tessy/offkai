# Finance frontend

`FinanceLayout.vue` がタブと `ledger/LedgerWorkspace.vue` を表示する。
現行の台帳画面は `ledger`、旧方式の画面は `legacy` に分離する。
URL・API・計算仕様はこの整理では変更していない。

## 現行台帳の構成

- `LedgerWorkspace.vue`: ページの読込、タブ選択、編集画面の開閉。
- `calculation/`: 参加費計算・区分編集・個人別請求編集。
- `collection/`: 徴収一覧と部分徴収。
- `settlement/`: 収支登録・精算内訳・収入/支出/調整の編集。
  `settlement-view-model.ts` は既に計算された台帳の表示用集計。
  ドメインの返金計算は引き続き `@offkai/core` に置く。
- `refund/`: 今の返金・追加徴収額と差額精算への切替。
- `payments/`: 入出金編集と受領記録の共通フィールド。
- `history/`: 入出金履歴。変更履歴は画面に表示せず、調査用の保存・取得処理をバックエンドに残す。
- `shared/`: 複数用途で使う配分入力、フォーム枠、編集画面の切替。
- `composables/`: 台帳取得・保存・権限などのセッション状態。
- `types/`: パネルと編集画面のイベント・props 型。
- `utils/`: 表示用フォーマット。
- `styles/`: 複数の Vue ファイルが共有する基本スタイル。

## CSS を共有する理由

`ledger-form.css` はラベルと通常の入力欄、`ledger-workspace.css` は表・カード・補足文の基本スタイル。
複数画面の重複と見た目のばらつきを避けるため、外部ファイルのまま保持する。
各コンポーネントが `<style scoped src="...">` で取り込むため、アプリ全体に適用するグローバル CSS ではない。
個別のレイアウトや配分行の調整は、そのコンポーネント内に置く。

`LedgerFormShell.vue` の `.finance-drawer` スタイルだけは、スロット内のフォームにも適用するため
クラスで範囲を限定した非 scoped CSS を使う。共有 CSS との優先順位を変えないこと。

## 旧方式

`legacy/` は旧 API を使う画面群。現在のレイアウトは子の RouterView を描画していないが、
ルーターの子ルートには旧コンポーネント参照が残っている。今回の整理では削除せず、
参照先を移動して保持した。今後新しい機能を追加する先は `ledger/`。

## 整形

リポジトリの Biome 設定は Vue の formatter を無効にしているため、finance の Vue/TS/CSS は
既存依存の Prettier で整形する。ローカル設定 `.prettierrc.json` を使用する。

```sh
pnpm --filter frontend format:finance
pnpm --filter frontend check:finance-format
```
