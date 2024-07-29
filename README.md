# frpot

## 命名規則

- 変数名はローワーキャメルケース
- セルは頭に`c_`を付ける
  - ループのときは`cloop_`
  - シンクのときは`csink_`
  - 要素としてセルを入れるときは`cc_`
    - ループやストリームのときは`c`を適切なものに変える
  - 要素としてストリームを入れるときは`cs_`
    - ループやストリームのときは`s`を適切なものに変える
- ストリームは頭に`s_`を付ける
  - ループのときは`sloop_`
  - シンクのときは`ssink_`