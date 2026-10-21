"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main>
      <h1>Something went wrong</h1>
      <p>Linkshelf could not load this page. Your links are safe.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
