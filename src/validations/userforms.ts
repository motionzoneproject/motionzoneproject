import z from "zod";

export const UserBookLessonSchema = z.object({
  courseId: z.string().min(1),
  purchaseId: z.string().min(1),
  lessonId: z.string().min(1),
});
