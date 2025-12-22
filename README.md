## Game: 
<img width="476" alt="image" src="https://github.com/user-attachments/assets/e002bb0c-76db-4208-8856-ed252bc2d538" />


## 利用方法

`akashic-template` を利用するには Node.js が必要です。

初回のみ、以下のコマンドを実行して、ビルドに必要なパッケージをインストールしてください。
この作業は `akashic-template` を新しく生成するごとに必要です。

```sh
npm install
```

### ビルド方法

`akashic-template` は TypeScript で書かれているため、以下のコマンドで JavaScript ファイルに変換する必要があります。

```sh
npm run build
```

`src` ディレクトリ以下の TypeScript ファイルがコンパイルされ、`script` ディレクトリ以下に JavaScript ファイルが生成されます。

`watch` を行う事で、ファイルの変更を見て自動更新をすることもできます。

```sh
npm run watch
```

画像やサウンド等の更新をする場合、 `image` や `audio` のフォルダのファイルを更新した後、以下のコマンドを実行してください。

```sh
npm run update
```

### 動作確認方法

以下を実行後、ブラウザで `http://localhost:3000/game/` にアクセスすることでゲームを実行できます。

- `npm start`

マルチプレーのゲームを制作する場合、以下のコマンドでサーバを起動する事ができます。起動後、ブラウザで `http://localhost:3300` にアクセスすると、ゲームを実行できます。

- `npm run akashic serve`

テストを書く事もできます。 `spec` フォルダに記述したテストは、以下のコマンドで実行してください。

- `npm test`

### ポリシー等

1. Sceneに集約
	- `GameScene` に全部のロジックを書いてもいいです。特に制限はありません
	- 複数Sceneを作る場合、 `BaseScene` から派生して作る事を一応推奨しています
2. Scene以外の作りについて
	- サンプルとして以下を入れています
		- 挙動をつかさどる: `behaviors` フォルダ
		- 見た目をつかさどる: `entities` フォルダ
		- 汎用的なハンドリングをつかさどる: `handlers` フォルダ
		- それらをまとめた部品を提供する: `components` フォルダ
		- 型をつかさどる: `types.ts`
		- その他の便利関数を提供する: `utils.ts`
	- 特に気にしないでもいいですし、自分なりの作り方にしてもいいですし、参考にしてもいいです
3. 各ポリシーなど
	- `eslint` は使いません
		- `prettier` でフォーマットする機能だけ提供します
		- `prettier` のデフォルトのルールが気に入らなければ、自分の `.editorconfig` を上書きしてください
		- `eslint` は特にTypeScriptを絡ませる場合ルールが複雑になり保守性が落ちるので、入れたい人は自分で入れてください
	- `webpack` は使います
		- 大抵のscriptはglobalに読まれる点、サブフォルダを切るとAssetのidが衝突しやすい点などから、 `webpack` は入れてあります
	- 極力自動ビルドはしていません
		- `prestart` での `npm run build` 等はしていません。基本的に開発時は `npm run watch` を使う想定にしてます
4. その他補足事項
	- デフォルトのゲームスペックは 480x480x30fps にしてます
		- スーパーファミコン～DSくらいの想定です
		- 好きに変更してください
	- Akashic Engine v3を対象にしています

## LICENSE

[MIT License](./LICENSE)
