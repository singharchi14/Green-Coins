// Program rules in ONE place. Change a number here and the whole platform follows.
export const CATEGORIES = {
  wet:         { label: 'Wet waste',  coins: 5,  hint: 'Food scraps, peels, tea leaves, garden waste' },
  dry:         { label: 'Dry waste',  coins: 5,  hint: 'Paper, cardboard, cloth, wrappers' },
  recyclable:  { label: 'Recyclable', coins: 10, hint: 'Clean plastic bottles, metal cans, glass' },
  hazardous:   { label: 'Hazardous',  coins: 15, hint: 'Batteries, paint, expired medicines, bulbs' },
  ewaste:      { label: 'E-waste',    coins: 20, hint: 'Old phones, chargers, cables, circuit boards' },
};
export const LIMITS = { perDay: 3, coinsPerDay: 20, coinsPerMonth: 200, minRedeem: 20, codeTtlMin: 15, maxImageBytes: 4 * 1024 * 1024 };
export const AI_RULES = { approveAt: 0.85, rejectAt: 0.85, softRejectAt: 0.7 };
export const isCategory = c => Object.prototype.hasOwnProperty.call(CATEGORIES, c);

// Doorstep pickup rules. Coins are paid only after a worker-weighed, verified collection.
export const PICKUP = {
  coinsPerKg: { wet: 1, dry: 2, recyclable: 4, hazardous: 5, ewaste: 6 },
  maxCoins: 30,          // cap per pickup
  minKg: 0.2, maxKg: 25, // accepted range for estimates and weighed quantity
  maxActive: 2,          // open requests (requested/assigned/collected) per household
  repeatDays: 7,         // one request per category in any 7-day window
  maxAheadDays: 7,       // how far ahead a day can be chosen
};
// Municipal analytics thresholds.
export const ANALYTICS = { windowDays: 30, lowParticipation: 0.25, minHouseholds: 3 };
