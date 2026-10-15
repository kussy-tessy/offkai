# 参加者向け情報の画像

- 閲覧ページでは文章の下に画像一覧を表示。編集ページから1枚ずつ追加・削除する。
- 投稿・削除権限は本文編集と同じ `eventManagement`、閲覧権限は参加者向け情報と同じ。
- 最大20枚/イベント、10MiB/ファイル、入力5,000万画素以下。JPEG/PNG/WebP/GIF対応。
- サーバーで実体をデコードし、向きを補正、EXIF/GPSを除去。長辺4096px以下のWebP（品質90）として保存。アニメーションは先頭フレーム。HEIC非対応。
- アップロード・削除は即時反映。文章保存とは独立。
- 非公開R2バケットにVPSから送信。閲覧用URLは権限確認後に発行し、有効期限は5分。拡大するたびに全画像のURLを再取得。タップした画像から開き、左右フリック・前後ボタン・矢印キーで切り替え可能（端でループしない）。一覧は再読み込みボタンで更新できる。
- URLを知る人は期限内なら取得可能。削除後も既に取得・キャッシュされた画像は取り消せない。

## 設定・デプロイ

バックエンドの環境変数:

```dotenv
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_BUCKET_NAME=your-private-bucket
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

`BUCKET_NAME` / `ACCESS_KEY_ID` / `SECRET_ACCESS_KEY` もフォールバックとして対応。
既存の本番Docker構成では `.env.prod` に設定する。ブラウザへの秘密鍵の公開やR2のCORS設定は不要（画像表示は通常のimg要素）。

追加マイグレーション `20261008000000_participant_guide_images` を適用する。
本番Dockerは既存の起動処理で `prisma migrate deploy` を実行する。
Nginx等を使う場合は画像の送信を通せるよう、リクエスト上限（例 `client_max_body_size 12m;`）とタイムアウトも確認する。

## 保存・削除の整合性

アップロードIDはファイルごとに発行し、同じファイルの再試行時に再利用する。
保存済みのID・送信者・イベント・内容ハッシュが一致した再送は二重登録しない。
イベント行ロックで同時アップロード時にも枚数上限を守る。

R2保存前に `R2PendingDeletion` に1時間後の削除予約を登録し、DB登録成功と同じトランザクションで予約を解除する。
失敗やプロセス停止で残った一時オブジェクトは後から回収する。
画像のDB削除時はトリガーで即時の削除予約を登録するため、イベント削除のCASCADEでも回収される。
バックエンド起動時・1分ごと・画像削除直後に削除予約を処理。R2障害時は予約を保持して再試行する。
トリガーも必要なため `prisma db push` だけではなくマイグレーションを使う。

## 確認

```sh
pnpm --filter backend exec vitest run src/service/normalize-guide-image.test.ts
GUIDE_IMAGE_DB_TEST=1 pnpm --filter backend exec vitest run src/participant-guide-images.integration.test.ts
pnpm test:e2e --config apps/frontend/e2e/images/playwright.config.ts
```

統合テストは開発DBに固有のテストイベントを作成して終了後に削除する。R2通信はモック。
ブラウザテストはAPIモックで追加・閲覧・削除とPC/モバイル操作を確認する。
実際のR2への小さな画像の保存・署名付きURL取得・削除も開発時に確認済み。
スマートフォン実機の動作確認は別途必要。
