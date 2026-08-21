type OnboardingStepsProps = {
  current: "year" | "classes" | "schedule" | "review";
};

const steps = [
  { key: "year", label: "Year details" },
  { key: "classes", label: "Classes" },
  { key: "schedule", label: "Bell schedule" },
  { key: "review", label: "Review" },
] as const;

export function OnboardingSteps({ current }: OnboardingStepsProps) {
  const currentIndex = steps.findIndex((step) => step.key === current);

  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
      {steps.map((step, index) => (
        <li className="flex items-center gap-2" key={step.key}>
          <span
            className={[
              "flex size-5 items-center justify-center rounded-full",
              index === currentIndex
                ? "bg-blue-600 text-white"
                : index < currentIndex
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-500",
            ].join(" ")}
          >
            {index + 1}
          </span>
          <span className={index === currentIndex ? "text-slate-950" : undefined}>
            {step.label}
          </span>
          {index < steps.length - 1 ? <span className="text-slate-300">→</span> : null}
        </li>
      ))}
    </ol>
  );
}
