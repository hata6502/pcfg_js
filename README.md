# PCFG

PCFGのTypeScript実装 powered by kuromoji.js

## 使い方

### CLI

```bash
npm install -g pcfg
```

```bash
$ echo -n "隣の客はよく柿食う客だ" | pcfg
text=隣の客はよく柿食う客だ
S>名詞句 形容詞 0.5
S>名詞句 名詞 0.3
S>名詞句 動詞 0.2
名詞>形容詞 名詞 1
名詞句>名詞 助詞 1
形容詞>名詞 助詞 0.1
形容詞>名詞 動詞 0.2
形容詞>副詞 形容詞 0.4
形容詞>副詞 形容詞 0.3
動詞>副詞 動詞句 0.5
動詞>名詞 助動詞 0.5
隣 名詞
の 助詞
客 名詞
は 助詞
よく 副詞
柿 名詞
食う 動詞
客 名詞
だ 助動詞
### result ###
 S (0.5999999999999994)
    名詞句 (1)
        名詞 (1)
            形容詞 (0.175)
                名詞 --->隣
                助詞 --->の
            名詞 --->客
        助詞 --->は
    動詞 (0.7499999999999999)
        名詞 (1)
            形容詞 (0.275)
                副詞 --->よく
                形容詞 (0.225)
                    名詞 --->柿
                    動詞 --->食う
            名詞 --->客
        助動詞 --->だ
S>名詞句 形容詞 0.2500000000000003
S>名詞句 名詞 0.15000000000000024
S>名詞句 動詞 0.5999999999999994
名詞>形容詞 名詞 1
名詞句>名詞 助詞 1
形容詞>名詞 助詞 0.175
形容詞>名詞 動詞 0.225
形容詞>副詞 形容詞 0.325
形容詞>副詞 形容詞 0.275
動詞>副詞 動詞句 0.2500000000000001
動詞>名詞 助動詞 0.7499999999999999
```

### API

```bash
npm install pcfg
```

参照：[src/index.ts](https://github.com/hata6502/pcfg_js/blob/master/src/ts/index.ts)

## License

MIT

## Disclaimer

The following creations are included in this product:

- [lacolaco/pcfg_js](https://github.com/lacolaco/pcfg_js#license)
