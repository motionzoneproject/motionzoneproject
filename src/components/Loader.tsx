interface Props {
  small?: boolean;
}

export default function Loader({ small = false }: Props) {
  return (
    <div className="flex justify-center">
      <div
        className={`rounded-full border-4 border-blue-500 border-t-blue-300 animate-spin ${
          small ? "w-6 h-6" : "w-12 h-12"
        }`}
      />
    </div>
  );
}
