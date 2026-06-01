// 真实美术图(即梦生成的星愿犬,已去背透明)。Vite 会把它们打成带 hash 的 URL。
import base from '../assets/pet/pet_base.png'
import egg from '../assets/pet/pet_egg.png'
import wisdom from '../assets/pet/pet_wisdom.png'
import clean from '../assets/pet/pet_clean.png'
import sport from '../assets/pet/pet_sport.png'
import charm from '../assets/pet/pet_charm.png'
import god from '../assets/pet/pet_god.png'
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

export const IMG = { base, egg, wisdom, clean, sport, charm, god }

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
  { key: 'astro',    name: '小宇航员', emoji: '🚀', days: 110, img: skAstro }
]

import { dominant } from './petConfig.js'

// 主头像:按皮肤/阶段+主导属性 选图。
// 注:状态不佳(低落/退阶风险)不再换图,改由 PetAvatar 给原图加灰色蒙板。
export function mainImage(pet, attrs) {
  if (pet.stage_idx <= 0) return IMG.egg
  if (pet.skin && pet.skin !== 'default') return skinImage(pet.skin)
  if (pet.stage_idx >= 5) return IMG.god
  if (pet.stage_idx >= 3) {
    const dom = dominant(attrs)
    if (dom === 'wisdom') return IMG.wisdom
    if (dom === 'cleanliness') return IMG.clean
    if (dom === 'vitality') return IMG.sport
    if (dom === 'charm') return IMG.charm
  }
  return IMG.base
}

// 图鉴每个形态对应的图
export const FORM_IMAGE = {
  egg, puppy: base, grow: base,
  wisdom, clean, sport,
  charm, elite: god, god
}

// 皮肤对应的图(含属性皮肤 + 签到皮肤)
export const SKIN_IMAGE = {
  default: base, scholar: wisdom, fresh: clean, champ: sport, god,
  bow: skBow, scarf: skScarf, rain: skRain, sleep: skSleep, wings: skWings, wizard: skWizard,
  berry: skBerry, dino: skDino, princess: skPrincess, astro: skAstro
}

export function skinImage(key) { return SKIN_IMAGE[key] || base }
export function formImage(key) { return FORM_IMAGE[key] || base }
