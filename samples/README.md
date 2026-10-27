# 最小デモ: optical-pattern-observation

[Editor](https://turbowarp.org/editor?project_url=https%3A%2F%2Fkubohiroya.github.io%2Fturbowarp-time-space-sync%2Fsamples%2Foptical-pattern-observation.sb3) · [SB3](https://kubohiroya.github.io/turbowarp-time-space-sync/samples/optical-pattern-observation.sb3)

表示側でDisplayをクリックし、画面を見る全員が点滅に同意した場合だけSHOWを入力するとパターンを表示します。それ以外の入力はキャンセルです。撮影側は別端末で同じSB3を開きDecodeを明示クリックし、表示側の画面をカメラで撮影します。観測数とdecoderの状態を表示し、Sで表示と撮影を停止、Escapeでも表示を隠せます。

要件: 表示側と撮影側の2端末・カメラ・実際の画面リフレッシュ周期 / Camera Source関連拡張をID/SHA/license付き同梱 / 点滅開始前に利用者自身がSHOWを入力。既定OFFフラグは本体変更なし。

未検証: 実画面点滅とカメラ観測・時刻対応精度 / 実機camera decoder校正と観測率。自動検証は初期状態と表示同意のcancelのみ。 表示周期16667usは60Hzの開始値でありStageコードで実際の表示周期へ合わせます。minimum calibration secondsを使用します。サンプルだけopticalTimeSyncV1=true/placementSolveV1=falseをconstructor時に適用してglobalを復元し、本体の既定OFFを維持します。

## 編集・生成・公開

`optical-pattern-observation/project.json`とSVGを編集しNode.js 26で生成します。

```sh
node scripts/build-samples.mjs
node scripts/build-samples.mjs --check
node --test scripts/verify-samples.mjs
node scripts/prepare-pages.mjs
```

unsandboxed用JSはSB3へ同梱し、Editorの通常の許可画面を使います。依存がある場合は全ID/URLを記録し、同梱JSはlicense/revision/SHA256を保持します。自動確認は音声・実機・点滅を開始せず初期状態/安全なcancel分岐だけを検証します。未検証を成功と表現しません。

切戻し: サンプル・README・Pages追加をrevert。本体と既定フラグは変更しません。
