export default function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const orderId =
    typeof searchParams.orderId === "string" ? searchParams.orderId : undefined;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Orderbekräftelse</h1>
      {orderId ? (
        <p>
          Tack för din beställning. Ditt ordernummer är
          <span className="font-mono"> {orderId}</span>.
        </p>
      ) : (
        <p>Beställning mottagen.</p>
      )}
      <a href="/" className="underline">
        Till startsidan
      </a>
    </div>
  );
}
