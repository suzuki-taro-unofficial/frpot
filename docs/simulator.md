# simulator

ポットの動作を管理する。

## 入力

- `c_waterIn`
- `c_tick`
- `c_heaterPower`
- `c_hotWaterSupply`
- `s_lid`

## 出力

各ストリームはティックごとに発火する。

- `s_temperatureSensor` 現在の水温。
- `s_waterLevelSensor` 現在のポット内の水量。4段階で表される。
- `s_waterOverflowSensor` ポットから水が溢れているかどうか。
- `s_lidStateSensor` 蓋が開いているか閉じているか。

## 動作

内部的に

- 水量
- 水温
- 蓋の状態

を管理する。各ティックごとに以下の動作をする。

1. `c_waterIn`が`true`かつ蓋が開いているなら水を入れる。
2. `c_hotWaterSupply`が`true`なら水を排出する。
3. 外部からヒーターの熱量を受け取り、水温を上昇させる。
4. 水量に応じて各種センサを動作させる。
