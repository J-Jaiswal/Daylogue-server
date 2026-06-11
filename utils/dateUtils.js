// returns today as "YYYY-MM-DD"
export const getTodayString = () => {
  return new Date().toISOString().split("T")[0];
};

// calculates sleep duration in minutes handling midnight crossover
// bedTime and wakeTime are "HH:MM" strings
export const calculateSleepDuration = (bedTime, wakeTime) => {
  const [bedH, bedM] = bedTime.split(":").map(Number);
  const [wakeH, wakeM] = wakeTime.split(":").map(Number);

  let bedTotal = bedH * 60 + bedM;
  let wakeTotal = wakeH * 60 + wakeM;

  // handle midnight crossover e.g. bed at 23:00, wake at 07:00
  if (wakeTotal < bedTotal) {
    wakeTotal += 24 * 60;
  }

  return wakeTotal - bedTotal;
};

// returns Monday of the current week as "YYYY-MM-DD"
export const getWeekStartString = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
};

// formats minutes into "Xh Ym"
export const formatSleepDuration = (minutes) => {
  if (!minutes) return "N/A";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};
