import { PaginationHook } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({ state }: { state: PaginationHook<unknown> }) => {
  if (state.pages <= 1) {
    return;
  }
  return (
    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
      <button
        onClick={() => state.setPage(Math.max(0, state.data.page - 1))}
        disabled={state.data.page === 0}
        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="text-[10px] text-muted-foreground font-mono">
        {state.data.page + 1} / {state.pages}
      </span>
      <button
        onClick={() =>
          state.setPage(Math.min(state.pages - 1, state.data.page + 1))
        }
        disabled={state.data.page >= state.pages - 1}
        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default Pagination;
