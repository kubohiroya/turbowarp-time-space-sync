# 段階1: 配置2契約

追跡: https://github.com/kubohiroya/turbowarp-time-space-sync/issues/20 。共通親はextension-data-editor #18。

`./editor-schema`はplacementSchemaBundles.reference/observation、各validatePlacement*Input、所有parse関数、decodePlacementSourceを公開する。JSONのsource/raw dataを保持し、登録済みcamera/referenceやcontroller状態を入力条件へ含めない。

正本はsrc/contracts/placement.tsのreferenceDefinitionSpec/placementObservationSpec。JSONはSpec→spec.ts/toJsonSchema→index.ts/publishedContracts→scripts/generate-schemas.tsの生成物として分類し、JSONを手修正しない。生成helperはgenerationSources、実際に使うJSONはgenerated-schemaとしてbundleへ収める。

構造は生成Schema、意味検証は既存parseReferenceDefinition/parsePlacementObservationを使う。点ID重複、nominal寸法の不確実性、画像外の観測点等をowner側で拒否する。検証は正規化/再直列化・registry変更を行わない。

確認: 型検査、既存Schemaと新adapterの8テスト、既存Vite/runtime＋独立emit、srcなしDOM/Reactなしisolated import/skipLibCheck:false型検査が成功。全5公開JSONをtitle/$schema/$idまで含めた全文生成比較で確認し、既存--checkの読取経路も実行。前後5 hash一致を記録した。sandbox内のViteポート起動失敗は、sandbox外の同じ--checkで解消した。

段階2のフォーム登録/owner encode/binding、後段のJSON内部候補UIは未実装。既定OFFのGUIフラグは保持。新入口の利用停止/本Issueのcommit revertでrollbackし、保存済みデータの移行は不要。
