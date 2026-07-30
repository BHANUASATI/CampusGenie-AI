import { attendanceData } from '../data/attendance';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const attendanceService = {
  // Get overall attendance
  getOverallAttendance: async () => {
    await delay(300);
    return attendanceData.overall;
  },

  // Get attendance by course
  getAttendanceByCourse: async () => {
    await delay(300);
    return attendanceData.byCourse;
  },

  // Get attendance for specific course
  getCourseAttendance: async (courseId) => {
    await delay(200);
    return attendanceData.byCourse.find((course) => course.courseId === courseId) || null;
  },
};
