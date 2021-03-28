#!/usr/bin/env node

import fs from "fs";
import type {KuromojiToken} from "kuromojin";

import Pcfg = require("./pcfg");
import Rule = require("./rule");
import RuleTree = require("./rule_tree_node");

const rules:Rule[] = [
  "S>名詞句 形容詞 0.5",
  "S>名詞句 名詞 0.3",
  "S>名詞句 動詞 0.2",
  "名詞>形容詞 名詞 1",
  "名詞句>名詞 助詞 1",
  "形容詞>名詞 助詞 0.1",
  "形容詞>名詞 動詞 0.2",
  "形容詞>副詞 形容詞 0.4",
  "形容詞>副詞 形容詞 0.3",
  "動詞>副詞 動詞句 0.5",
  "動詞>名詞 助動詞 0.5"
].map((expr)=>Rule.fromString(expr));

const main = async() => {
  const text = fs.readFileSync(0, "utf-8");
  console.log("text=" + text);
  rules.forEach((v)=>console.log(v.toString(), v.probability));

  const parseResults = await Pcfg.parse(text, rules);

  console.log("### result ###");

  parseResults.forEach((parseResult) => {
    const N = parseResult.nodeTree.length;

    if (N === 0) {
      return ;
    }

    display(parseResult.nodeTree, parseResult.tokens, 0, N - 1, "S");
    parseResult.newRules.forEach((v)=>console.log(v.toString(), v.probability));
  });
};

function display(tree:RuleTree.Node[][], tokens:KuromojiToken[], x:number, y:number, pos:string, depth = 0, leafCount = 0) {
  var top = tree[x][y];
  if (top === undefined) return leafCount;
  var result = "";
  var rule:Rule = top.rules[pos].sort((a, b)=> a.probability < b.probability ? -1 : 1)[0];
  if (rule.result1 == "END") {
    result = "--->" + tokens[leafCount].surface_form;
    leafCount++;
  }
  else {
    result = "(" + rule.probability.toString() + ")";
  }

  console.log(new Array(depth * 4).join(" "), rule.source, result);
  if (rule.result1 !== "END") {
    leafCount = display(tree, tokens, top.left[rule.toString()].x, top.left[rule.toString()].y, rule.result1, depth + 1, leafCount);
  }
  if (rule.result2 !== "END") {
    leafCount = display(tree, tokens, top.right[rule.toString()].x, top.right[rule.toString()].y, rule.result2, depth + 1, leafCount);
  }
  return leafCount;
}

main();
