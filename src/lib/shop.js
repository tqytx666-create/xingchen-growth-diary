// 商城价格(星币)。皮肤/家具/房间是一次性购买(拥有后可装扮);道具是消耗品按个买。
export const SKIN_PRICE = {
  bow: 60, scarf: 80, rain: 100, sleep: 120, wings: 150, wizard: 190,
  berry: 230, dino: 270, princess: 320, astro: 380, flower: 300, chef: 360, pirate: 440, angel: 520,
  hanfu: 480, jk: 420, bunny: 360, unicorn: 560, mermaid: 520
}
export const ROOM_PRICE = { forest: 200, ocean: 350, space: 550, sakura: 400, castle: 650, candy: 480 }   // night 免费默认拥有
export const FURN_PRICE = { bowl: 80, plant: 160, toybox: 280, shelf: 200, lamp: 140, plush: 240 }
export const ITEM_PRICE = { bone: 15, fish: 20, ball: 25, wand: 45 }

// 每日打卡获得的星币
export const COIN_PER_MAIN = 10   // 英语主线
export const COIN_PER_SIDE = 5    // 支线

// 心愿兑换:用星币换"现实里想要的东西"(星晨自己的兴趣)。买 = 下单,家长在兑换页通过后线下兑现;拒绝退星币。
// 价格按"打卡攒星币的节奏"定,可随时调。
export const WISH = [
  { key: 'card',   emoji: '🃏', name: '小说周边·小卡', price: 175, note: '≤20 元的角色小卡' },
  { key: 'standee',emoji: '🧍', name: '小说周边·立牌/挂坠', price: 275, note: '≤20 元的立牌或挂坠' },
  { key: 'book',   emoji: '📚', name: '原耽小说·一套', price: 450, note: '一套实体书(约 70~80 元)' },
  // 小米手环表盘会员:首月 ¥9.9、续费 ¥19.8;按 ~8.8 星币/元 折算
  { key: 'band_watchface_first', emoji: '⌚', name: '手环表盘会员·首月特惠', price: 90,  note: '首月 ¥9.9 · 爸妈通过后帮你开通(限首月一次)' },
  { key: 'band_watchface_renew', emoji: '⌚', name: '手环表盘会员·续费(1个月)', price: 175, note: '续费 ¥19.8/月 · 爸妈通过后帮你续' }
]
