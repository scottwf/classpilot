import { AppShell } from "@/src/features/planner/AppShell";
import { OnboardingCalendarStep } from "@/src/features/planner/OnboardingCalendarStep";
import { OnboardingSteps } from "@/src/features/planner/OnboardingSteps";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { createOnboardingYearAction } from "./actions";

type OnboardingPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export const dynamic = "force-dynamic";

export default async function OnboardingRoute({ searchParams }: OnboardingPageProps) {
  const userId = await requireAuth();

  const plannerData = getClassPilotPlannerData(userId);
  const params = await searchParams;

  return (
    <AppShell activePage="onboarding" data={plannerData}>
      <OnboardingSteps current="year" />

      <section>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Start a new school year
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Classes, units, lessons, periods, and schedules all start fresh for
          a new year. Your existing years and their data stay exactly as
          they are — switch back anytime from the Calendar page. Click a day
          on the calendar below to mark holidays, PD days, and other
          non-instructional days once you&apos;ve set your dates.
        </p>
      </section>

      <OnboardingCalendarStep
        action={createOnboardingYearAction}
        error={
          params.error
            ? "Check the title, that the end date is after the start date, and that the cycle length is a whole number of at least 1."
            : undefined
        }
      />
    </AppShell>
  );
}
