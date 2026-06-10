import Link from "next/link";

interface PRDCardProps {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  onDelete: (id: string) => void;
}

export default function PRDCard({
  id,
  title,
  content,
  createdAt,
  onDelete,
}: PRDCardProps) {
  const snippet = content.replace(/[#*`_~\[\]]/g, "").slice(0, 120);
  const date = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="group neu-raised-sm overflow-hidden">
      <Link href={`/prd/${id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold text-slate-700 line-clamp-1">{title}</h3>
          <span className="text-xs text-slate-400 whitespace-nowrap mt-0.5">
            {date}
          </span>
        </div>
        <p className="text-sm text-slate-500 line-clamp-2">{snippet}...</p>
      </Link>
      <div className="border-t border-[#c8ccd0]/50 px-5 py-2.5 flex justify-end">
        <button
          onClick={(e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to delete this PRD?")) {
              onDelete(id);
            }
          }}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 px-3 py-1 rounded-lg"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
