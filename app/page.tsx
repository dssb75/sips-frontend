"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readSession } from "@/services/session";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = readSession();
    if (session?.auth?.access_token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return null;
}