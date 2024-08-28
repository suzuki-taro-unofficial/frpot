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
