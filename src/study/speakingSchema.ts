import { z } from 'zod'
export const speakingErrorCategories = ['pronunciation', 'fluency', 'grammar', 'vocabulary', 'hesitation', 'memory', 'listening', 'organization'] as const
export const speakingSessionSchema = z.object({
  id: z.string().min(1), taskType: z.enum(['listen_repeat', 'interview']), prompt: z.string().min(1).max(20000),
  startedAt: z.iso.datetime(), durationSeconds: z.number().nonnegative(),
  preparationSeconds: z.number().int().min(0).max(300), responseSeconds: z.number().int().min(1).max(600),
  recordingId: z.string().min(1), mimeType: z.string(), byteLength: z.number().int().positive(),
  stimulusName: z.string().optional(), selfRating: z.number().int().min(1).max(5).optional(),
  errors: z.array(z.enum(speakingErrorCategories)).default([]), note: z.string().default(''), attemptId: z.string().optional(),
})
