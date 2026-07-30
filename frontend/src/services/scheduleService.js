import { scheduleData } from '../data/schedule';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const scheduleService = {
  // Get today's schedule
  getTodaySchedule: async () => {
    await delay(300);
    return scheduleData.today;
  },

  // Get weekly schedule
  getWeeklySchedule: async () => {
    await delay(300);
    return scheduleData.weekly;
  },

  // Get schedule for specific day
  getDaySchedule: async (day) => {
    await delay(200);
    return scheduleData.weekly[day] || [];
  },
};
