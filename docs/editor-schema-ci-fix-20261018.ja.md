# 段階1 CI修正（2026-10-18）

PR #21 の段階1差分に対する検証基盤の修正記録。段階2のUI接続、merge、npm公開は含まない。

## 変更と互換性

- 公開入口の期待値に明示的な `./editor-schema` の型・実装パスと `lib-editor/` 配布を追加した。入口の完全一致を維持し、bare root入口、既存runtimeの公開名、副作用指定は変更しない。
- pack出力をJSONとして読む呼出しには `--foreground-scripts=false` を明示した。既存 `--ignore-scripts` は維持し、JSONの切り出しや検査省略は行わない。npm 10のprepare出力がJSONに混ざる環境でもpack内容を通常どおり検査する。
- 実行コード、Schemaの正本・生成物、fixture、既存データ形式には変更を加えない。既存のCamera Source 0.7.0依存も維持する。

## 検証と受け入れ基準

`corepack pnpm@11.11.0 check` は全成功。typecheck、lint、25ファイル・342テスト、README生成差分なし、Schema/fixture生成一致、build/dist一致、repo policy、pack dry-runを確認した。

通常のNode v26.7.0/npm 11.19.0に加え、CI互換のnpm 10をPATHの先頭に置いた `repo:check` も成功。正確なnpm実体と共通のCI再現手順は統合検証記録に保存する。

- `/tmp/schema-stage1-ci-fix-20261018/time-space-sync-check.log`: 全check成功。
- `/tmp/schema-stage1-ci-fix-20261018/time-space-sync-repo-npm10.log`: npm 10でのpack JSON検査成功。

共通artifactのpin・lock・実解決と生成物の一致は統合検証でも照合する。過去のpublication記録は当時の基準として保持する。

### CIの局所timeout追補

`890b6f7da12f516064d939ca83526d6f4e543073` のCIで、`tests/optical-time-corners.test.ts` の `finds the panel square rather than the corners of its notches` だけが5294msとなり、Vitestの既定5000msでtimeoutした。残る341テストは成功し、当該テストに精度assertionの失敗は報告されていない。

このテストは5視点それぞれについて1280×720のsynthetic画像を生成し、43枚のanalysis frameでpanelを検出するCPU計算である。視点・画像・精度条件を減らさず、該当テストだけに15000msの上限を明示した。共有CI runnerの余裕を確保しつつ有限の上限を維持する。global timeout、本番algorithm、Schema、データ形式は変更しない。

対象19テストと既存 `pnpm check` の342テストを再検証し、すべて成功した。型、lint、README、Schema/fixture生成照合、build/dist一致、repo policy、pack dry-runも成功した。結果は統合検証記録と以下のログへ保存する。

- `/tmp/schema-stage1-ci-fix-20261018/time-space-sync-new-ci-failure.log`: CIでの5000ms timeout。
- `/tmp/schema-stage1-ci-fix-20261018/time-space-sync-timeout-targeted.log`: 対象テストファイル。
- `/tmp/schema-stage1-ci-fix-20261018/time-space-sync-timeout-check.log`: timeout修正後の全check。

## ロールバック

CI修正commitをrevertし、依存artifactを戻す場合はmanifest・lock・実解決を一組で戻して再検証する。runtime APIとデータ形式は変更していないためデータ移行は不要。段階2以降の開始には、修正artifactへの依存整合と既存の開始条件を別途満たす必要がある。
