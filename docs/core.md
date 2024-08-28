# core

ポットの制御を行うモジュール

## ネットワーク図

![./core.md]

## 入力

- `s_tick`: `Stream<number>`
  - 経過ミリ秒
- `s_temperatureSensor`: `Stream<number>`
  - 温度センサーの出力(毎ティック)
- `s_waterLevelSensor`: `Stream<WaterLevel>`
  - 水位センサーの出力(毎ティック)
- `s_waterOverflowSensor`: `Stream<boolean>`
  - 水溢れセンサーの出力(毎ティック)
- `s_lidStateSensor`: `Stream<LidState>`
  - 蓋センサーの出力(毎ティック)
- `s_boilButtonClicked`: `Stream<Unit>`
  - 沸騰ボタンが押されると発火
- `s_timerButtonClicked`: `Stream<Unit>`
  - タイマーボタンが押されると発火
- `s_warmingConfigButtonClicked`: `Stream<Unit>`
  - 保温設定ボタンが押されると発火
- `s_lockButtonClicked`: `Stream<Unit>`
  - ロック解除ボタンが押されると発火
- `c_hotWaterSupplyButtonPushing`: `Cell<boolean>`
  - 給湯ボタンが押されているかどうかの状態
  - true 押されている
  - false 押されえていない

## 出力

- `c_heaterPower`: `Cell<number>`
  - ヒーターの出力制御、値はワットを表す
- `c_hotWaterSuply`: `Cell<boolean>`
  - 給油中かどうかを表す
- `c_status`: `Cell<Status>`
  - 沸騰モードか保温モードかを表す
- `c_timer`: `Cell<number>`
  - タイマーの残り時間
- `c_temperature`: `Cell<number>`
  - 水温
- `c_waterLevel`: `Cell<WaterLevel>`
  - 水位
- `c_keepWarmMode`: `Cell<KeepWarmMode>`
  - 保温モード
- `c_lock`: `Cell<boolean>`
  - ロックの状態
- `s_beep`: `Stream<BeepType>`
  - ビープ音を発火するためのストリーム
