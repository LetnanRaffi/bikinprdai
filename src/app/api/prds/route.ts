import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: prds, error } = await supabase
    .from("prds")
    .select("id, title, content, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch PRDs:", error);
    return NextResponse.json({ error: "Failed to fetch PRDs" }, { status: 500 });
  }

  return NextResponse.json({ prds: prds ?? [] });
}
