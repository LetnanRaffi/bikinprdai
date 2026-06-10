import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import PRDViewer from "./PRDViewer";

export const dynamic = "force-dynamic";

interface PRDPageProps {
  params: Promise<{ id: string }>;
}

export default async function PRDPage({ params }: PRDPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: prd, error } = await supabase
    .from("prds")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !prd) {
    redirect("/");
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <PRDViewer
          prd={{
            id: prd.id,
            title: prd.title,
            content: prd.content,
          }}
        />
      </main>
    </>
  );
}
