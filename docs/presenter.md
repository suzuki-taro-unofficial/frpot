# presenter

coreからの出力を出力UI用のデータ形式に加工する。

## 入力

- c_status
- c_keepWarmMode
- c_temperature
- c_waterLevel
- c_timer
- c_lock

## 出力

- c_isLitBoilingLamp: c_statusがBoilのときに点灯するランプ用
- c_isLitWarmingLamp: c_statusがKeepWarmのときに点灯するランプ用
- c_isLitWarmHighLamp: c_keepWarmModeがHighのときに点灯するランプ用
- c_isLitWarmEconomyLamp: c_keepWarmModeがEconomyのときに点灯するランプ用
- c_isLitWarmMilkLamp: c_keepWarmModeがMilkのときに点灯するランプ用
- c_temperatureLCD: 温度表示用
- c_waterLevelMeter: メーターの表示用
- c_timerLCD: タイマーの残り時間表示用
- c_isLitLockLamp: ロック状態のときに点灯するランプ用