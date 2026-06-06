// 真实美术图(即梦生成的星愿犬,已去背透明)。Vite 会把它们打成带 hash 的 URL。
import base from '../assets/pet/pet_base.png'
import egg from '../assets/pet/pet_egg.png'
import wisdom from '../assets/pet/pet_wisdom.png'
import clean from '../assets/pet/pet_clean.png'
import sport from '../assets/pet/pet_sport.png'
import charm from '../assets/pet/pet_charm.png'
import god from '../assets/pet/pet_god.png'
// 进化线形态(基础→星纹→翼星→辉光→御星→神犬)
import evo2 from '../assets/pet/pet_evo2.png'
import evo3 from '../assets/pet/pet_evo3.png'
import evo4 from '../assets/pet/pet_evo4.png'
import evo5 from '../assets/pet/pet_evo5.png'
// 签到皮肤(装扮,基于基础形态加装扮)
import skBow from '../assets/skin/skin_bow.png'
import skScarf from '../assets/skin/skin_scarf.png'
import skRain from '../assets/skin/skin_rain.png'
import skSleep from '../assets/skin/skin_sleep.png'
import skWings from '../assets/skin/skin_wings.png'
import skWizard from '../assets/skin/skin_wizard.png'
import skPrincess from '../assets/skin/skin_princess.png'
import skAstro from '../assets/skin/skin_astro.png'
import skDino from '../assets/skin/skin_dino.png'
import skBerry from '../assets/skin/skin_berry.png'
import skChef from '../assets/skin/skin_chef.png'
import skPirate from '../assets/skin/skin_pirate.png'
import skFlower from '../assets/skin/skin_flower.png'
import skAngel from '../assets/skin/skin_angel.png'
import skHanfu from '../assets/skin/skin_hanfu.png'
import skJk from '../assets/skin/skin_jk.png'
import skBunny from '../assets/skin/skin_bunny.png'
import skUnicorn from '../assets/skin/skin_unicorn.png'

export const IMG = { base, egg, wisdom, clean, sport, charm, god, evo2, evo3, evo4, evo5 }

// 宠物窝房间主题(按累计签到天数解锁;深色调保证宠物视频不穿帮)
import roomNight from '../assets/room/room_night.jpg'
import roomForest from '../assets/room/room_forest.jpg'
import roomOcean from '../assets/room/room_ocean.jpg'
import roomSpace from '../assets/room/room_space.jpg'
export const ROOM_TRACK = [
  { key: 'night',  name: '星空小窝', emoji: '🌙', days: 0,  img: roomNight },
  { key: 'forest', name: '森林树屋', emoji: '🌳', days: 20, img: roomForest },
  { key: 'ocean',  name: '海洋之家', emoji: '🐚', days: 40, img: roomOcean },
  { key: 'space',  name: '太空舱',   emoji: '🚀', days: 70, img: roomSpace }
]
export function roomImg(key) { return (ROOM_TRACK.find(r => r.key === key) || ROOM_TRACK[0]).img }

// 可摆放家具(按累计签到解锁,摆在房间固定槽位)
import furnBowl from '../assets/furniture/furn_bowl.png'
import furnToybox from '../assets/furniture/furn_toybox.png'
import furnPlant from '../assets/furniture/furn_plant.png'
export const FURNITURE = [
  { key: 'bowl',   name: '零食碗', emoji: '🍖', days: 10, img: furnBowl,   slot: { left: '15%', bottom: '11%', width: '58px' } },
  { key: 'plant',  name: '小绿植', emoji: '🪴', days: 35, img: furnPlant,  slot: { left: '4%',  bottom: '26%', width: '46px' } },
  { key: 'toybox', name: '玩具箱', emoji: '🧸', days: 60, img: furnToybox, slot: { right: '11%', bottom: '11%', width: '64px' } }
]
// 各阶段(stage_idx 0-6)对应形态图
export const STAGE_IMG = [egg, base, evo2, evo3, evo4, evo5, god]

// 签到皮肤跑道:按"累计英语签到天数"解锁,在签到页像每日登录奖励一样展示
export const SKIN_TRACK = [
  { key: 'bow',    name: '粉蝴蝶结', emoji: '🎀', days: 3,  img: skBow },
  { key: 'scarf',  name: '冬日围巾', emoji: '🧣', days: 7,  img: skScarf },
  { key: 'rain',   name: '黄色雨衣', emoji: '🌧️', days: 14, img: skRain },
  { key: 'sleep',  name: '星星睡帽', emoji: '😴', days: 21, img: skSleep },
  { key: 'wings',  name: '精灵翅膀', emoji: '🧚', days: 30, img: skWings },
  { key: 'wizard', name: '小魔法师', emoji: '🧙', days: 45, img: skWizard },
  { key: 'berry',    name: '草莓装',   emoji: '🍓', days: 60,  img: skBerry },
  { key: 'dino',     name: '小恐龙',   emoji: '🦖', days: 75,  img: skDino },
  { key: 'princess', name: '公主裙',   emoji: '👑', days: 90,  img: skPrincess },
  { key: 'astro',    name: '小宇航员', emoji: '🚀', days: 110, img: skAstro },
  { key: 'flower',   name: '花环夏日', emoji: '🌸', days: 130, img: skFlower },
  { key: 'chef',     name: '小厨师',   emoji: '🍳', days: 150, img: skChef },
  { key: 'pirate',   name: '小海盗',   emoji: '🏴‍☠️', days: 175, img: skPirate },
  { key: 'angel',    name: '小天使',   emoji: '😇', days: 200, img: skAngel },
  { key: 'hanfu',    name: '小汉服',   emoji: '🏮', days: 220, img: skHanfu },
  { key: 'jk',       name: 'JK校服',   emoji: '🎒', days: 240, img: skJk },
  { key: 'bunny',    name: '兔子睡衣', emoji: '🐰', days: 260, img: skBunny },
  { key: 'unicorn',  name: '独角兽装', emoji: '🦄', days: 280, img: skUnicorn }
]

// 主头像:蛋→看进化阶段;装扮了皮肤则显示皮肤。
// 注:状态不佳(低落/退阶风险)不换图,由 PetAvatar 给原图加灰色蒙板。
export function mainImage(pet, attrs) {
  if ((pet.stage_idx || 0) <= 0) return IMG.egg
  if (pet.skin && pet.skin !== 'default') return skinImage(pet.skin)
  return STAGE_IMG[Math.min(pet.stage_idx, 6)] || IMG.base
}

// 图鉴每个形态对应的图(对齐 petConfig.DEX 的 key)
export const FORM_IMAGE = {
  egg, base, evo2, evo3, evo4, evo5, god
}

// 皮肤对应的图(含属性皮肤 + 签到皮肤)
export const SKIN_IMAGE = {
  default: base, scholar: wisdom, fresh: clean, champ: sport, god,
  bow: skBow, scarf: skScarf, rain: skRain, sleep: skSleep, wings: skWings, wizard: skWizard,
  berry: skBerry, dino: skDino, princess: skPrincess, astro: skAstro,
  chef: skChef, pirate: skPirate, flower: skFlower, angel: skAngel,
  hanfu: skHanfu, jk: skJk, bunny: skBunny, unicorn: skUnicorn
}

export function skinImage(key) { return SKIN_IMAGE[key] || base }
export function formImage(key) { return FORM_IMAGE[key] || base }
