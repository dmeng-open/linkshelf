import Link from "next/link";
import { listHref, PAGE_SIZE, type ListQuery } from "@/lib/list-query";

export function Pager({ tag, page, state, total }: ListQuery & { total: number }) {
  const last = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (page > last) {
    return (
      <nav aria-label="Pages">
        Page {page} does not exist. <Link href={listHref({ tag, state, page: last })}>Go to page {last}</Link>
      </nav>
    );
  }
  if (total <= PAGE_SIZE) return null;

  return (
    <nav aria-label="Pages">
      {page > 1 && <Link href={listHref({ tag, state, page: page - 1 })}>Previous</Link>} Page {page} of {last}{" "}
      {page < last && <Link href={listHref({ tag, state, page: page + 1 })}>Next</Link>}
    </nav>
  );
}
