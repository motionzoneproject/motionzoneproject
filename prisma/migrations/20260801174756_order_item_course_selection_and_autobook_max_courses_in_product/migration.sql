-- AlterTable
ALTER TABLE "product" ADD COLUMN     "autobook" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxCourses" INTEGER;

-- CreateTable
CREATE TABLE "order_item_course_selection" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_course_selection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_item_course_selection_orderItemId_courseId_key" ON "order_item_course_selection"("orderItemId", "courseId");

-- AddForeignKey
ALTER TABLE "order_item_course_selection" ADD CONSTRAINT "order_item_course_selection_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_course_selection" ADD CONSTRAINT "order_item_course_selection_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
