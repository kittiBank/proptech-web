import { Suspense } from "react";
import { LoginModal } from "@/components/auth/login-modal";

/**
 * `/login` opened from a site page (header link or a gated action) shows the
 * B5 modal over that page; a direct visit or refresh gets the full page.
 */
export default function InterceptedLogin() {
  return (
    <Suspense>
      <LoginModal />
    </Suspense>
  );
}
