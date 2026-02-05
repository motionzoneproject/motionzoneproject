interface Props {
  searchParams: Promise<{
    teacher?: string;
    from?: string;
    to?: string;
    termin?: string;
    course?: string;
    schemaitem?: string;
    status?: string;
  }>;
}

export default async function LecturePage({ searchParams }: Props) {
  const { teacher, from, to, termin, course, schemaitem, status } =
    await searchParams;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Lektioner</h1>
      <br />
      FIlter
      <br />
      <br />
      teacher: {teacher}
      <br />
      from: {from}
      <br />
      to: {to}
      <br />
      termin: {termin}
      <br />
      course: {course}
      <br />
      schemaitem: {schemaitem}
      <br />
      status: {status}
      <br />
    </div>
  );
}
