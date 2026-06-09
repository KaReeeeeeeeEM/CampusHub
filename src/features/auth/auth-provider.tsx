"use client";

import { createContext, useContext, useEffect, useMemo } from "react";

import { authClient } from "@/lib/auth/client";
import { useUserStore } from "@/store/user-store";
import type { AuthUser } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isPending: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isPending: true
});

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const session = authClient.useSession();
  const storedUser = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    const sessionUser = session.data?.user;

    if (!sessionUser) {
      setUser(null);
      return;
    }

    setUser({
      id: sessionUser.id,
      name: sessionUser.name ?? null,
      email: sessionUser.email,
      image: sessionUser.image,
      role: "STUDENT",
      roles: ["STUDENT"],
      universityId: null
    });
  }, [session.data?.user, setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: storedUser,
      isAuthenticated: Boolean(storedUser),
      isPending: session.isPending
    }),
    [session.isPending, storedUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
