"use client";

import { LogIn, LogOut, ShieldUser, User } from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/lib/session-provider";

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

  const handleSignOut = () => {
    onNavigate?.();

    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
      },
    });
  };

  // AUTHENTICATED

  if (session && user) {
    // MOBILE
    if (mobile) {
      return (
        <div className="flex flex-col gap-3">
          {/* Admin */}
          {user.role === "admin" && (
            <Button
              asChild
              size="sm"
              className="w-full justify-start gap-2 bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20"
            >
              <Link href="/admin" onClick={onNavigate}>
                <ShieldUser className="h-4 w-4" />
                {t("auth.admin")}
              </Link>
            </Button>
          )}

          {/* Profile */}
          <Button
            asChild
            size="sm"
            className="w-full justify-start gap-2 bg-foreground/10 text-accent hover:bg-accent/80 border border-accent/20"
          >
            <Link href="/user" onClick={onNavigate}>
              <User className="h-4 w-4" />
              {t("auth.profileAndBook")}
            </Link>
          </Button>

          {/* Logout */}
          <Button
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start gap-2 bg-card text-foreground border border-border hover:bg-muted shadow-sm"
          >
            <LogOut className="h-4 w-4" />
            {t("auth.signOut")}
          </Button>
        </div>
      );
    }

    // DESKTOP
    return (
      <div className="flex items-center gap-2">
        {/* Profile */}
        <Button
          asChild
          size="sm"
          className="
            gap-2
            bg-foreground/10
            text-accent
            hover:bg-accent/80
            border border-accent/20
          "
        >
          <Link href="/user" onClick={onNavigate}>
            <User className="h-4 w-4" />
            {t("auth.profileAndBook")}
          </Link>
        </Button>

        {/* Admin */}
        {user.role === "admin" && (
          <Button
            asChild
            size="sm"
            className="
              gap-2
              bg-brand/10
              text-brand
              border border-brand/20
              hover:bg-brand/20
            "
          >
            <Link href="/admin" onClick={onNavigate}>
              <ShieldUser className="h-4 w-4" />
              {t("auth.admin")}
            </Link>
          </Button>
        )}

        {/* Logout */}
        <Button
          size="sm"
          onClick={handleSignOut}
          className="
            gap-2
            bg-card
            text-foreground
            border border-border
            hover:bg-muted
            shadow-sm
          "
        >
          <LogOut className="h-4 w-4" />
          {t("auth.signOut")}
        </Button>
      </div>
    );
  }

  // NOT AUTHENTICATED

  if (mobile) {
    return (
      <Button
        asChild
        className="
          w-full
          justify-center
          gap-2
          bg-brand
          text-white
          hover:bg-brand-light
        "
      >
        <Link href="/signin" onClick={onNavigate}>
          <LogIn className="h-4 w-4" />
          {t("auth.signIn")}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      asChild
      size="sm"
      className="
        gap-2
        bg-brand
        text-white
        hover:bg-brand-light
      "
    >
      <Link href="/signin" onClick={onNavigate}>
        <LogIn className="h-4 w-4" />
        {t("auth.signIn")}
      </Link>
    </Button>
  );
}
