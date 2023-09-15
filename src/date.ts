const formatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto"
});

type RelativeTimeFormatUnit =
  | "year"
  | "years"
  | "quarter"
  | "quarters"
  | "month"
  | "months"
  | "week"
  | "weeks"
  | "day"
  | "days"
  | "hour"
  | "hours"
  | "minute"
  | "minutes"
  | "second"
  | "seconds";

const DIVISIONS: { amount: number; name: RelativeTimeFormatUnit }[] = [
  { amount: 1, name: "seconds" },
  { amount: 60, name: "seconds" },
  { amount: 60, name: "minutes" },
  { amount: 24, name: "hours" },
  { amount: 7, name: "days" },
  { amount: 4.34524, name: "weeks" },
  { amount: 12, name: "months" },
  { amount: Number.POSITIVE_INFINITY, name: "years" }
];

export function formatRelativeTime(date: Date) {
  let duration = (date.getTime() - Date.now()) / 1000;
  let i = 0;
  while (i < DIVISIONS.length - 1 && Math.abs(duration) > DIVISIONS[i].amount) {
    duration /= DIVISIONS[i].amount;
    i++;
  }

  const rounded = Math.round(duration);
  return formatter.format(rounded, DIVISIONS[i].name);
}
