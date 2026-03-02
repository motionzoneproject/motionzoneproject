import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLegalPageBySlug } from "@/lib/actions/legal-actions";

const LEGAL_SLUGS = ["integritetspolicy", "cookiepolicy", "kopvillkor"];

type Props = {
  params: Promise<{ legalSlug: string }>;
};

export async function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ legalSlug: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { legalSlug } = await params;
  const page = await getLegalPageBySlug(legalSlug);
  if (!page) return {};
  return {
    title: page.title,
    description: `${page.title} - MotionZone Växjö`,
  };
}

export default async function LegalPage({ params }: Props) {
  const { legalSlug } = await params;

  if (!LEGAL_SLUGS.includes(legalSlug)) {
    notFound();
  }

  const page = await getLegalPageBySlug(legalSlug);

  if (!page) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold mb-2">{page.title}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Senast uppdaterad:{" "}
        {page.updatedAt.toLocaleDateString("sv-SE", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      <div
        className="prose dark:prose-invert max-w-none"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-controlled content from TipTap editor
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  );
}
