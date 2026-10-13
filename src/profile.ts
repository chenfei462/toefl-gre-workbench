import type { Exam, UserProfile, WorkbenchState } from './types'

function targetScore(exam: Exam, value?: string): number | undefined {
  if (!value?.trim()) return undefined
  const score = Number(value)
  const [minimum, maximum] = exam === 'toefl' ? [1, 6] : [260, 340]
  return Number.isFinite(score) && score >= minimum && score <= maximum ? score : undefined
}

export function validateStudyProfile(profile: UserProfile): void {
  if (!Number.isFinite(profile.dailyMinutes) || profile.dailyMinutes <= 0) throw new Error('每天可用时间需大于 0 分钟')
  for (const exam of profile.examTypes) {
    if (targetScore(exam, profile.targetScores[exam]) === undefined) {
      throw new Error(exam === 'toefl' ? 'TOEFL 目标需为 1–6 分；旧版分数请保留在历史记录中' : 'GRE 目标需为 260–340 分')
    }
  }
}

/** Align planner targets with the saved preferences without changing score history. */
export function synchronizeProfileTargets(state: WorkbenchState, profile = state.profile): WorkbenchState {
  const toefl = targetScore('toefl', profile.targetScores.toefl)
  const gre = targetScore('gre', profile.targetScores.gre)
  return {
    ...state,
    profile,
    examProfiles: {
      toefl: { ...state.examProfiles.toefl, targetScore: toefl ?? state.examProfiles.toefl.targetScore },
      gre: { ...state.examProfiles.gre, targetScore: gre ?? state.examProfiles.gre.targetScore },
    },
  }
}
