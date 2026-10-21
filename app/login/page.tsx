import { login } from "./actions";

type SearchParams = Promise<{
  next?: string | string[];
  error?: string | string[];
  minutes?: string | string[];
}>;

function errorMessage(error: unknown, minutes: unknown): string | null {
  if (error === "limited") {
    const n = typeof minutes === "string" && /^\d{1,2}$/.test(minutes) ? Number(minutes) : 15;
    return `Too many attempts. Try again in ${n} ${n === 1 ? "minute" : "minutes"}.`;
  }
  return error ? "Wrong password" : null;
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next, error, minutes } = await searchParams;
  const message = errorMessage(error, minutes);

  return (
    <main>
      <h1>Sign in</h1>
      <form action={login}>
        <input type="hidden" name="next" value={typeof next === "string" ? next : "/"} />
        <label>
          Password <input type="password" name="password" required autoFocus />
        </label>
        <button type="submit">Sign in</button>
      </form>
      {message && <p role="alert">{message}</p>}
    </main>
  );
}
