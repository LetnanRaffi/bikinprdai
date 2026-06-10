import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChatApp from "./ChatApp";

export const dynamic = "force-dynamic";

interface SavedPRD {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: prds } = await supabase
    .from("prds")
    .select("id, title, content, created_at")
    .order("created_at", { ascending: false });

  return <ChatApp prds={(prds as SavedPRD[]) ?? []} user={user} />;
}
