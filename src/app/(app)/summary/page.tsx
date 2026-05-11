"use client";

import { useRouter } from "next/navigation";
import ShiftSummaryScreen from "../../../components/ShiftSummaryScreen";

export default function SummaryPage() {
  const router = useRouter();
  return <ShiftSummaryScreen onNavigate={(tab: string) => router.push(`/${tab}`)} />;
}
