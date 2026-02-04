# MY5 — Share Your Top 5

あなたを定義する5つのお気に入りをキュレーションして共有するWebアプリ。

## 技術スタック

- **Next.js 14** (App Router)
- **Supabase** (Auth + Postgres + RLS)
- **Vercel** (デプロイ)

---

## セットアップ手順

### 1. Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. **SQL Editor** で `supabase/schema.sql` の内容を実行
3. **Authentication → Providers → Google** を有効化:
   - [Google Cloud Console](https://console.cloud.google.com/) で OAuth 2.0 クライアントIDを作成
   - Authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
   - Client ID と Client Secret を Supabase に設定
4. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`（開発時）
   - Redirect URLs に追加: `http://localhost:3000/auth/callback`

### 2. ローカル開発

```bash
# 依存関係インストール
npm install

# 環境変数をセット
cp .env.local.example .env.local
# .env.local を編集して Supabase の URL と anon key を設定

# 開発サーバー起動
npm run dev
```

`http://localhost:3000` でアクセス。

### 3. Vercel デプロイ

1. GitHubリポジトリにpush
2. [vercel.com](https://vercel.com) でリポジトリをインポート
3. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` → `https://your-app.vercel.app`
4. デプロイ後、Supabase 側も更新:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs** に追加: `https://your-app.vercel.app/auth/callback`
   - Google OAuth の redirect URI にも追加

---

## 動作確認チェックリスト

- [ ] `/login` → Googleログインボタンが表示される
- [ ] Googleログイン → ハンドル設定画面が表示される
- [ ] ハンドル設定 → `/me` ダッシュボードに遷移
- [ ] 5枠それぞれに「+ タップして追加」が表示される
- [ ] お気に入りを追加 → カテゴリー・タイトル・ノートが保存される
- [ ] 編集・削除・入れ替え(↑)が動作する
- [ ] 公開/非公開トグルが動作する
- [ ] URLコピーボタンでクリップボードにコピーされる
- [ ] `/u/[handle]` → 公開プロフィールが表示される
- [ ] 非公開設定時 → 🔒 非公開メッセージが表示される
- [ ] ログアウト → `/login` に戻る

---

## ページ構成

| パス | 説明 |
|------|------|
| `/login` | Googleログイン |
| `/me` | ダッシュボード（要認証） |
| `/u/[handle]` | 公開プロフィール（SSR） |
| `/auth/callback` | OAuth コールバック |
