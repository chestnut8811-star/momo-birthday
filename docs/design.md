# 設計書: ももちゃんの おたんじょうび

対応する要件定義書: docs/requirements.md

## 技術スタック

| 区分 | 採用 | 理由 |
|------|------|------|
| 言語 / フレームワーク | 素の HTML / CSS / JavaScript（ES Modules） | ビルド不要。依存ゼロで長期に動く |
| 描画 | インライン SVG（ケーキ・雪だるま・城など）＋ Canvas 2D（雪・紙吹雪・霜） | 権利問題のないオリジナル絵。拡大しても綺麗 |
| 音 | Web Audio API でオルゴール音色と効果音を合成 | 音源ファイル不要・オフライン |
| 声 | VOICEVOX（ずんだもん あまあま）で事前生成した m4a を Web Audio で再生（tools/make-voices.py） | 字の読めない4歳児への案内。iOS の音声合成は準備で Safari ごと固まる事例があったため不採用 |
| 息の検出 | getUserMedia ＋ AnalyserNode（音量・低域比・スペクトル平坦度） | 端末内で完結 |
| データ保存 | 設定: localStorage / 写真: IndexedDB（ArrayBuffer で保存） | 端末内のみ。Blob 直保存の iOS 既知不具合を避ける |
| オフライン | Service Worker（アプリ本体のみキャッシュ） | ホーム画面から全画面起動 |
| テスト | Node 標準 `node:test`（純粋ロジック）＋ブラウザ / iOS シミュレータでの起動確認 | 依存ゼロ |

## ディレクトリ構成

```
誕生日/
├── app/                      ← 公開するのはこのフォルダだけ
│   ├── index.html
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── css/app.css
│   ├── icons/                (tools/make-icons.mjs で SVG から生成)
│   ├── voice/                (tools/make-voices.py で VOICEVOX から生成)
│   └── js/
│       ├── main.js           起動・場面切り替え・共通 UI
│       ├── logic/            DOM に依存しない純粋ロジック（Node でテスト）
│       │   ├── config.js     設定の初期値・検証・文言
│       │   ├── blow-score.js 息の特徴量と強さスコア・ロウソクの消え方
│       │   └── layout.js     ロウソク配置・ハート配置・カード寸法
│       ├── art/svg.js        SVG 部品（ケーキ・雪だるま・城・ティアラ・結晶…）
│       ├── art/demo-photos.js サンプル写真（Canvas 描画）
│       ├── fx/snow.js        背景の雪
│       ├── fx/magic.js       タッチのキラキラ・紙吹雪
│       ├── audio/engine.js   オルゴール・効果音・曲
│       ├── audio/voice.js    せりふの再生（voice/*.m4a）
│       ├── audio/mic.js      マイクと息の検出
│       ├── store/settings.js localStorage
│       ├── store/photos.js   IndexedDB・画像縮小
│       └── scenes/           title / cake / memories / finale / settings
├── tests/                    node --test
├── tools/make-icons.sh       アイコン PNG 生成（rsvg-convert）
└── docs/
```

## データモデル

- 設定（localStorage `momo-bday:settings`）: `{ name, age(1-10), message, from, difficulty('easy'|'normal'|'hard'), sound, voice }`。message が空なら名前と年齢から自動生成
- 写真（IndexedDB `momo-bday` v2 / store `photos`, keyPath `id`）: `{ id, data: ArrayBuffer, thumb, type, w, h, caption, order, createdAt }`
- キャラクターの差し替え（同 DB / store `chars`, keyPath `slot`）: `{ slot: main|cheer|friend1|friend2, data: ArrayBuffer(PNG), type, w, h, updatedAt }`。無ければ `app/img/chars/*.webp`（同梱のオリジナル）を使う。取り込み時に白い背景を縁から消し、余白を詰める（`logic/image.js`、Node でテスト）

## 主要な処理フロー

