"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X, GripVertical, DollarSign, Loader2, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEMPLATES, type TemplateId } from "@/lib/templates";

// ─── Types ────────────────────────────────────────────────────────────────────

type Contact = { id: string; name: string; phone: string };

type Deal = {
  id: string;
  title: string;
  stageId: string;
  value: number | null;
  notes: string | null;
  createdAt: string;
  contact: Contact | null;
};

type Stage = {
  id: string;
  name: string;
  order: number;
};

type ContactOption = { id: string; name: string; phone: string };

// ─── Stage colors ─────────────────────────────────────────────────────────────

const STAGE_HEADER_COLORS = [
  "bg-gray-100 text-gray-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-green-100 text-green-700",
  "bg-red-100 text-red-700",
];

function stageColor(index: number) {
  return STAGE_HEADER_COLORS[index % STAGE_HEADER_COLORS.length];
}

function formatValue(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `$${v}`;
}

// ─── Deal card (draggable) ────────────────────────────────────────────────────

function DealCard({
  deal,
  isDragging,
  contacts,
  onDelete,
  onEdit,
}: {
  deal: Deal;
  isDragging?: boolean;
  contacts: ContactOption[];
  onDelete: (id: string) => void;
  onEdit: (id: string, patch: { title: string; value: string; contactId: string; notes: string }) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(deal.title);
  const [value, setValue] = useState(deal.value !== null ? String(deal.value) : "");
  const [contactId, setContactId] = useState(deal.contact?.id ?? "");
  const [notes, setNotes] = useState(deal.notes ?? "");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) titleRef.current?.focus(); }, [editing]);

  function openEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setTitle(deal.title);
    setValue(deal.value !== null ? String(deal.value) : "");
    setContactId(deal.contact?.id ?? "");
    setNotes(deal.notes ?? "");
    setEditing(true);
  }

  async function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (!title.trim()) return;
    setSaving(true);
    await onEdit(deal.id, { title: title.trim(), value, contactId, notes });
    setSaving(false);
    setEditing(false);
  }

  function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="bg-background border border-primary/40 rounded-lg p-3 shadow-sm space-y-2 select-none">
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
          placeholder="Deal title…"
          className="w-full text-sm font-medium bg-transparent outline-none border-b border-border pb-1"
        />
        {contacts.length > 0 && (
          <select
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-xs bg-transparent text-muted-foreground outline-none"
          >
            <option value="">No contact</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Value (optional)"
          type="number"
          className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground resize-none"
        />
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="flex-1 bg-primary text-primary-foreground text-xs font-medium py-1.5 rounded-md disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" />Save</>}
          </button>
          <button onClick={handleCancel} className="px-2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "group bg-background border border-border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing select-none",
        isDragging && "opacity-30"
      )}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-muted-foreground/40 shrink-0">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">{deal.title}</p>
          {deal.contact && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{deal.contact.name}</p>
          )}
          {deal.value !== null && (
            <div className="flex items-center gap-0.5 mt-1.5">
              <DollarSign className="w-3 h-3 text-green-600" />
              <span className="text-xs font-medium text-green-600">{formatValue(deal.value)}</span>
            </div>
          )}
          {deal.notes && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{deal.notes}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={openEdit} className="text-muted-foreground hover:text-foreground">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(deal.id); }} className="text-muted-foreground hover:text-destructive">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DealCardOverlay({ deal }: { deal: Deal }) {
  return (
    <div className="bg-background border border-primary/40 rounded-lg p-3 shadow-lg w-52 rotate-2 opacity-95">
      <p className="text-sm font-medium text-foreground">{deal.title}</p>
      {deal.contact && (
        <p className="text-xs text-muted-foreground mt-0.5">{deal.contact.name}</p>
      )}
      {deal.value !== null && (
        <span className="text-xs font-medium text-green-600">{formatValue(deal.value)}</span>
      )}
    </div>
  );
}

// ─── Stage column (droppable) ─────────────────────────────────────────────────

