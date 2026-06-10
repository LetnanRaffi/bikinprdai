"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import PRDCard from "@/components/PRDCard";
import { useRouter } from "next/navigation";

interface PRD {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function DashboardClient({ prds }: { prds: PRD[] }) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("prds").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete PRD");
    } else {
      toast.success("PRD deleted");
      router.refresh();
    }
  };

  if (prds.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 neu-raised-sm">
          <svg
            className="w-8 h-8 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-1">No PRDs yet</h3>
        <p className="text-slate-500 mb-6 text-sm">
          Create your first Product Requirements Document with AI
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 neu-btn-primary text-sm font-medium cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Your First PRD
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {prds.map((prd) => (
        <PRDCard
          key={prd.id}
          id={prd.id}
          title={prd.title}
          content={prd.content}
          createdAt={prd.created_at}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