1. タイトル: 「はじめる」→ AudioContext と読み上げのロック解除（iOS はユーザー操作が必要）→ 雪の円形ワイプでケーキへ
2. ケーキ: ロウソクが1本ずつ灯る → 雪だるまが「おうたを うたおう」→（歌う）オルゴールのハッピーバースデー →「ふーって してね」→ マイク開始
   - 毎フレーム: 音量(dBFS)・低域比・平坦度 → 息スコア 0〜1 → 炎の傾き・かざぐるま・雪の風に反映 → 各ロウソクの「体力」を削る
   - 全部消えたらマイク停止（iOS の音量低下を避けるため）→ 暗転 → 紙吹雪とファンファーレ
   - マイク不可: 炎のタッチで消す
3. 思い出: 写真カードが降ってくる → 霜で凍っている → 指でこすると溶ける（4秒触らなければ自動で溶ける）→ ひとこと表示 → 次へ（6秒で自動）
4. フィナーレ: 写真がハート形に集まり、中央にティアラと「おめでとう」、下に手紙。手紙は段落ごとに雪の魔法で浮かび上がり（画面に入った段落から順に）、❄ のある段落で雪の結晶がはじけて手紙が光る。手紙をさわると指先から結晶。横向きでは手紙のカードの中だけスクロールする
5. 設定（右上の⚙を長押し）: 名前・年齢・メッセージ・写真の追加/並べ替え/ひとこと/削除・消えやすさ・マイクテスト・音/声

## 画面 / インターフェース一覧

| 画面 | 役割 | 主役の演出 |
|------|------|------------|
| タイトル | 世界観の入口 | 氷でできた大きな「4」とティアラ、名前の文字がゆれる |
| ケーキ | ロウソク吹き消し | 息に反応する炎・かざぐるま・雪 |
| 思い出 | 写真の演出 | 凍った写真をこすって溶かす |
| フィナーレ | メッセージ | ハート形の写真とメッセージカード |
| 設定 | 保護者用 | — |

## タスク分解

| # | タスク | 依存 | 対象ファイル | 受け入れ条件 |
|---|--------|------|--------------|--------------|
| 1 | 純粋ロジック＋テスト | なし | js/logic/*, tests/* | `node --test tests/` が通る |
| 2 | SVG 部品・CSS デザイン | なし | js/art/svg.js, css/app.css | 各部品が単体で崩れず描ける |
| 3 | 音・声・マイク | #1 | js/audio/* | 合成ノイズで息スコアが上がり、正弦波の和音では上がりにくい |
| 4 | 雪・キラキラ・紙吹雪 | なし | js/fx/* | 60fps 近くで動く |
| 5 | 保存（設定・写真） | #1 | js/store/* | 追加・並べ替え・削除が再読込後も残る |
| 6 | 各場面と起動処理 | #2-5 | index.html, js/main.js, js/scenes/* | 通しで最後まで進める。コンソールエラーなし |
| 7 | PWA・アイコン | #6 | manifest, sw.js, icons, tools/make-icons.sh | ホーム画面追加用の情報がそろう |
| 8 | 統合検証 | #6,#7 | — | ブラウザ（スマホ幅）と iOS シミュレータの Safari で全場面を確認 |

実装は見た目の一貫性を優先してメインセッションで順に行う（並列にしない）。

## 検証方法

- テスト: `node --test tests/`
- 構文: `node --check` を全 JS に実行
- 起動確認: `python3 -m http.server 8765 --directory app` → ブラウザでスマホ幅表示、`?debug` で息のシミュレーション
- iOS: Xcode の iPhone シミュレータの Safari で `http://localhost:8765` を開き、フォント・余白・タッチを確認

## 検討した代替案

- React 等のフレームワーク＋ビルド: 規模に対して過剰。ビルド成果物の管理が増えるため不採用
- 画像素材（PNG）の利用: 権利確認が必要で、解像度にも縛られるため SVG/Canvas で描く
- claude.ai の Artifact として公開: 非公開で置けるが、全画面化・ホーム画面追加・オフライン動作ができないため本番用には GitHub Pages を想定
