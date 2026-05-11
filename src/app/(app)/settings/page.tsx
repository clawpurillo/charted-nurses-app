"use client";

import { useRouter } from "next/navigation";
import SettingsScreen from "../../../components/SettingsScreen";

export default function SettingsPage() {
  const router = useRouter();
  return <SettingsScreen onNavigate={(screen: string) => {
    if (screen === "history") router.push("/history");
  }} />;
}
