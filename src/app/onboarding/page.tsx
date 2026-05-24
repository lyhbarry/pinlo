"use client";

import { useState, useTransition } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEMPLATE_LIST, type TemplateId } from "@/lib/templates";
import { selectTemplate } from "@/app/actions/onboarding";

export default function OnboardingPage() {
  const [selected, setSelected] = useState<TemplateId | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSelect(id: TemplateId) {
    if (pending) return;
    setSelected(id);
    startTransition(async () => {
      await selectTemplate(id);
    });
  }

  function handleSkip() {
    handleSelect("generic_crm");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">P</span>
            </div>
            <span className="font-bold text-foreground">Pinlo</span>
          </div>
          <button
            onClick={handleSkip}
            disabled={pending}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Choose your workspace template
            </h1>
            <p className="text-muted-foreground">
              We'll set up your pipeline stages and quick replies based on your industry.
            </p>
          </div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATE_LIST.map((template) => {
              const isSelected = selected === template.id;
              const isLoading = isSelected && pending;

              return (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template.id)}
                  disabled={pending}
                  className={cn(
                    "relative text-left rounded-xl border-2 p-5 transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  {template.popular && (
                    <div className="absolute -top-2.5 left-4">
                      <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="absolute top-4 right-4">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : isSelected ? (
                      <CheckCircle className="w-4 h-4 text-primary" />
                    ) : null}
                  </div>

                  <div className="text-3xl mb-3">{template.emoji}</div>
                  <h3 className="font-semibold text-foreground mb-1">{template.label}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{template.description}</p>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Pipeline stages
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.stages.slice(0, 4).map((stage) => (
                        <span key={stage} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                          {stage}
                        </span>
                      ))}
                      {template.stages.length > 4 && (
                        <span className="text-xs text-muted-foreground px-1">
                          +{template.stages.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Not sure?{" "}
            <button
              onClick={() => handleSelect("generic_crm")}
              disabled={pending}
              className="text-primary hover:underline font-medium disabled:opacity-50"
            >
              Start with Generic CRM
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
