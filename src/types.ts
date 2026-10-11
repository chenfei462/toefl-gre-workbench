export type Exam = 'toefl' | 'gre'
export type Section = 'reading' | 'listening' | 'speaking' | 'writing' | 'vocabulary' | 'quant' | 'verbal' | 'analytical_writing'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'skipped'
export type SourceType = 'official' | 'third_party' | 'self_created' | 'mock'
export type ErrorType = 'vocabulary' | 'knowledge' | 'concept' | 'grammar' | 'logic' | 'misread' | 'calculation' | 'strategy' | 'time_pressure' | 'careless' | 'pronunciation' | 'fluency' | 'listening_detail' | 'memory' | 'unknown'
export type ErrorStatus = 'new' | 'reviewing' | 'resolved' | 'reopened'
export type ScoreSourceType = 'official' | 'practice' | 'estimated' | 'manual'
export type QuestionSourceType = 'official' | 'community' | 'third_party' | 'user_owned' | 'legacy'
export type QuestionSourceTier = 'A' | 'B' | 'C' | 'D'
export type RightsStatus = 'public' | 'licensed' | 'user_owned' | 'reference_only' | 'unknown'
export type QuestionStorageMode = 'full' | 'reference_only'
export type VerificationStatus = 'verified' | 'unverified' | 'disputed'
export type AnswerVerification = 'official' | 'verified' | 'unverified' | 'disputed'

export interface SourceReference {
  sourceId: string
  sourceQuestionId?: string
  locator?: string
  accessedAt?: string
}

export interface QuestionSource {
  notes?: string
  active?: boolean
  lastVerifiedAt?: string
  id: string
  name: string
  publisher: string
  sourceType: QuestionSourceType
  sourceTier: QuestionSourceTier
  url?: string
  retrievedAt?: string
  examVersions: string[]
  rightsStatus: RightsStatus
  verified: boolean
}

export interface QuestionOption {
  id: string
  text?: string
  label?: string
}

export interface QuestionAnswer {
  optionIds?: string[]
  numericAnswer?: number
  acceptedAnswers?: string[]
  optionId?: string
  text?: string
  score?: number
  verification: AnswerVerification
}

export interface AnswerExplanation {
  sourceUrl?: string
  source?: 'official' | 'verified' | 'user' | 'generated'
  id: string
  questionId: string
  body: string
  sourceReference?: SourceReference
  verification: VerificationStatus
}

export interface Passage {
  id: string
  sourceId: string
  title?: string
  text?: string
  storageMode: QuestionStorageMode
  sourceReference?: SourceReference
}

export interface QuestionMedia {
  id: string
  questionId: string
  kind: 'audio' | 'image' | 'video'
  url?: string
  storageMode: QuestionStorageMode
  sourceReference?: SourceReference
}

export interface QuestionRevision {
  id: string
  questionId: string
  revisedAt: string
  changes: string
  sourceReference?: SourceReference
}

export interface QuestionCompatibility {
  examVersion: string
  status: 'current' | 'legacy' | 'incompatible'
  reason?: string
}

