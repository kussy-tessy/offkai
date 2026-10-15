# 画像コンポーネント

`ImageUploader.vue` は選択・D&D・プレビュー・逐次送信・進捗・再試行を担当します。
`ImageViewer.vue` は PhotoSwipe の画像ダイアログを Vue から制御します。単体画像と複数画像のギャラリーに対応します。

```vue
<script setup lang="ts">
import { ref } from "vue";
import ImageUploader from "@/common/components/ImageUploader.vue";
import ImageViewer from "@/common/components/ImageViewer.vue";
import type {
  ImageUploadHandler,
  ViewerImage,
} from "@/common/components/ImageUploader.types";

const open = ref(false);
const image = ref<ViewerImage | null>(null);

// APIのURL・レスポンスは接続先に合わせて実装してください。
// このサンプルのAPIはまだ存在しません。
const upload: ImageUploadHandler = async (file, { signal }) => {
  const body = new FormData();
  body.append("image", file);
  const response = await fetch("/api/images", {
    method: "POST",
    body,
    signal,
    credentials: "include",
  });
  if (!response.ok) throw new Error("アップロード失敗");
  return response.json();
};

// 閲覧権限を確認したAPIから、その都度URLと画像の実寸を取得してから呼ぶ。
function showImage(value: ViewerImage) {
  image.value = value;
  open.value = true;
}
</script>

<template>
  <ImageUploader
    :upload="upload"
    :max-files="10"
    :max-file-size="10 * 1024 * 1024"
  />
  <ImageViewer v-model:open="open" :image="image" />
</template>
```

## アップローダー

- 選択後に「アップロード」を押すと1枚ずつ送信。`multiple=false` で1枚に制限。
- `uploaded` は `{ file, result }`、`error` は `{ file, error }` を通知。
- `upload` はサーバーでの保存・DB登録完了後に resolve すること。
- Axios等で送信進捗を取得できる場合は `onProgress(0〜100)` を呼ぶ。未通知時は不定進捗。
- 成功した画像は再送しない。「外す」は一覧から外すだけで、サーバー上の画像を削除しない。
- アンマウント時は `signal` を abort し、プレビューのObject URLを解放する。
- JPEG/PNG/WebP/GIF対応。HEIC変換は未実装のため説明付きで拒否。OSによる変換には依存しない。
- クライアントの形式・容量チェックは補助。サーバーでも実体検証・容量制限・権限確認が必要。
- 通信失敗後の再試行による二重登録防止はAPI側で対応する。

## ビューア

- `image` は `{ src, width, height, alt? }`。サイズは画像の実寸（ピクセル）を指定する。
- ピンチズーム、拡大後のドラッグ、ズームボタン、Escape、フォーカス制御はPhotoSwipeが担当。
- `error` は読込失敗や不正な画像情報を通知する。
- 署名付きURLの取得・更新は呼び出し側の担当。開く直前に取得し、期限切れ時は再取得する。
- 本コンポーネントの導入だけではR2や既存の写真共有画面には接続されない。
- iOS Safari/Android Chromeの実機でもジェスチャー・写真選択を確認すること。

## ブラウザテスト

ワークスペースのルートで実行します（既存の会計画面テストから独立した構成）。

```sh
pnpm test:e2e --config apps/frontend/e2e/images/playwright.config.ts
```

ChromiumのPC・モバイルエミュレーションで、選択・制限・再試行・D&D・ダイアログ開閉・2点タッチによるズームを確認します。実機テストの代替ではありません。

### 複数画像をフリックで切り替える

```vue
<ImageViewer v-model:open="open" :images="images" :initial-index="selectedIndex" />
```

`images` は `ViewerImage[]`、`initialIndex` は開く画像の0始まりの位置です。`images` を指定した場合は単体用の `image` より優先されます。複数枚の場合は左右フリック・前後ボタン・矢印キーで移動でき、枚数を表示します。先頭と末尾はループしません。
