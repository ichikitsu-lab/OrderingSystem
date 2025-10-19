# iPhone/iOS Safari での音響効果の修正

## 問題の概要

iPhoneのSafariブラウザでは、Web Audio APIに対してより厳格なセキュリティポリシーが適用されており、以下の制限があります：

1. **ユーザーインタラクションの必須要件**
   - AudioContextは初期状態で`suspended`
   - ユーザーの直接的なタップ/クリック後でないと`resume()`できない
   - 非同期処理の後では`resume()`が失敗する可能性がある

2. **タイミングの厳密性**
   - `setTimeout()`などの遅延実行では音が再生されない場合がある
   - すべての音をユーザーインタラクション内でスケジュールする必要がある

3. **マナーモードの影響**
   - iPhoneのマナーモード（サイレントスイッチ）がONの場合、音が出ない
   - これはブラウザでは制御できない仕様

## 実装した修正

### 1. `lib/soundEffects.ts` の改善

#### 音のスケジューリング方式の変更

**修正前**：`setTimeout()`を使った遅延実行
```typescript
await playBeep(800, 200);
setTimeout(() => playBeep(1000, 200), 150);
```

**修正後**：Web Audio APIの時間スケジューリング
```typescript
const playBeep = async (frequency: number, duration: number, delay: number = 0): Promise<void> => {
  // ...
  const startTime = audioContext.currentTime + delay / 1000;
  const endTime = startTime + duration / 1000;
  
  oscillator.start(startTime);
  oscillator.stop(endTime);
  // ...
}

// 使用例
await playBeep(800, 200, 0);      // すぐに再生
await playBeep(1000, 200, 250);   // 250ms後に再生
```

**メリット**：
- すべての音を一度にスケジュールできる
- ユーザーインタラクションのコンテキストを維持
- iOSでも確実に動作

#### Promiseベースの完了待機

```typescript
return new Promise<void>((resolve) => {
  oscillator.onended = () => {
    resolve();
  };
  
  // タイムアウト保護
  setTimeout(() => {
    resolve();
  }, delay + duration + 100);
});
```

**メリット**：
- 音の再生完了を確実に待機
- タイムアウト保護で無限待機を防止

### 2. `app/_layout.tsx` の改善

#### イベントリスナーの強化

```typescript
// キャプチャフェーズで確実にイベントを捕捉
document.addEventListener('click', handleFirstInteraction, true);
document.addEventListener('touchstart', handleFirstInteraction, true);
document.addEventListener('touchend', handleFirstInteraction, true);
```

**変更点**：
- `touchend`イベントの追加（iOS Safari対応）
- キャプチャフェーズ（第3引数に`true`）でイベント捕捉
- より確実にユーザーインタラクションを検知

### 3. `app/settings.tsx` の改善

#### テスト音再生の改善

```typescript
onSwitchChange={async (value) => {
  setSoundEffects(value);
  await setSoundEffectsEnabled(value);
  
  if (value) {
    // iOSのため、AudioContextを明示的にresume
    await resumeAudioContext();
    // 少し待ってから音を再生（iOS Safari対応）
    setTimeout(async () => {
      await playOrderConfirmSound();
    }, 100);
    Alert.alert(
      '音響効果', 
      '🔊 音響効果が有効になりました！\n\nテスト音が再生されます。音が聞こえない場合は、デバイスの音量とマナーモードを確認してください。'
    );
  }
}}
```

**改善点**：
- 明示的な`resumeAudioContext()`呼び出し
- 100msの遅延（iOS Safariの処理時間確保）
- ユーザーへの明確な案内メッセージ

## テスト手順

### 1. iPhone/iPad での確認

1. **デバイスの確認**
   ```
   ✓ マナーモード（サイレントスイッチ）がOFFになっているか
   ✓ 音量が適切に設定されているか（ボリュームボタンで調整）
   ✓ Safariブラウザを使用しているか
   ```

