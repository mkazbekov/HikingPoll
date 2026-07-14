"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Lock,
  LogOut,
  MapPin,
  MapPinned,
  Settings2,
  Trash2,
  Users,
  Plus,
  Save,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import type { Destination, EventSettings, Participant, PickupPoint, PollData, TransportMode } from "@/lib/types";
import {
  Button,
  Card,
  Field,
  inputClass,
  Segmented,
  Badge,
  ConfirmDialog,
  ThemeToggle,
  ToastProvider,
  useToast,
  cn,
} from "./ui";
import { MountainMark } from "./MountainMark";
import { TRANSPORT_META, TRANSPORT_ORDER, sortModes } from "./ParticipantList";

type Tab = "responses" | "destinations" | "pickups" | "event";
type AdminData = PollData & { isAdmin: boolean };

export function AdminDashboard() {
  return (
    <ToastProvider>
      <AdminInner />
    </ToastProvider>
  );
}

function AdminInner() {
  const toast = useToast();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<Tab>("responses");

  const load = useCallback(async () => {
    const res = await fetch("/api/event", { cache: "no-store" });
    const json = (await res.json()) as AdminData;
    setData(json);
    return json;
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setAuthError("Incorrect password. Please try again.");
        return;
      }
      setPassword("");
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    await load();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="h-56 animate-pulse rounded-[var(--radius-xl)] bg-[var(--surface-2)]" />
      </div>
    );
  }

  if (!data?.isAdmin) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          <ArrowLeft className="size-4" /> Back to the poll
        </Link>
        <Card className="p-6 sm:p-8">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Lock className="size-6" />
          </span>
          <h1 className="text-center text-xl font-semibold text-[var(--fg)]">Organizer sign-in</h1>
          <p className="mt-1.5 text-center text-sm text-[var(--fg-muted)]">
            Enter the admin password to manage responses and settings.
          </p>
          <form className="mt-5" onSubmit={login}>
            <Field label="Admin password" htmlFor="pw" required>
              <input
                id="pw"
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
              />
            </Field>
            {authError && (
              <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
                {authError}
              </p>
            )}
            <Button type="submit" size="lg" className="mt-4 w-full" loading={submitting} disabled={!password}>
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2.5">
          <MountainMark className="size-9" />
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-[var(--fg)]">
              Admin <Badge tone="primary" icon={<ShieldCheck className="size-3.5" />}>Organizer</Badge>
            </div>
            <div className="text-xs text-[var(--fg-subtle)]">Manage the hike poll</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex h-10 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
          >
            <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Poll</span>
          </Link>
          <Button variant="ghost" size="sm" icon={<LogOut className="size-4" />} onClick={logout}>
            <span className="hidden sm:inline">Sign out</span>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="mb-6 overflow-x-auto">
        <Segmented<Tab>
          ariaLabel="Admin sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: "responses", label: "Responses", icon: <Users className="size-4" /> },
            { value: "destinations", label: "Destinations", icon: <MapPin className="size-4" /> },
            { value: "pickups", label: "Pickups", icon: <MapPinned className="size-4" /> },
            { value: "event", label: "Settings", icon: <Settings2 className="size-4" /> },
          ]}
        />
      </div>

      {tab === "responses" && <ResponsesPanel data={data} reload={load} toast={toast} />}
      {tab === "destinations" && <DestinationsPanel data={data} reload={load} toast={toast} />}
      {tab === "pickups" && <PickupsPanel data={data} reload={load} toast={toast} />}
      {tab === "event" && <EventPanel event={data.event} reload={load} toast={toast} />}
    </div>
  );
}

type ToastFn = (kind: "success" | "error" | "info", msg: string) => void;

