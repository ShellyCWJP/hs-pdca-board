import type { DoStatus } from '#/server/schema'

const SCORE: Record<DoStatus, number> = { done: 1, partial: 0.5, not_done: 0 }

/** Plan 項目の達成状態から達成率（0〜100 の整数）を求める。未入力は未達成扱い。 */
export function calcAchievementRate(items: { doStatus: DoStatus | null }[]): number {
  if (items.length === 0) return 0
  const score = items.reduce((sum, item) => sum + (item.doStatus ? SCORE[item.doStatus] : 0), 0)
  return Math.round((score / items.length) * 100)
}

export const DO_STATUS_LABEL: Record<DoStatus, string> = {
  done: '達成',
  partial: '一部達成',
  not_done: '未達成',
}

export const RECORD_STATUS_LABEL = {
  planning: 'Plan 下書き中',
  doing: 'Do 未入力',
  reflected: '入力済み',
  closed: 'フィードバック済み',
} as const
