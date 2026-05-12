"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/lib/session-provider";
import { cn } from "@/lib/utils";

interface NavBarAuthProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export default function NavBarAuth({
  mobile = false,
  onNavigate,
}: NavBarAuthProps) {
  const { session, user } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  if (session && user) {
    return (
      <div
        className={cn(
          "flex items-center gap-3",
          mobile && "w-full flex-col items-start gap-2",
        )}
      >
        <Button
          asChild
          size="sm"
          variant="outline"
          className={cn(
            "h-auto min-h-8 flex-col items-start gap-0 px-3 py-1.5 text-left leading-tight",
            mobile && "w-full justify-start",
          )}
        >
          <Link href="/user" onClick={onNavigate}>
            <span>{t("auth.profileAndBook")}</span>
            <span className="max-w-[12rem] truncate text-xs font-normal text-muted-foreground">
              {user.name}
            </span>
          </Link>
        </Button>
        <div
          className={cn(
            "flex items-center gap-3",
            mobile && "w-full flex-wrap gap-2",
          )}
        >
          {user.role === "admin" && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className={cn(mobile && "justify-center")}
            >
              <Link href="/admin" onClick={onNavigate}>
                {t("auth.admin")}
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              onNavigate?.();
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/");
                    router.refresh();
                  },
                },
              });
            }}
          >
            {t("auth.signOut")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      asChild
      className={cn(
        "bg-brand hover:bg-brand-light text-white",
        mobile && "w-full justify-center",
      )}
    >
      <Link href="/signin" onClick={onNavigate}>
        {t("auth.signIn")}
      </Link>
    </Button>
  );
}
