import type { Metadata } from "next";
import StatusPage from "@/components/StatusPage";

export const metadata: Metadata = {
  title: "Status — Lingo",
  description: "Share a moment and see what's new with your contacts.",
};

export default function Page() {
  return <StatusPage />;
}
