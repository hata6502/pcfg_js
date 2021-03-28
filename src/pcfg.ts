/**
 * Created by laco on 14/12/26.
 */

import toWideSign from 'jaco/fn/toWideSign';
import {tokenize} from "kuromojin";
import type {KuromojiToken} from "kuromojin";
import {PCFGError} from "./pcfg_error";

import Rule = require("./rule");
import PcfgNode = require("./pcfg_node")
import RuleTree = require("./rule_tree_node")

interface ParseResult {
  nodeTree:RuleTree.Node[][];
  tokens:KuromojiToken[];
  newRules:Rule[];
}

class Pcfg {

  private rules:Rule[];
  private nodeMap:PcfgNode[][];
  private ruleTreeMap:RuleTree.Node[][];

  static parse(text:string, rules:Rule[]):Promise<ParseResult[]> {
    return new Promise((resolve) => {
      var fn = function (tokens:KuromojiToken[]) {
        const splittedTokensList = Pcfg.splitTokens(tokens);

        const parseResults = splittedTokensList.map((splittedTokens) => {
          const parser = new Pcfg({rules});
          const parsed = parser.calc(splittedTokens);

          if (!parsed) {
            throw new PCFGError("Cannot parse");
          }

          parser.recalcProbability(splittedTokens, parser.nodeMap);

          return {
            nodeTree: parser.ruleTreeMap,
            tokens: splittedTokens,
            newRules: parser.rules
          };
        });

        resolve(parseResults);
      };

      const normalizedText = Pcfg.normalize(text);

      Pcfg.tokenize(normalizedText, fn);
    });
  }

  private static normalize(text:string) {
    return toWideSign(text);
  }

  private static tokenize(text:string, callback:(tokens:KuromojiToken[])=>void):void {
    tokenize(text).then((parsed) => {
      parsed.forEach((token, i)=> {
        console.log(token.surface_form + " " + Pcfg.getJoinedPos(token));
      });
      //parsed.unshift(<Token>{
      //  pos: "BOS"
      //});
      //parsed.push(<Token>{
      //  pos: "EOS"
      //});
      callback(parsed);  
    });
  }

  private static splitTokens(tokens:KuromojiToken[]) {
    const splittedTokensList: KuromojiToken[][] = [];

    let currentTokens: KuromojiToken[] = [];

    tokens.forEach((token) => {
      if (token.pos === '記号') {
        splittedTokensList.push(currentTokens);
        currentTokens = [];

        return ;
      }

      currentTokens.push(token);
    });

    splittedTokensList.push(currentTokens);

    return splittedTokensList;
  }

  private static getJoinedPos(token:KuromojiToken):string {
    return token.pos;
    //return [token.pos, token.pos_detail_1, token.pos_detail_2, token.pos_detail_3].join(",");
  }

  constructor({rules}: {rules:Rule[]}) {
    this.rules = [...rules];
    this.nodeMap = [];
    this.ruleTreeMap = [];
  }

