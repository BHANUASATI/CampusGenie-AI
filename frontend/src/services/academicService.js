import { courses } from '../data/courses';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const academicService = {
  // Get all courses
  getCourses: async () => {
    await delay(300);
    return courses;
  },

  // Get course by ID
  getCourseById: async (id) => {
    await delay(200);
    return courses.find((course) => course.id === id) || null;
  },

  // Search courses
  searchCourses: async (query) => {
    await delay(300);
    const lowerQuery = query.toLowerCase();
    return courses.filter(
      (course) =>
        course.name.toLowerCase().includes(lowerQuery) ||
        course.code.toLowerCase().includes(lowerQuery) ||
        course.faculty.toLowerCase().includes(lowerQuery)
    );
  },
};