export interface Question {
  title?: string
  sourceSection?: string
  sourceQuestionNumber?: string
  answerType?: 'single_choice' | 'multiple_choice' | 'numeric' | 'text' | 'ordering' | 'speaking' | 'essay'
  publishedAt?: string
  lastVerifiedAt?: string
  id: string
  sourceId: string
  sourceQuestionId?: string
  exam: Exam
  examVersion: string
  section: Section
  questionType: string
  skillIds: string[]
  prompt?: string
  promptHash: string
  options: QuestionOption[]
  answer?: QuestionAnswer
  difficulty?: 1 | 2 | 3 | 4 | 5
  passageId?: string
  storageMode: QuestionStorageMode
  verification: VerificationStatus
  compatibility: QuestionCompatibility
  explanationIds: string[]
  mediaIds: string[]
  tags: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ConstructedResponseAttempt {
  response?: string
  rubricScore?: number
  feedback?: string
}

export interface ExamProfile {
  exam: Exam
  examDate?: string
  targetScore: number
  baselineScore?: number
  baselineSource?: 'legacy' | 'manual' | 'official'
  latestScore?: number
}

export interface Skill {
  id: string
  exam: Exam
  section: string
  questionType?: string
  name: string
  parentSkillId?: string
  priorityWeight: number
}

export interface UserProfile {
  examTypes: Exam[]
  startDate: string
  targetScores: Partial<Record<Exam, string>>
  currentScores: Partial<Record<Exam, string>>
  dailyMinutes: number
  studyDaysPerWeek: number
  intensity: 'light' | 'standard' | 'intensive'
}

export interface StudyTask {
  id: string
  dayIndex: number
  plannedDate: string
  exam: Exam
  section: Section
  title: string
  description: string
  estimatedMinutes: number
  resourceIds: string[]
  status: TaskStatus
  note?: string
  completedAt?: string
}

export interface PracticeEntry {
  id: string
  taskId?: string
  date: string
  exam: Exam
  section: Section
  correct?: number
  total?: number
  score?: number
  durationMinutes?: number
  errorTags: string[]
  note?: string
}

export interface Attempt {
  evidenceWeight?: number
  excludeFromMastery?: boolean
  provenance?: 'question' | 'reference' | 'batch_summary'
  id: string
  date: string
  exam: Exam
  section: string
  questionType?: string
  skillIds: string[]
  source?: string
  sourceType: SourceType
  correct?: boolean
  rawScore?: number
  timeSeconds?: number
  difficulty?: 1 | 2 | 3 | 4 | 5
  confidence?: 1 | 2 | 3 | 4 | 5
  errorType?: ErrorType
  note?: string
  reviewed: boolean
  taskId?: string
  questionId?: string
  sourceReference?: SourceReference
  sessionId?: string
  selectedAnswer?: QuestionAnswer
  constructedResponse?: ConstructedResponseAttempt
}

export interface ErrorRecord {
  id: string
  attemptId: string
  exam: Exam
  section: string
  questionType?: string
  skillIds: string[]
  errorType: ErrorType
  explanation?: string
  correctedUnderstanding?: string
  createdAt: string
  status: ErrorStatus
  reviewCount: number
  nextReviewDate?: string
  resolvedAt?: string
}

export interface ReviewAttempt {
  id: string
  errorRecordId: string
  date: string
  correct: boolean
  timeSeconds?: number
  confidence?: number
}

export interface SkillMastery {
  skillId: string
  attempts: number
  recentAttempts: number
  accuracy: number
  recentAccuracy: number
  retryAccuracy?: number
  averageTimeSeconds?: number
  errorCount: number
  unresolvedErrors: number
  lastPracticedAt?: string
  nextReviewDate?: string
  masteryScore: number
  confidence: 'low' | 'medium' | 'high'
}

export interface ScoreCheckpoint {
  id: string
  date: string
  exam: Exam
  source: string
  sourceType: ScoreSourceType
  overallScore: number
  sectionScores: Record<string, number>
  notes?: string
}

export interface VocabularyItem {
  id: string
  word: string
  meaning: string
  source?: string
  example?: string
  status: 'new' | 'learning' | 'weak' | 'mature'
  intervalDays: number
  nextReviewDate: string
  correctStreak: number
  incorrectCount: number
  lastReviewedAt?: string
}

export interface DailyPrescriptionBlock {
  id: string
  exam: Exam
  section: string
  skillId?: string
  type: 'learn' | 'practice' | 'timed_practice' | 'error_review' | 'vocabulary' | 'mock' | 'light_review'
  minutes: number
  priority: number
  reason: string
}

export interface DailyPrescription {
  date: string
  availableMinutes: number
  blocks: DailyPrescriptionBlock[]
  rationale: string[]
  generatedAt: string
}

export interface Resource {
  id: string
  title: string
  type: 'link' | 'document' | 'template' | 'note'
  url?: string
  exam?: Exam
  section?: Section
  tags: string[]
}

export interface WeeklyReview {
  weekIndex: number
  strengths: string
  weaknesses: string
  nextActions: string
}

export interface WorkbenchState {
  schemaVersion: number
  profile: UserProfile
  tasks: StudyTask[]
  resources: Resource[]
  practiceEntries: PracticeEntry[]
  weeklyReviews: WeeklyReview[]
  examProfiles: Record<Exam, ExamProfile>
  skills: Skill[]
  attempts: Attempt[]
  errorRecords: ErrorRecord[]
  reviewAttempts: ReviewAttempt[]
  mastery: SkillMastery[]
  checkpoints: ScoreCheckpoint[]
  vocabulary: VocabularyItem[]
  prescriptions: DailyPrescription[]
  legacyPracticeEntries: PracticeEntry[]
}

export interface PlanTemplateItem {
  section: Section
  title: string
  description: string
  minutes: number
}

export type PlanTemplate = Record<Exam, PlanTemplateItem[]>

export interface ProgressSummary {
  completedTasks: number
  totalTasks: number
  completionRate: number
  practiceAccuracy: number
  studyMinutes: number
  streak: number
}
