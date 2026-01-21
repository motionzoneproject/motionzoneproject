import z from "zod";

export const UserBookLessonSchema = z.object({
  courseId: z.string().min(1),
  purchaseItemId: z.string().min(1),
  lessonId: z.string().min(1),
});
