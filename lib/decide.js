import { AI_RULES } from './config.js';
// Pure function: turns the AI's observations into a program decision.
// The AI only reports what it sees; THESE rules decide. Unsure -> a human reviews.
const HARD = { screenshot: 'This looks like a screenshot, not a live photo.', stock: 'This looks like an internet or stock image.', face: 'A face is visible. Please retake without people in frame.' };
export function decide(ai, chosen, rules = AI_RULES) {
  if (!ai || typeof ai !== 'object') return { status: 'REVIEW', reason: 'Automatic check unavailable. Sent for human review.' };
  const conf = Number(ai.confidence) || 0, issues = Array.isArray(ai.issues) ? ai.issues : [];
  const hard = issues.find(i => HARD[i]);
  if (hard) return conf >= rules.softRejectAt ? { status: 'REJECTED', reason: HARD[hard], confidence: conf } : { status: 'REVIEW', reason: 'Needs a closer look.', confidence: conf };
  if (ai.quality && ai.quality !== 'ok') return conf >= rules.softRejectAt ? { status: 'REJECTED', reason: 'The photo is too blurry or dark. Retake it in good light.', confidence: conf } : { status: 'REVIEW', reason: 'Photo quality is unclear.', confidence: conf };
  if (issues.includes('no_waste') || ai.detected === 'none') return conf >= rules.rejectAt ? { status: 'REJECTED', reason: 'No waste is clearly visible in the photo.', confidence: conf } : { status: 'REVIEW', reason: 'Not sure what is in the photo.', confidence: conf };
  if (ai.detected && ai.detected !== chosen) return conf >= rules.rejectAt ? { status: 'REJECTED', reason: `This looks like ${ai.detected} waste, not ${chosen}. ${ai.reason || ''}`.trim(), confidence: conf } : { status: 'REVIEW', reason: 'Category is unclear.', confidence: conf };
  if (ai.detected === chosen && conf >= rules.approveAt) return { status: 'APPROVED', reason: ai.reason || 'Matches the chosen category.', confidence: conf };
  return { status: 'REVIEW', reason: 'Not fully certain. Sent for human review.', confidence: conf };
}
