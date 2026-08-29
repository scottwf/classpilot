import { redirect } from "next/navigation";
import { isAuthenticated } from "@/src/lib/auth/server";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await isAuthenticated()) {
    redirect("/");
  }

  const params = await searchParams;
  const hasError = params.error === "1";
  const isLocked = params.error === "locked";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-blue-600 text-lg font-semibold text-white">
            C
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              ClassPilot
            </h1>
            <p className="text-sm text-slate-600">
              Private Grade 6 planning workspace
            </p>
          </div>
        </div>

        {/* Plain POST navigation, not a Server Action -- see
            app/login/submit/route.ts for why. */}
        <form action="/login/submit" className="mt-6 space-y-4" method="post">
          <div>
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="username"
            >
              Username
            </label>
            <input
              autoComplete="username"
              autoFocus
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              id="username"
              name="username"
              required
              type="text"
            />
          </div>

          <div>
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="password"
            >
              Password
            </label>
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              id="password"
              name="password"
              required
              type="password"
            />
          </div>

          {hasError ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              That username and password did not match.
            </p>
          ) : null}

          {isLocked ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Too many failed attempts for that username. Try again in a few
              minutes.
            </p>
          ) : null}

          <button
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            type="submit"
          >
            Sign in
          </button>
        </form>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Set `CLASSPILOT_APP_PASSWORD` and `CLASSPILOT_AUTH_SECRET` before
          entering real student information. Default username is `teacher`
          unless `CLASSPILOT_APP_USERNAME` is set.
        </p>
      </section>
    </main>
  );
}
