type ServerAction = (formData: FormData) => void | Promise<void>;

export type AccountSummary = {
  id: string;
  username: string;
  createdAt: string;
};

type AccountSettingsPageProps = {
  currentUsername: string;
  users: AccountSummary[];
  createAccountAction: ServerAction;
  created?: boolean;
  error?: string;
  errorMessage?: string;
};

export function AccountSettingsPage({
  currentUsername,
  users,
  createAccountAction,
  created,
  errorMessage,
}: AccountSettingsPageProps) {
  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">Settings</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">Accounts.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          You&apos;re signed in as <span className="font-medium text-slate-950">{currentUsername}</span>.
          Create an account for another teacher to share this ClassPilot instance — each account&apos;s
          school years, classes, units, lessons, students, and schedule are completely separate.
          There&apos;s no self-service signup; accounts are only created here by someone already
          signed in.
        </p>
      </section>

      {created ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Account created. Share the username and password with them directly — there&apos;s no
          email invite flow yet.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Existing accounts</h3>
        <ul className="mt-3 divide-y divide-slate-100">
          {users.map((user) => (
            <li className="flex items-center justify-between gap-3 py-2 text-sm" key={user.id}>
              <span className="font-medium text-slate-950">{user.username}</span>
              <span className="text-xs text-slate-500">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Create an account</h3>
        <form action={createAccountAction} className="mt-3 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Username</span>
            <input
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              minLength={3}
              maxLength={32}
              name="username"
              pattern="[a-zA-Z0-9_.\-]{3,32}"
              required
              title="3-32 characters: letters, numbers, . _ -"
              type="text"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Password</span>
            <input
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Confirm password</span>
            <input
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              minLength={8}
              name="confirmPassword"
              required
              type="password"
            />
          </label>

          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            type="submit"
          >
            Create account
          </button>
        </form>
      </section>
    </>
  );
}
