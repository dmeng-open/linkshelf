import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>
        <Link href="/">Back to your shelf</Link>
      </p>
    </main>
  );
}
