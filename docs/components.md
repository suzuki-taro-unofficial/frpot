# Components

## ViewItem

UI要素が実装するべきインターフェース。

UI同士を組み合わせるためのメソッドなどを有する。

## コンポーネント群

以下はDOM要素とFRPを組み合わせたラッパー。

- Button
  - stringでラベルを受け取り、以下をフィールドに持つ
  - s_clicked: クリックされた瞬間に発火するストリーム
  - c_isPushing: 押されている状態のときにtrue、そうでないときはfalseを持つセル
- Meter
  - Cell<0 | 1 | 2 | 3 | 4>を受け取り、四分位のメーターを表示する
- Lamp
  - Cell<boolean>を受け取り、ランプを点灯消灯する
  - true -> 点灯
  - false -> 消灯
- Display
  - Cell<string>を受け取り、表示する

以下は純粋なDOM要素のラッパー、FRPは含まれていない

- HStack
  - 要素を横方向に並べる
- VStack
  - 要素を縦方向に並べる
