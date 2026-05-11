import { format } from 'date-fns';

export const getWeekOfMonth = (date: Date): number => {
  const day = date.getDate();
  const week = Math.ceil(day / 7);
  return Math.min(week, 4);
};

export const getCurrentWeek = (): number => {
  return getWeekOfMonth(new Date());
};