// ── Responses ────────────────────────────────────────────────────────────────────
function ResponsesPanel({ data, reload, toast }: { data: AdminData; reload: () => Promise<AdminData>; toast: ToastFn }) {
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  const del = async (id: number) => {
    setConfirmId(null);
    const res = await fetch(`/api/admin/participants/${id}`, { method: "DELETE" });
    if (res.ok) {
      await reload();
      toast("success", "Response deleted.");
    } else toast("error", "Delete failed.");
  };

  const target = data.participants.find((p) => p.id === confirmId);

  if (data.participants.length === 0) {
    return <EmptyPanel label="No responses yet." />;
  }

  return (
    <div className="space-y-3">
      {data.participants.map((p) => (
        <Card key={p.id} className="p-4">
          {editId === p.id ? (
            <ParticipantEditor
              p={p}
              destinations={data.destinations}
              pickups={data.pickups}
              onDone={async () => {
                setEditId(null);
                await reload();
              }}
              toast={toast}
            />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-[var(--fg)]">{p.name}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--fg-muted)]">
                  <span>
                    {sortModes(p.transportModes)
                      .map((m) => (m === "OTHER" && p.transportOther ? p.transportOther : TRANSPORT_META[m].short))
                      .join(" + ")}
                  </span>
                  {p.transportModes.includes("CAR") && p.passengerSeats != null && (
                    <span>{p.passengerSeats} seats</span>
                  )}
                  <span className="tnum">{p.slots.length} slots</span>
                  <span>
                    {p.destinationIds
                      .map((id) => data.destinations.find((d) => d.id === id)?.name)
                      .filter(Boolean)
                      .join(", ") || "No destination"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditId(p.id)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 className="size-4" />}
                  onClick={() => setConfirmId(p.id)}
                  aria-label={`Delete ${p.name}`}
                />
              </div>
            </div>
          )}
        </Card>
      ))}
      <ConfirmDialog
        open={confirmId != null}
        title="Delete this response?"
        message={`This permanently removes ${target?.name ?? "this"}'s availability and choices.`}
        onConfirm={() => confirmId != null && del(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

function ParticipantEditor({
  p,
  destinations,
  pickups,
  onDone,
  toast,
}: {
  p: Participant;
  destinations: Destination[];
  pickups: PickupPoint[];
  onDone: () => void;
  toast: ToastFn;
}) {
  const [name, setName] = useState(p.name);
  const [modes, setModes] = useState<TransportMode[]>(p.transportModes);
  const [other, setOther] = useState(p.transportOther ?? "");
  const [seats, setSeats] = useState(p.passengerSeats ?? 0);
  const [destIds, setDestIds] = useState<number[]>(p.destinationIds);
  const [pickId, setPickId] = useState<number | null>(p.pickupPointId);
  const [saving, setSaving] = useState(false);

  const toggleMode = (m: TransportMode) => {
    setModes((prev) => {
      if (prev.includes(m)) return prev.filter((x) => x !== m);
      let next = [...prev, m];
      if (m === "CAR") next = next.filter((x) => x !== "NEEDS_RIDE");
      if (m === "NEEDS_RIDE") next = next.filter((x) => x !== "CAR");
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/participants/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          transportModes: modes,
          transportOther: modes.includes("OTHER") ? other.trim() || null : null,
          passengerSeats: modes.includes("CAR") ? seats : null,
          destinationIds: destIds,
          pickupPointId: pickId,
        }),
      });
      if (!res.ok) throw new Error();
      toast("success", "Response updated.");
      onDone();
    } catch {
      toast("error", "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Field label="Name" htmlFor={`n-${p.id}`}>
        <input id={`n-${p.id}`} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Transport (select all that apply)">
        <div className="flex flex-wrap gap-2">
          {TRANSPORT_ORDER.map((m) => {
            const active = modes.includes(m);
            return (
              <button
                key={m}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => toggleMode(m)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-2)]",
                )}
              >
                {TRANSPORT_META[m].short}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        {modes.includes("OTHER") && (
          <Field label="Other transport" htmlFor={`o-${p.id}`}>
            <input
              id={`o-${p.id}`}
              className={inputClass}
              value={other}
              onChange={(e) => setOther(e.target.value)}
              maxLength={120}
            />
          </Field>
        )}
        {modes.includes("CAR") && (
          <Field label="Passenger seats">
            <input
              type="number"
              min={0}
              max={8}
              className={inputClass}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
            />
          </Field>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Destination votes (select all that apply)">
          <div className="flex flex-wrap gap-2">
            {destinations.map((d) => {
              const active = destIds.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  role="checkbox"
                  aria-checked={active}
                  onClick={() =>
                    setDestIds((prev) =>
                      prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id],
                    )
                  }
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  {d.name}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Pickup point">
          <select
            className={inputClass}
            value={pickId ?? ""}
            onChange={(e) => setPickId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— none —</option>
            {pickups.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex gap-2">
        <Button size="sm" icon={<Save className="size-4" />} loading={saving} onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Destinations ─────────────────────────────────────────────────────────────────
function DestinationsPanel({ data, reload, toast }: { data: AdminData; reload: () => Promise<AdminData>; toast: ToastFn }) {
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      if (!res.ok) throw new Error();
      setNewName("");
      setNewDesc("");
      await reload();
      toast("success", "Destination added.");
    } catch {
      toast("error", "Could not add.");
    } finally {
      setAdding(false);
    }
  };

  const patch = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/destinations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) await reload();
    else toast("error", "Update failed.");
  };

  const del = async (id: number) => {
    setConfirmId(null);
    const res = await fetch(`/api/admin/destinations/${id}`, { method: "DELETE" });
    if (res.ok) {
      await reload();
      toast("success", "Destination removed.");
    } else toast("error", "Delete failed.");
  };

  return (
    <div className="space-y-3">
      {data.destinations.map((d) => (
        <Card key={d.id} className="p-4">
          <EditableRow
            title={d.name}
            subtitle={d.description}
            badge={
              d.isSuggested ? (
                <Badge tone="accent" icon={<Sparkles className="size-3.5" />}>
                  Suggested
                </Badge>
              ) : d.suggestedBy ? (
                <Badge>by {d.suggestedBy}</Badge>
              ) : undefined
            }
            onSave={(name, description) => patch(d.id, { name, description })}
            onDelete={() => setConfirmId(d.id)}
            extraActions={
              <Button
                size="sm"
                variant={d.isSuggested ? "secondary" : "outline"}
                onClick={() => patch(d.id, { isSuggested: !d.isSuggested })}
              >
                {d.isSuggested ? "Unset suggested" : "Set as suggested"}
              </Button>
            }
          />
        </Card>
      ))}

      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--fg)]">
          <Plus className="size-4" /> Add a destination
        </h3>
        <div className="space-y-3">
          <input className={inputClass} placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input className={inputClass} placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <Button size="sm" loading={adding} disabled={!newName.trim()} onClick={add}>
            Add destination
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmId != null}
        title="Delete this destination?"
        message="Anyone who voted for it will have their vote cleared."
        onConfirm={() => confirmId != null && del(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

// ── Pickups ──────────────────────────────────────────────────────────────────────
function PickupsPanel({ data, reload, toast }: { data: AdminData; reload: () => Promise<AdminData>; toast: ToastFn }) {
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/pickups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc, sortOrder: data.pickups.length }),
      });
      if (!res.ok) throw new Error();
      setNewName("");
      setNewDesc("");
      await reload();
      toast("success", "Pickup point added.");
    } catch {
      toast("error", "Could not add.");
    } finally {
      setAdding(false);
    }
  };

  const patch = async (id: number, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/pickups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) await reload();
    else toast("error", "Update failed.");
  };

  const del = async (id: number) => {
    setConfirmId(null);
    const res = await fetch(`/api/admin/pickups/${id}`, { method: "DELETE" });
    if (res.ok) {
      await reload();
      toast("success", "Pickup point removed.");
    } else toast("error", "Delete failed.");
  };

  return (
    <div className="space-y-3">
      {data.pickups.map((pt) => (
        <Card key={pt.id} className="p-4">
          <EditableRow
            title={pt.name}
            subtitle={pt.description}
            onSave={(name, description) => patch(pt.id, { name, description })}
            onDelete={() => setConfirmId(pt.id)}
          />
        </Card>
      ))}

      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--fg)]">
          <Plus className="size-4" /> Add a pickup point
        </h3>
        <div className="space-y-3">
          <input className={inputClass} placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input className={inputClass} placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <Button size="sm" loading={adding} disabled={!newName.trim()} onClick={add}>
            Add pickup point
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmId != null}
        title="Delete this pickup point?"
        message="It will be removed as an option for everyone."
        onConfirm={() => confirmId != null && del(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

function EditableRow({
  title,
  subtitle,
  badge,
  onSave,
  onDelete,
  extraActions,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onSave: (name: string, description: string) => void;
  onDelete: () => void;
  extraActions?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(title);
  const [desc, setDesc] = useState(subtitle ?? "");

  if (editing) {
    return (
      <div className="space-y-3">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputClass} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              onSave(name, desc);
              setEditing(false);
            }}
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[var(--fg)]">{title}</span>
          {badge}
        </div>
        {subtitle && <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        {extraActions}
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={onDelete} aria-label={`Delete ${title}`} />
      </div>
    </div>
  );
}

// ── Event settings ───────────────────────────────────────────────────────────────
function EventPanel({ event, reload, toast }: { event: EventSettings; reload: () => Promise<AdminData>; toast: ToastFn }) {
  const [form, setForm] = useState(event);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(event), [event]);

  const save = async () => {
    setSaving(true);
    try {
      if (form.dateEnd < form.dateStart) {
        toast("error", "End date can't be before start date.");
        return;
      }
      if (form.dayEndHour <= form.dayStartHour) {
        toast("error", "Day end hour must be after start hour.");
        return;
      }
      const res = await fetch("/api/admin/event", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          dateStart: form.dateStart,
          dateEnd: form.dateEnd,
          dayStartHour: Number(form.dayStartHour),
          dayEndHour: Number(form.dayEndHour),
        }),
      });
      if (!res.ok) throw new Error();
      await reload();
      toast("success", "Settings saved.");
    } catch {
      toast("error", "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const hours = Array.from({ length: 25 }, (_, i) => i);

  return (
    <Card className="p-5 sm:p-6">
      <div className="space-y-4">
        <Field label="Trip title" htmlFor="ev-title" required>
          <input id="ev-title" className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Description" htmlFor="ev-desc">
          <textarea
            id="ev-desc"
            className={cn(inputClass, "h-24 py-2.5")}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Poll starts" htmlFor="ev-start">
            <input id="ev-start" type="date" className={inputClass} value={form.dateStart} onChange={(e) => setForm({ ...form, dateStart: e.target.value })} />
          </Field>
          <Field label="Poll ends" htmlFor="ev-end">
            <input id="ev-end" type="date" className={inputClass} value={form.dateEnd} onChange={(e) => setForm({ ...form, dateEnd: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Earliest hour shown" htmlFor="ev-h1">
            <select id="ev-h1" className={inputClass} value={form.dayStartHour} onChange={(e) => setForm({ ...form, dayStartHour: Number(e.target.value) })}>
              {hours.slice(0, 24).map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
          </Field>
          <Field label="Latest hour shown" htmlFor="ev-h2">
            <select id="ev-h2" className={inputClass} value={form.dayEndHour} onChange={(e) => setForm({ ...form, dayEndHour: Number(e.target.value) })}>
              {hours.slice(1).map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-xs text-[var(--fg-subtle)]">
          Availability is collected in {event.slotMinutes}-minute intervals.
        </p>
        <Button icon={<Save className="size-4" />} loading={saving} onClick={save}>
          Save settings
        </Button>
      </div>
    </Card>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <Card className="p-10 text-center">
      <p className="text-sm text-[var(--fg-muted)]">{label}</p>
    </Card>
  );
}
