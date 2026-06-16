import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  totalItems,
  limit = 20,
  itemLabel = "kết quả"
}) {
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalItems || 0);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      {/* Mobile view */}
      <div className="flex flex-1 items-center justify-between sm:hidden">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg font-['Roboto']"
          disabled={currentPage === 1 || loading}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Trước
        </Button>
        <span className="font-['Roboto'] text-sm text-muted-foreground">
          Trang {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg font-['Roboto']"
          disabled={currentPage === totalPages || loading}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Sau
        </Button>
      </div>

      {/* Desktop view */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          {totalItems !== undefined && (
            <p className="font-['Roboto'] text-sm text-muted-foreground">
              Hiển thị{" "}
              <span className="font-medium text-foreground">{startItem}</span> –{" "}
              <span className="font-medium text-foreground">{endItem}</span>{" "}
              trong tổng{" "}
              <span className="font-medium text-foreground">{totalItems}</span>{" "}
              {itemLabel}
            </p>
          )}
        </div>
        <nav className="flex items-center gap-1.5" aria-label="Phân trang">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-lg border-muted hover:bg-muted/50"
            disabled={currentPage === 1 || loading}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Trang trước"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <div className="flex h-9 items-center justify-center rounded-lg border border-muted bg-background px-4 font-['Roboto'] text-sm font-medium text-foreground min-w-[5.5rem] shadow-sm">
            Trang {currentPage} / {totalPages}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-lg border-muted hover:bg-muted/50"
            disabled={currentPage === totalPages || loading}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Trang sau"
          >
            <ChevronRight className="size-4" />
          </Button>
        </nav>
      </div>
    </div>
  );
}
export default Pagination;
