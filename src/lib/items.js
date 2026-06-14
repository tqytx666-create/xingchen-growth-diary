import bone from '../assets/item/item_bone.png'
import fish from '../assets/item/item_fish.png'
import ball from '../assets/item/item_ball.png'
import wand from '../assets/item/item_wand.png'
import medicine from '../assets/item/item_medicine.webp'

// 道具:喂食/玩耍/魔法。使用后加心情(让宠物开心)+ 少量经验(帮成长/孵化)。
// 通过宝箱掉落 + 初始赠送获得。
export const ITEMS = [
  { key: 'bone', name: '肉骨头', emoji: '🦴', img: bone, mood: 8,  exp: 3,  kind: 'feed',  burst: ['🦴', '💛', '✨'], msg: '小愿啃得超香!心情大好 🥰' },
  { key: 'fish', name: '小鱼干', emoji: '🐟', img: fish, mood: 6,  exp: 4,  kind: 'feed',  burst: ['🐟', '💕', '✨'], msg: '小鱼干!小愿最爱吃了 😋' },
  { key: 'ball', name: '玩具球', emoji: '⚽', img: ball, mood: 10, exp: 2,  kind: 'play',  burst: ['⚽', '💫', '🐾'], msg: '小愿追着球跑,玩得好开心!' },
  { key: 'wand', name: '星星魔法棒', emoji: '✨', img: wand, mood: 5,  exp: 10, kind: 'magic', burst: ['⭐', '🌟', '✨', '💫'], msg: '魔法星光洒下,经验大涨 ✨' },
  { key: 'medicine', name: '神奇药水', emoji: '💊', img: medicine, mood: 6, cure: 50, kind: 'cure', burst: ['💊', '❤️', '✨', '💕'], msg: '咕嘟咕嘟喝下药水,病好多啦,健康大大恢复!' }
]
export function itemDef(key) { return ITEMS.find(i => i.key === key) || null }
