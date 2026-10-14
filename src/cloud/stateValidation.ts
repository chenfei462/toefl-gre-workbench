import { z } from 'zod'
const str = z.string()
const num = z.number().finite()
const exam = z.enum(['toefl', 'gre'])
const strings = z.array(str)
const date = z.iso.date()
const eventDate = z.union([date, z.iso.datetime({ offset: true })])
const entry = z.object({ id: str, date: eventDate, exam, section: str, errorTags: strings }).passthrough()
const examProfile = z.object({ exam, examDate: date.optional(), targetScore: num, baselineScore: num.optional(), latestScore: num.optional() }).passthrough()

// Supplemental checks for legacy record-shaped fields. Preserve every field;
// migration and the existing domain schemas remain the source of normalized data.
export const cloudBusinessSchema = z.object({
  profile: z.object({ examTypes: z.array(exam).min(1), startDate: date, targetScores: z.record(str, str), currentScores: z.record(str, str), dailyMinutes: num.positive(), studyDaysPerWeek: num.int().min(1).max(7), intensity: z.enum(['light', 'standard', 'intensive']) }).passthrough(),
  examProfiles: z.object({ toefl: examProfile, gre: examProfile }),
  tasks: z.array(z.object({ id: str, dayIndex: num, plannedDate: date, completedAt: eventDate.optional(), exam, section: str, title: str, description: str, estimatedMinutes: num, resourceIds: strings, status: z.enum(['todo', 'in_progress', 'done', 'skipped']) }).passthrough()),
  resources: z.array(z.object({ id: str, title: str, type: z.enum(['link', 'document', 'template', 'note']), tags: strings }).passthrough()),
  practiceEntries: z.array(entry), legacyPracticeEntries: z.array(entry),
  weeklyReviews: z.array(z.object({ weekIndex: num, strengths: str, weaknesses: str, nextActions: str }).passthrough()),
  skills: z.array(z.object({ id: str, exam, section: str, name: str, priorityWeight: num }).passthrough()),
  attempts: z.array(z.object({ id: str, date: eventDate }).passthrough()),
  errorRecords: z.array(z.object({ id: str, createdAt: eventDate, nextReviewDate: date.optional(), resolvedAt: eventDate.optional() }).passthrough()),
  reviewAttempts: z.array(z.object({ id: str, errorRecordId: str, date: eventDate, correct: z.boolean() }).passthrough()),
  mastery: z.array(z.object({ skillId: str, attempts: num, recentAttempts: num, accuracy: num, recentAccuracy: num, errorCount: num, unresolvedErrors: num, masteryScore: num, confidence: z.enum(['low', 'medium', 'high']) }).passthrough()),
  checkpoints: z.array(z.object({ id: str, date: eventDate, exam, source: str, sourceType: z.enum(['official', 'practice', 'estimated', 'manual']), sectionScores: z.record(str, num), overallScore: num.optional() }).passthrough()),
  prescriptions: z.array(z.object({ date, availableMinutes: num, rationale: strings, generatedAt: eventDate, blocks: z.array(z.object({ id: str, exam, section: str, type: z.enum(['learn', 'practice', 'timed_practice', 'error_review', 'vocabulary', 'mock', 'light_review']), minutes: num, priority: num, reason: str }).passthrough()) }).passthrough()),
}).passthrough()
