export function advanceReview(intervalDays: number, correct: boolean) { if (!correct) return 1; if (intervalDays <= 1) return 3; if (intervalDays <= 3) return 7; return Math.min(30, intervalDays * 2) }
export function isDue(nextReviewDate: string, today: string) { return nextReviewDate <= today }
