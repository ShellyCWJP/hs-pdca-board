# PDCA Board

課題研究の授業で、生徒が授業ごとの Plan / Do / Check・Act を記録し、教員がフィードバックを返すための最小構成アプリ。
要件と仕様は `docs/` にある。

- `docs/requirements.md`：要件定義書
- `docs/specification.md`：仕様書（データモデル、画面、Server Functions）

## 技術構成

| 領域 | 採用 |
| --- | --- |
| フレームワーク | TanStack Start（React、Vite） |
| 実行環境 | Cloudflare Workers |
| データベース | Cloudflare D1 + drizzle-orm |
| UI | shadcn/ui + Tailwind CSS |
| 認証 | Email / パスワード（Cookie セッション、PBKDF2） |

## セットアップ

```bash
pnpm install
cp .dev.vars.example .dev.vars   # SESSION_SECRET を設定
cp .env.example .env             # シード用の教員アカウント情報
pnpm db:migrate:local            # ローカル D1 にマイグレーション適用
pnpm seed                        # 教員アカウント作成
pnpm dev                         # http://localhost:3000
```

## よく使うコマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 開発サーバー |
| `pnpm typecheck` | 型チェック |
| `pnpm test:e2e` | 開発サーバーに対する E2E スモークテスト（`pnpm dev` 起動中に実行） |
| `pnpm build` | 本番ビルド |
| `pnpm db:generate` | スキーマ変更からマイグレーション SQL を生成 |
| `pnpm db:migrate:local` / `db:migrate:remote` | マイグレーション適用 |
| `pnpm seed` / `seed:remote` | 教員アカウント作成 |
| `pnpm cf-typegen` | `wrangler.jsonc` 変更後に Workers の型を再生成 |
| `pnpm deploy` | ビルドしてデプロイ |

## 本番デプロイ

```bash
pnpm wrangler d1 create pdca-board        # 出力の database_id を wrangler.jsonc に反映
pnpm wrangler secret put SESSION_SECRET
pnpm db:migrate:remote
pnpm seed:remote
pnpm deploy
```

## ディレクトリ

```
src/
├── routes/          # ファイルベースルート（/login, /teacher/*, /student/*）
├── components/
│   ├── ui/          # shadcn/ui
│   └── app-shell.tsx
├── server/
│   ├── schema.ts    # drizzle テーブル定義
│   ├── db.ts        # D1 クライアント
│   ├── auth.ts      # セッション
│   ├── password.ts  # PBKDF2
│   └── fns/         # Server Functions
└── lib/
    └── achievement.ts
drizzle/             # マイグレーション SQL
scripts/
├── seed.mjs         # 教員アカウント作成
└── e2e.mjs          # E2E スモークテスト
```
