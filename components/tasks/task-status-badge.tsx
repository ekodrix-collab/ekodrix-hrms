import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  done: {
    label: "Completed",
    className: "bg-green-500 text-white border-none font-black text-[10px] uppercase tracking-widest",
  },
  review: {
    label: "In Review",
    className: "bg-purple-500 text-white border-none font-black text-[10px] uppercase tracking-widest",
  },
  in_progress: {
    label: "Working",
    className: "bg-amber-500 text-white border-none font-black text-[10px] uppercase tracking-widest",
  },
  todo: {
    label: "Todo",
    className: "font-black text-[10px] uppercase tracking-widest",
  },
};

export function TaskStatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.todo;
  return (
    <Badge
      variant={status === "todo" ? "outline" : undefined}
      className={cfg.className}
    >
      {cfg.label}
    </Badge>
  );
}
