import { login } from "./actions";

type SearchParams = Promise<{ next?: string | string[]; error?: string | string[] }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next, error } = await searchParams;

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
      {error && <p role="alert">Wrong password</p>}
    </main>
  );
}
