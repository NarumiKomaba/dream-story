# Dream Story

夢を語り、分析し、物語に変換し、ブロックチェーンに永久保存するアプリ。

**Live Demo**: https://dream-story-roan.vercel.app

## 機能

- **夢語りチャット** - AIと会話しながら夢の内容を引き出す
- **夢分析** - 感情分析（ストレス・不安・喜び）と健康スコアを算出
- **物語生成** - 複数の夢を素材に、AIが実験的な短編小説を創作。フィードバックで物語を磨ける
- **ブロックチェーン記録** - 夢と物語をSymbol Testnetに永久保存。物語には元の夢のtxHashを埋め込み、来歴（プロヴェナンス）を証明

## 技術スタック

- **フロントエンド**: Next.js 16 / React 19 / TypeScript / Tailwind CSS 4
- **AI**: Google Gemini 2.5 Flash
- **ブロックチェーン**: Symbol Testnet
- **バリデーション**: Zod
- **デプロイ**: Vercel

## セットアップ

### 前提条件

- Node.js 18+
- npm

### インストール

```bash
git clone https://github.com/NarumiKomaba/dream-story.git
cd dream-story
npm install
```

### 環境変数

`.env.local` を作成して以下を設定:

```
GEMINI_API_KEY=your_gemini_api_key
SYMBOL_PRIVATE_KEY=your_symbol_testnet_private_key
SYMBOL_NODE_URL=https://sym-test-01.opening-line.jp:3001
```

### 起動

```bash
npm run dev
```

http://localhost:3000 をブラウザで開く。

## アーキテクチャ

### システム構成図

```mermaid
flowchart TB
    subgraph Client["ブラウザ"]
        UI["React UI"]
        LS["localStorage\n(夢データ保持)"]
    end

    subgraph Server["Vercel Serverless"]
        SA["Server Actions"]
        AI["Gemini 2.5 Flash"]
        SYM["Symbol SDK"]
    end

    BC[("Symbol Testnet\nブロックチェーン")]

    UI -- "夢を語る / フィードバック" --> SA
    SA -- "分析 / 物語生成 / 改変" --> AI
    AI -- "JSON結果" --> SA
    SA -- "トランザクション送信" --> SYM
    SYM -- "永久保存" --> BC
    SA -- "分析結果 / 物語 / txHash" --> UI
    UI -- "夢を保存" --> LS
    LS -- "夢を読み込み" --> UI
```

### ユーザーフロー

```mermaid
flowchart LR
    A["夢を語る"] --> B["AI分析\n感情・健康スコア"]
    B --> C["ブロックチェーン\nに記録"]
    C --> D["複数の夢を\n選択"]
    D --> E["AI物語生成"]
    E --> F["フィードバック\nで改変"]
    F --> E
    F --> G["物語を\n永久保存"]

    style A fill:#4a9eff,color:#fff
    style B fill:#f59e0b,color:#fff
    style C fill:#10b981,color:#fff
    style E fill:#f59e0b,color:#fff
    style G fill:#10b981,color:#fff
```

### ディレクトリ構成

```
src/
  app/
    page.tsx          # 夢語りチャット（メインページ）
    story/page.tsx    # 物語生成ページ
    stories/page.tsx  # 物語一覧ページ
    actions.ts        # Server Actions（AI呼び出し・ブロックチェーン記録）
  services/
    ai.ts             # Gemini AI サービス（分析・物語生成・改変）
    dreamStore.ts     # サーバー側データ永続化
    clientDreamStore.ts # クライアント側localStorage永続化
  types/
    dream.ts          # 型定義・Zodスキーマ
  components/
    Header.tsx        # 共通ヘッダー
```

## ライセンス

MIT
