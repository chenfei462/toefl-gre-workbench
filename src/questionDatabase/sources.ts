import type { QuestionSource } from '../types'
import seed from '../../data/official-sources/sources.json'
export const officialSources = seed as QuestionSource[]
export const manualSource: QuestionSource = { id: 'user-manual', name: '个人录入 / 自有资料', publisher: 'User', sourceType: 'user_owned', sourceTier: 'D', rightsStatus: 'user_owned', examVersions: ['GRE_CURRENT', 'TOEFL_2026'], verified: false }
export const recallSource: QuestionSource = { ...manualSource, id: 'community-recall', name: '社区回忆（未验证）', sourceType: 'community', rightsStatus: 'unknown' }
export const defaultSources = [...officialSources, manualSource, recallSource]
