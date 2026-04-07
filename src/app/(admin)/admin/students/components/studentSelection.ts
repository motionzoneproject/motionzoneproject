export type SelectedStudent = {
  studentKey: string;
  name: string;
  email: string;
};

export type StudentsSelectedType = Record<string, SelectedStudent>;