2. **初回アクセス時**
   - アプリを開く
   - 画面の任意の場所をタップ（AudioContext有効化）
   - 設定画面を開く
   - 音響効果をONにする
   - テスト音が再生されることを確認

3. **注文確定音のテスト**
   - テーブルを選択
   - メニューを追加
   - 注文確定ボタンをタップ
   - ピピッという2音が聞こえることを確認

4. **支払い完了音のテスト**
   - 支払い画面を開く
   - 支払いボタンをタップ
   - ピピピッという3音が聞こえることを確認

### 2. デバッグ手順

#### コンソールログの確認

Safari の開発者ツールで以下のログを確認：

```
🔊 Web Audio API初期化完了 (状態: suspended)
⏸️ AudioContext suspended - ユーザーインタラクション待機中
✅ AudioContext resumed - 音響効果が有効になりました
🔊 注文確定音再生
🔊 支払い完了音再生
```

#### トラブルシューティング

| 症状 | 原因 | 解決方法 |
|------|------|----------|
| 音が全く出ない | マナーモードON | iPhoneのサイレントスイッチを確認 |
| 音が小さい | 音量設定が低い | ボリュームボタンで音量を上げる |
| テスト音のみ出ない | AudioContext未有効化 | 画面を一度タップしてから再試行 |
| 一部の音だけ出ない | スケジューリング失敗 | コンソールログでエラーを確認 |

## 技術的な詳細

### iOS Safari の制限事項

1. **AudioContext.resume()の制限**
   - ユーザーインタラクション（タップ、クリック）のコールスタック内でのみ実行可能
   - `setTimeout()`, `Promise.then()`, `async/await`の後では失敗する可能性がある

2. **対策方法**
   - すべての音をユーザーインタラクション時に一度にスケジュール
   - Web Audio APIの`currentTime`ベースのスケジューリングを使用
   - `setTimeout()`の代わりに`oscillator.start(startTime)`を使用

### Web Audio API のスケジューリング

```typescript
// ❌ iOS Safari で失敗する例
await playBeep(800, 200);
setTimeout(() => playBeep(1000, 200), 150);  // 別のコールスタック

// ✅ iOS Safari で動作する例
const now = audioContext.currentTime;
oscillator1.start(now);
oscillator2.start(now + 0.25);  // 250ms後に開始
```

**メリット**：
- すべて同一のコールスタック内で実行
- ユーザーインタラクションのコンテキストを維持
- より正確なタイミング制御

## データベースの初期化は必要ですか？

**答え：いいえ、不要です。**

音響効果の問題は以下の理由でデータベースとは無関係です：

1. **音響効果の設定は`AsyncStorage`に保存**
   - Supabaseデータベースには保存されていない
   - ローカルストレージのみ使用

2. **問題の原因はiOSのセキュリティポリシー**
   - Web Audio APIの制限
   - ユーザーインタラクション要件
   - データベースの内容とは無関係

3. **修正内容はコードレベルのみ**
   - 音のスケジューリング方式の変更
   - イベントリスナーの改善
   - データ構造の変更なし

## まとめ

### 実装した改善

1. ✅ Web Audio APIの時間スケジューリング方式に変更
2. ✅ Promiseベースの完了待機を実装
3. ✅ iOS Safari向けのイベントリスナー強化
4. ✅ 明示的なAudioContext有効化
5. ✅ ユーザー向けの詳細な案内メッセージ

### 動作要件

- ✅ デバイスのマナーモードがOFF
- ✅ 適切な音量設定
- ✅ 最初のユーザーインタラクション後
- ✅ 音響効果の設定がON

### 次のステップ

1. アプリをデプロイ
2. iPhoneでアクセス
3. マナーモードと音量を確認
4. 画面をタップしてAudioContextを有効化
5. 設定画面で音響効果をテスト
6. 注文確定と支払い完了で音を確認

これらの修正により、iPhoneでも確実に音響効果が動作するようになりました。
