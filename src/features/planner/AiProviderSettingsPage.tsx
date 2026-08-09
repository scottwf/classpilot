import { HostedProviderFields } from "./HostedProviderFields";
import { LocalProviderFields } from "./LocalProviderFields";
import { SettingsTabs } from "./SettingsTabs";

type ServerAction = (formData: FormData) => void | Promise<void>;

type AiProviderSettingsPageProps = {
  aiConfigured: boolean;
  aiApiKeySet: boolean;
  aiBaseUrl: string;
  aiModel: string;
  aiLocalConfigured: boolean;
  aiLocalBaseUrl: string;
  aiLocalModel: string;
  clearApiKeyAction: ServerAction;
  saved?: string;
  updateAction: ServerAction;
};

export function AiProviderSettingsPage({
  aiConfigured,
  aiApiKeySet,
  aiBaseUrl,
  aiModel,
  aiLocalConfigured,
  aiLocalBaseUrl,
  aiLocalModel,
  clearApiKeyAction,
  saved,
  updateAction,
}: AiProviderSettingsPageProps) {
  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">Settings</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">AI providers.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          The assistant uses two separate providers. The hosted provider
          drafts content — unit outlines, lesson sections, lesson resources —
          and never sees student data. The local model drives the assistant
          chat&apos;s tool-calling and is the only one ever given access to
          student records, so they stay on your network.
        </p>
      </section>

      <SettingsTabs active="ai" />

      {saved !== undefined ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Settings saved.
        </div>
      ) : null}

      <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form action={updateAction} className="space-y-6">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">
                Hosted provider (content generation)
              </h3>
              <span
                className={[
                  "rounded-md px-2 py-1 text-xs font-medium",
                  aiConfigured
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700",
                ].join(" ")}
              >
                {aiConfigured ? "Configured" : "Not configured"}
              </span>
            </div>

            <div className="mt-3">
              <HostedProviderFields
                aiApiKeySet={aiApiKeySet}
                aiBaseUrl={aiBaseUrl}
                aiModel={aiModel}
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">
                Local model (assistant chat + student records)
              </h3>
              <span
                className={[
                  "rounded-md px-2 py-1 text-xs font-medium",
                  aiLocalConfigured
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700",
                ].join(" ")}
              >
                {aiLocalConfigured ? "Configured" : "Not configured"}
              </span>
            </div>

            <div className="mt-3">
              <LocalProviderFields aiLocalBaseUrl={aiLocalBaseUrl} aiLocalModel={aiLocalModel} />
            </div>
          </div>

          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            type="submit"
          >
            Save settings
          </button>
        </form>

        {aiApiKeySet ? (
          <form action={clearApiKeyAction} className="mt-3">
            <button
              className="text-xs font-medium text-slate-400 hover:text-rose-600"
              type="submit"
            >
              Clear hosted API key
            </button>
          </form>
        ) : null}
      </section>
    </>
  );
}
