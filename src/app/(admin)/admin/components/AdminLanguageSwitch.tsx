"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LanguageSwitcherInput from "@/components/LanguageSwitcherInput";

interface Props {
  value: string;
}

export default function AdminLanguageSwitch({ value }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <LanguageSwitcherInput
      value={value}
      setValue={(nextValue) => {
        const next = new URLSearchParams(searchParams);
        next.set("lang", nextValue);
        router.replace(`${pathname}?${next.toString()}`);
      }}
    />
  );
}
