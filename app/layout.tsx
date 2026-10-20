import type { Metadata } from "next";
import { logout } from "./login/actions";
import { hasSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Linkshelf",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {(await hasSession()) && (
          <form action={logout}>
            <button type="submit">Sign out</button>
          </form>
        )}
        {children}
      </body>
    </html>
  );
}
