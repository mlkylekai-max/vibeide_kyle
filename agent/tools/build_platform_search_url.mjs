#!/usr/bin/env node

const [, , platformArg, ...keywordParts] = process.argv;

if (!platformArg || keywordParts.length === 0) {
  console.error('usage: build_platform_search_url.mjs <platform> <keyword...>');
  process.exit(1);
}

const platform = platformArg.toLowerCase();
const keyword = keywordParts.join(' ');
const encoded = encodeURIComponent(keyword);

const urls = new Map([
  ['bilibili', `https://search.bilibili.com/all?keyword=${encoded}`],
  ['b站', `https://search.bilibili.com/all?keyword=${encoded}`],
  ['bilibili.com', `https://search.bilibili.com/all?keyword=${encoded}`],
  ['baidu', `https://www.baidu.com/s?wd=${encoded}`],
  ['baidu.com', `https://www.baidu.com/s?wd=${encoded}`],
  ['google', `https://www.google.com/search?q=${encoded}`],
  ['google.com', `https://www.google.com/search?q=${encoded}`],
  ['youtube', `https://www.youtube.com/results?search_query=${encoded}`],
  ['youtube.com', `https://www.youtube.com/results?search_query=${encoded}`],
  ['油管', `https://www.youtube.com/results?search_query=${encoded}`],
  ['taobao', `https://s.taobao.com/search?q=${encoded}`],
  ['taobao.com', `https://s.taobao.com/search?q=${encoded}`],
  ['淘宝', `https://s.taobao.com/search?q=${encoded}`],
  ['tmall', `https://list.tmall.com/search_product.htm?q=${encoded}`],
  ['tmall.com', `https://list.tmall.com/search_product.htm?q=${encoded}`],
  ['天猫', `https://list.tmall.com/search_product.htm?q=${encoded}`],
  ['1688', `https://s.1688.com/selloffer/offer_search.htm?keywords=${encoded}`],
  ['1688.com', `https://s.1688.com/selloffer/offer_search.htm?keywords=${encoded}`],
  ['douyin', `https://www.douyin.com/search/${encoded}`],
  ['douyin.com', `https://www.douyin.com/search/${encoded}`],
  ['抖音', `https://www.douyin.com/search/${encoded}`],
]);

const url = urls.get(platform);
if (!url) {
  console.error(`unsupported platform: ${platformArg}`);
  process.exit(2);
}

console.log(url);
