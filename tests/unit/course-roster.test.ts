import { describe, expect, it } from "vitest";
import { placesStudentInCourse, studentKeyOf } from "@/lib/course-roster";

const base = {
  courseId: "kurs-a",
  selectedCourseIds: [] as string[],
  autobook: false,
  courseCount: 1,
  activeBookings: 0,
};

describe("placesStudentInCourse", () => {
  describe("regel 1: sparade kursval", () => {
    it("räknar inte en bortvald kurs, inte ens om produkten autobokar", () => {
      expect(
        placesStudentInCourse({
          ...base,
          selectedCourseIds: ["kurs-b"],
          autobook: true,
          courseCount: 1,
          activeBookings: 3,
        }),
      ).toBe(false);
    });

    it("släpper vidare en vald kurs till nästa regel", () => {
      expect(
        placesStudentInCourse({
          ...base,
          selectedCourseIds: ["kurs-a", "kurs-b"],
          courseCount: 5,
          activeBookings: 0,
        }),
      ).toBe(false);
      expect(
        placesStudentInCourse({
          ...base,
          selectedCourseIds: ["kurs-a", "kurs-b"],
          courseCount: 5,
          autobook: true,
        }),
      ).toBe(true);
    });

    it("tomma val betyder att produkten saknar val", () => {
      expect(placesStudentInCourse({ ...base, selectedCourseIds: [] })).toBe(
        true,
      );
    });
  });

  describe("regel 2: autobokning", () => {
    it("räknar raden även utan bokningar, så att felet syns", () => {
      expect(
        placesStudentInCourse({
          ...base,
          autobook: true,
          courseCount: 20,
          activeBookings: 0,
        }),
      ).toBe(true);
    });
  });

  describe("regel 3: köp av en enda kurs", () => {
    it("räknar raden utan bokningar", () => {
      expect(
        placesStudentInCourse({ ...base, courseCount: 1, activeBookings: 0 }),
      ).toBe(true);
    });
  });

  describe("regel 4: flera kurser avgörs av bokningarna", () => {
    it("räknar inte en kurs i ett terminskort utan bokningar", () => {
      expect(
        placesStudentInCourse({ ...base, courseCount: 20, activeBookings: 0 }),
      ).toBe(false);
    });

    it("räknar en kurs där eleven har bokningar", () => {
      expect(
        placesStudentInCourse({ ...base, courseCount: 2, activeBookings: 1 }),
      ).toBe(true);
    });
  });
});

describe("studentKeyOf", () => {
  it("använder deltagaren när den finns", () => {
    expect(studentKeyOf({ participantId: "p1", userId: "u1" })).toBe(
      "participant:p1",
    );
  });

  it("använder köparen annars", () => {
    expect(studentKeyOf({ userId: "u1" })).toBe("user:u1");
    expect(studentKeyOf({ participantId: null, userId: "u1" })).toBe("user:u1");
    expect(studentKeyOf({ participantId: "", userId: "u1" })).toBe("user:u1");
  });

  it("skiljer en deltagare från en användare med samma id", () => {
    expect(studentKeyOf({ participantId: "x", userId: "y" })).not.toBe(
      studentKeyOf({ userId: "x" }),
    );
  });
});
