import { CreateMcpTokenForm } from "./CreateMcpTokenForm";

type ServerAction = (formData: FormData) => void | Promise<void>;

export type McpTokenSummaryProps = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type McpTokensPageProps = {
  tokens: McpTokenSummaryProps[];
  revokeTokenAction: ServerAction;
  mcpUrl: string;
};

export function McpTokensPage({ tokens, revokeTokenAction, mcpUrl }: McpTokensPageProps) {
  const activeTokens = tokens.filter((token) => !token.revokedAt);
  const revokedTokens = tokens.filter((token) => token.revokedAt);

  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">Settings</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">MCP tokens.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Connect an AI client (Claude Code, Claude Desktop, ChatGPT) to your own planner data.
          Each token is personal — it only ever reaches the data on your account, and creating one
          doesn&apos;t give anyone access to another account&apos;s classes or students.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Server URL: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{mcpUrl}</code>
          {" — "}send the token in the <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">x-classpilot-mcp-key</code> header.
        </p>
      </section>

      <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Create a token</h3>
        <div className="mt-3">
          <CreateMcpTokenForm />
        </div>
      </section>

      <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Active tokens</h3>
        {activeTokens.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No active tokens yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {activeTokens.map((token) => (
              <li className="flex items-center justify-between gap-3 py-2 text-sm" key={token.id}>
                <div>
                  <p className="font-medium text-slate-950">{token.label}</p>
                  <p className="text-xs text-slate-500">
                    Created {new Date(token.createdAt).toLocaleDateString()}
                    {token.lastUsedAt
                      ? ` · Last used ${new Date(token.lastUsedAt).toLocaleDateString()}`
                      : " · Never used"}
                  </p>
                </div>
                <form action={revokeTokenAction}>
                  <input name="id" type="hidden" value={token.id} />
                  <button
                    className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 shadow-sm hover:bg-rose-50"
                    type="submit"
                  >
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {revokedTokens.length > 0 ? (
        <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-950">Revoked tokens</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {revokedTokens.map((token) => (
              <li className="py-2 text-sm text-slate-400" key={token.id}>
                {token.label} — revoked {new Date(token.revokedAt as string).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
