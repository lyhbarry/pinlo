"use client";

import { useState } from "react";
import { PipelineShell } from "@/components/pipeline/pipeline-shell";
import { TEMPLATE_LIST, type TemplateId } from "@/lib/templates";
import { cn } from "@/lib/utils";

type View = "live" | TemplateId;

export default function PipelinePage() {
  const [view, setView] = useState<View>("live");

  const previewTemplate = view === "live" ? undefined : view;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your deals and customer journey</p>
      </div>

      {/* Template switcher */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        <button
          onClick={() => setView("live")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
            view === "live"
              ? "bg-primary text-primary-foreground border-primary"
              : "text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Live
        </button>

        <span className="text-muted-foreground/40 text-xs select-none">|</span>

        {TEMPLATE_LIST.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => setView(tpl.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
              view === tpl.id
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
            )}
          >
            <span>{tpl.emoji}</span>
            {tpl.label}
          </button>
        ))}
      </div>

      {view !== "live" && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
            Preview mode — showing {TEMPLATE_LIST.find((t) => t.id === view)?.label} stages. Switch to Live to manage real deals.
          </span>
        </div>
      )}

      <PipelineShell previewTemplate={previewTemplate} />
    </div>
  );
}
