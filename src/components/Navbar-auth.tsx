"use client";

import { Crown, LogIn, LogOut, User2Icon } from "lucide-react";
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
  const { t } = useTranslation();
  const { session, user } = useSession();
  const router = useRouter();

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
            <div className="p-1 text-center">
              <span>
                <User2Icon className="inline-block mx-2" />
                {t("navAuth.profile")}
              </span>
            </div>
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
              className={cn(
                "h-auto min-h-8 flex-col items-start gap-0 px-3 py-1.5 text-left leading-tight",
                mobile && "w-full justify-start",
              )}
            >
              <Link href="/admin" onClick={onNavigate}>
                <div className="p-1">
                  <Crown className="inline-block mx-2" /> Admin
                </div>
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            className={cn(
              "h-auto min-h-8 flex-col items-start gap-0 px-3 py-1.5 text-left leading-tight",
              mobile && "w-full justify-start",
            )}
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
            <div className="p-1">
              <LogOut className="inline-block mx-2" />
              {t("navAuth.signOut")}
            </div>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        "h-auto min-h-8 flex-col items-start gap-0 px-3 py-1.5 text-left leading-tight",
        mobile && "w-full items-center justify-center text-center",
      )}
    >
      <Link href="/signin" onClick={onNavigate}>
        <div className="flex flex-col items-center gap-1">
          <LogIn className="w-4 h-4" />
          {t("navAuth.signIn")}
        </div>
      </Link>
    </Button>
  );
}
