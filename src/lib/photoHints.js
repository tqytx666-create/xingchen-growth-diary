// 拍照打卡:每个任务拍什么的模板提示(纯前端文案,不进同步数据)
// 没列到的任务 = 不要求拍照。
export const PHOTO_HINTS = {
  t_english:  { need: true,  emoji: '📚', what: '英语学习笔记 / 课本页', tip: '把今天学的那一页或写的笔记拍清楚' },
  t_teeth_am: { need: true,  emoji: '🪥', what: '挤好牙膏的牙刷', tip: '牙刷上挤好牙膏,对着镜子或拿在手里拍' },
  t_teeth_pm: { need: true,  emoji: '🪥', what: '挤好牙膏的牙刷', tip: '牙刷上挤好牙膏,对着镜子或拿在手里拍' },
  t_bath:     { need: true,  emoji: '👕', what: '换下来的衣服', tip: '洗完澡,把换下来的衣服拍一下' },
  t_hair:     { need: true,  emoji: '💇', what: '擦干头发的样子', tip: '洗完头、擦干后自拍一张' },
  t_badminton:{ need: true,  emoji: '🏸', what: '羽毛球场馆 / 球拍', tip: '在打球的地方拍一张场地或球拍' },
  t_room:     { need: true,  emoji: '🧹', what: '整理好的房间', tip: '房间收拾干净后拍一张' }
}

export function photoHint(taskId) {
  return PHOTO_HINTS[taskId] || null
}