  private calc(tokens:KuromojiToken[]):boolean {
    const N = tokens.length;

    if (N === 0) {
      return true;
    }

    this.nodeMap = new Array(N).map((v)=>new Array(N));
    this.ruleTreeMap = new Array(N).map((v)=>new Array(N));
    //内側初期化
    for (var i = 0; i < N; i++) {
      this.nodeMap[i] = [];
      this.ruleTreeMap[i] = [];
      var pos = Pcfg.getJoinedPos(tokens[i]);
      this.nodeMap[i][i] = new PcfgNode();
      this.nodeMap[i][i].inside[pos] = 1.0;
      this.ruleTreeMap[i][i] = new RuleTree.Node();
      this.ruleTreeMap[i][i].rules[pos] = [Rule.endRule(pos)];
    }
    //ボトムアップ
    for (var n = 1; n < 1 + N - 1; n++) {
      for (var i = 0; i < N - n; i++) {
        var x = i;
        var y = i + n;
        for (var j = 1; j < 1 + n; j++) {
          for (var ruleIndex = 0; ruleIndex < this.rules.length; ruleIndex++) {
            var rule:Rule = this.rules[ruleIndex];
            //CYK
            var left = this.nodeMap[x][x + (j - 1)].inside[rule.result1];
            if (!left) {
              left = 0;
            }
            var bottom = this.nodeMap[x + j][y].inside[rule.result2];
            if (!bottom) {
              bottom = 0;
            }
            if (!this.nodeMap[x][y]) {
              this.nodeMap[x][y] = new PcfgNode();
            }
            var old = this.nodeMap[x][y].inside[rule.source];
            if (!old) {
              old = 0;
            }
            this.nodeMap[x][y].inside[rule.source] = old + rule.probability * left * bottom;

            if (rule.probability * left * bottom > 0) {
              //最尤推定用
              if (!this.ruleTreeMap[x][y]) {
                this.ruleTreeMap[x][y] = new RuleTree.Node();
              }
              if (!this.ruleTreeMap[x][y].rules[rule.source]) {
                this.ruleTreeMap[x][y].rules[rule.source] = <Rule[]>[rule];
              }
              else {
                this.ruleTreeMap[x][y].rules[rule.source].push(rule);
              }
              this.ruleTreeMap[x][y].left[rule.toString()] = {x: x, y: x + (j - 1)};
              this.ruleTreeMap[x][y].right[rule.toString()] = {x: x + j, y: y};
            }
          }
        }
      }
    }
    //非受理判定
    if (!this.nodeMap[0][N - 1] || this.nodeMap[0][N - 1].inside["S"] == 0) {
      return false;
    }
    //外側初期化
    for (var i = 0; i < N; i++) {
      for (var n = 0; n < N - i; n++) {
        for (var source in Pcfg.toUniqueArray(this.rules.map((x) => x.source))) {
          if (this.nodeMap[i][i + n].inside[source] == 0) {
            this.nodeMap[i][i + n].outside[source] = 0;
          }
        }
      }
    }
    //頂点定義
    this.nodeMap[0][N - 1].outside["S"] = 1;
    //トップダウン
    for (var n = N - 1; n >= 0; n--) {
      for (var i = 0; i < N - n; i++) {
        var x = i;
        var y = i + n;
        for (var ruleIndex = 0; ruleIndex < this.rules.length; ruleIndex++) {
          var rule = this.rules[ruleIndex];
          if (this.nodeMap[x][y].outside[rule.source] > 0) {
            for (var k = 1; k < 1 + n; k++) {
              //下側
              if (this.nodeMap[x + k][y].inside[rule.result2] > 0) {
                this.nodeMap[x + k][y].outside[rule.result2] =
                  this.nodeMap[x + k][y].inside[rule.result2] +
                  (rule.probability *
                  this.nodeMap[x][y].outside[rule.source] *
                  this.nodeMap[x][x - (1 - k)].inside[rule.result1]);
              }
              //左側
              if (this.nodeMap[x][y - k].inside[rule.result1] > 0) {
                this.nodeMap[x][y - k].outside[rule.result1] =
                  this.nodeMap[x][y - k].outside[rule.result1] +
                  (rule.probability *
                  this.nodeMap[x][y].outside[rule.source] *
                  this.nodeMap[y + (1 - k)][y].inside[rule.result2]);
              }
            }
          }
        }
      }
    }
    return true;
  }

  private recalcProbability(tokens:KuromojiToken[], nodeMap:PcfgNode[][]) {
    for (var i = 0; i < this.rules.length; i++) {
      var rule = this.rules[i];
      var newP = Pcfg.usedCount(tokens.length, rule, nodeMap) /
        this.rules.filter((x) => x.source === rule.source).reduce((pv, x) => pv + Pcfg.usedCount(tokens.length, x, nodeMap), 0);
      rule.probability = (rule.probability + newP) / 2;
    }
  }

  private static usedCount(N:number, rule:Rule, nodeMap:PcfgNode[][]):number {
    var count = 0;
    for (var n = 1; n < 1 + N - 1; n++) {
      for (var i = 0; i < N - n; i++) {
        var x = i;
        var y = i + n;
        for (var j = 1; j < n + 1; j++) {
          var source = nodeMap[x][y].outside[rule.source];
          if (!source) {
            source = 0;
          }
          var result1 = nodeMap[x][x + j - 1].inside[rule.result1];
          if (!result1) {
            result1 = 0;
          }
          var result2 = nodeMap[x + j][y].inside[rule.result2];
          if (!result2) {
            result2 = 0;
          }
          count += source * result1 * result2 > 0 ? 1 : 0;
        }
      }
    }
    return count <= 0 ? 0.000000000000001 : count;
  }

  private static toUniqueArray(array:Array<any>) {
    var a = [];
    for (var i = 0, l = array.length; i < l; i++)
      if (a.indexOf(array[i]) === -1)
        a.push(array[i]);
    return a;
  }
}

export = Pcfg;
export type {ParseResult};
