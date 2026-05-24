"use client";

import { PipelineShell } from "@/components/pipeline/pipeline-shell";

export default function PipelinePage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your deals and customer journey</p>
      </div>

      <PipelineShell />
    </div>
  );
}
