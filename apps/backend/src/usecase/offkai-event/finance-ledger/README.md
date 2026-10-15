# 精算台帳の責務

## usecase

- `route.ts`: HTTPの入口。
- `ledger.service.ts`: 閲覧権限、トランザクションの開始、同期・更新・履歴保存の順序。
- `ledger-permissions.ts`: 操作と閲覧に必要な権限。
- `ledger.sources.ts`: 取得済みの質問・回答から区分と基本請求を同期する処理。DBにはアクセスしない。
- `ledger.legacy.ts`: 取得済みの旧方式データから新台帳を構築する処理。DBにはアクセスしない。
- `ledger.projection.ts`: 権限ごとのレスポンスと移行プレビューの指紋を生成する処理。DBにはアクセスしない。

金額計算・入出金の制約は引き続き `@offkai/core` の `finance-ledger.ts` に置く。

## repository

`src/repository/finance-ledger/` にPrismaの問い合わせをまとめる。

- `repository.ts`: usecaseから呼ぶ窓口。ロック、版番号、操作IDの重複確認、トランザクション実行、DBエラー変換。
- `state.ts`: 正規化テーブルと台帳の相互変換・保存。関連テーブルの更新順序を一か所で管理する。
- `sources.ts`: 参加可否質問と回答の取得。
- `legacy.ts`: 旧方式の各repositoryから移行元データを取得。
- `history.ts`: 履歴の保存・取得、操作者名の解決、過去の履歴JSONの読み込み互換処理。

`withLedgerTransaction` のコールバックには、そのトランザクション専用のrepositoryを渡す。
usecaseはイベントのロックを最初に取得し、台帳・版番号・履歴を同じトランザクションで更新する。
コールバック内でデフォルト接続のrepositoryを新規作成してはならない。
競合確認、操作IDによる再送防止、30秒のタイムアウトは従来の挙動を維持する。

## 検証

サービスの権限・競合・履歴は `ledger.service.test.ts`、実サービスの初期化と移行は
`ledger.lifecycle.database.test.ts`、正規化テーブルの保存復元はrepository側の
`state.database.test.ts` で検証する。

実DBテストは `RUN_LEDGER_DB_TEST=1` のときだけ実行する。
保存復元テストは全書き込みをロールバックし、ライフサイクルテストは専用イベントを作成して終了時に削除する。
