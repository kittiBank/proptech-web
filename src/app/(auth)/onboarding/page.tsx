import { Suspense } from "react";
import type { Metadata } from "next";
import { OnboardingView } from "@/components/auth/onboarding-view";

export const metadata: Metadata = {
  title: "ตั้งค่าบัญชี",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense>
      <OnboardingView />
    </Suspense>
  );
}
