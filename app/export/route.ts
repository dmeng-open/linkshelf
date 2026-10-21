import { allLinksOldestFirst } from "@/db/links";
import { bookmarkLine, bookmarksFooter, bookmarksHeader } from "@/lib/bookmarks";
import { hasSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasSession())) return new Response("Sign in to export", { status: 401 });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(bookmarksHeader()));
      for await (const batch of allLinksOldestFirst()) {
        controller.enqueue(encoder.encode(batch.map(bookmarkLine).join("")));
      }
      controller.enqueue(encoder.encode(bookmarksFooter));
      controller.close();
    },
  });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="linkshelf-${date}.html"`,
    },
  });
}
