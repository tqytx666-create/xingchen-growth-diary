// 真实美术图(即梦生成的星愿犬,已去背透明)。Vite 会把它们打成带 hash 的 URL。
import base from '../assets/pet/pet_base.png'
import low from '../assets/pet/pet_low.png'
import wisdom from '../assets/pet/pet_wisdom.png'
import clean from '../assets/pet/pet_clean.png'
import sport from '../assets/pet/pet_sport.png'
import god from '../assets/pet/pet_god.png'

export const IMG = { base, low, wisdom, clean, sport, god }

import { dominant } from './petConfig.js'

// 主头像:按心情/皮肤/阶段+主导属性 选图
export function mainImage(pet, attrs) {
  if (pet.mood === 'low' || pet.mood === 'disappointed') return IMG.low
  if (pet.skin && pet.skin !== 'default') return skinImage(pet.skin)
  if (pet.stage_idx >= 5) return IMG.god
  if (pet.stage_idx >= 3) {
    const dom = dominant(attrs)
    if (dom === 'wisdom') return IMG.wisdom
    if (dom === 'cleanliness') return IMG.clean
    if (dom === 'vitality') return IMG.sport
    if (dom === 'charm') return IMG.clean
  }
  return IMG.base
}

// 图鉴每个形态对应的图
export const FORM_IMAGE = {
  egg: base, puppy: base, grow: base,
  wisdom, clean, sport,
  charm: clean, elite: god, god
}

// 皮肤对应的图
export const SKIN_IMAGE = {
  default: base, scholar: wisdom, fresh: clean, champ: sport, god
}

export function skinImage(key) { return SKIN_IMAGE[key] || base }
export function formImage(key) { return FORM_IMAGE[key] || base }