function StageColumn({
  stage,
  deals,
  colorClass,
  isOver,
  activeDealId,
  contacts,
  onAdd,
  onDelete,
  onEdit,
}: {
  stage: Stage;
  deals: Deal[];
  colorClass: string;
  isOver: boolean;
  activeDealId: string | null;
  contacts: ContactOption[];
  onAdd: (stageId: string, title: string, value: string, contactId: string) => Promise<void>;
  onDelete: (id: string) => void;
  onEdit: (id: string, patch: { title: string; value: string; contactId: string; notes: string }) => Promise<void>;
}) {
  const { setNodeRef } = useDroppable({ id: stage.id });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [contactId, setContactId] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function reset() {
    setTitle(""); setValue(""); setContactId(""); setAdding(false);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onAdd(stage.id, title.trim(), value.trim(), contactId);
    setSaving(false);
    reset();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") reset();
  }

  const total = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="flex flex-col w-64 xl:w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", colorClass)}>
            {stage.name}
          </span>
          <span className="text-xs text-muted-foreground font-medium">{deals.length}</span>
        </div>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">{formatValue(total)}</span>
        )}
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 flex flex-col gap-2 rounded-xl p-2 min-h-30 transition-colors",
          isOver ? "bg-primary/5 border-2 border-primary/20 border-dashed" : "bg-muted/30"
        )}
      >
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            isDragging={deal.id === activeDealId}
            contacts={contacts}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}

        {/* Inline add form */}
        {adding ? (
          <div className="bg-background border border-border rounded-lg p-3 space-y-2">
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Deal title…"
              className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
            {contacts.length > 0 && (
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full text-sm bg-transparent text-muted-foreground outline-none"
              >
                <option value="">No contact</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Value (optional)"
              type="number"
              className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!title.trim() || saving}
                className="flex-1 bg-primary text-primary-foreground text-xs font-medium py-1.5 rounded-md disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add deal"}
              </button>
              <button onClick={reset} className="px-2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-1 py-1.5 rounded-md hover:bg-muted/60 transition-colors w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Add deal
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PipelineShell({ previewTemplate }: { previewTemplate?: TemplateId }) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [hoveredStageId, setHoveredStageId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    if (previewTemplate) {
      const tpl = TEMPLATES[previewTemplate];
      setStages(tpl.stages.map((name, order) => ({ id: name, name, order })));
      setDeals([]);
      setLoading(false);
      return;
    }

    Promise.all([
      fetch("/api/pipeline").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch("/api/contacts").then((r) => { if (!r.ok) return []; return r.json(); }),
    ])
      .then(([pipeline, contactList]) => {
        setStages(pipeline.stages);
        setDeals(pipeline.deals);
        setContacts(contactList.map((c: ContactOption) => ({ id: c.id, name: c.name, phone: c.phone })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [previewTemplate]);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveDealId(active.id as string);
  }

  function handleDragOver({ over }: DragOverEvent) {
    setHoveredStageId(over ? (over.id as string) : null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveDealId(null);
    setHoveredStageId(null);

    if (!over) return;
    const deal = deals.find((d) => d.id === active.id);
    const newStageId = over.id as string;
    if (!deal || deal.stageId === newStageId) return;

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) => (d.id === deal.id ? { ...d, stageId: newStageId } : d))
    );

    fetch(`/api/pipeline/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId: newStageId }),
    });
  }

  async function handleAddDeal(stageId: string, title: string, value: string, contactId: string) {
    if (previewTemplate) return;
    const res = await fetch("/api/pipeline/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId, title, value: value || undefined, contactId: contactId || undefined }),
    });
    if (!res.ok) return;
    const deal: Deal = await res.json();
    setDeals((prev) => [...prev, deal]);
  }

  function handleDeleteDeal(id: string) {
    if (previewTemplate) return;
    setDeals((prev) => prev.filter((d) => d.id !== id));
    fetch(`/api/pipeline/deals/${id}`, { method: "DELETE" });
  }

  async function handleEditDeal(id: string, patch: { title: string; value: string; contactId: string; notes: string }) {
    if (previewTemplate) return;
    const res = await fetch(`/api/pipeline/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: patch.title,
        value: patch.value || null,
        contactId: patch.contactId || null,
        notes: patch.notes || null,
      }),
    });
    if (!res.ok) return;
    const updated: Deal = await res.json();
    setDeals((prev) => prev.map((d) => (d.id === id ? updated : d)));
  }

  const activeDeal = deals.find((d) => d.id === activeDealId);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-64 xl:w-72 shrink-0 space-y-2">
            <div className="h-6 w-24 bg-muted rounded-full animate-pulse" />
            <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-xl text-center gap-3">
        <p className="font-medium text-foreground">No pipeline stages found</p>
        <p className="text-sm text-muted-foreground">
          Complete onboarding to set up your pipeline stages.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage, i) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            deals={deals.filter((d) => d.stageId === stage.id)}
            colorClass={stageColor(i)}
            isOver={hoveredStageId === stage.id}
            activeDealId={activeDealId}
            contacts={contacts}
            onAdd={handleAddDeal}
            onDelete={handleDeleteDeal}
            onEdit={handleEditDeal}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDeal ? <DealCardOverlay deal={activeDeal} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
