"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type Purchase = { id: string; name: string; amount: number; date: string };
type Bucket = { id: string; name: string; amount: number; color: string; purchases: Purchase[] };
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const monthLabel = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
};
const spent = (bucket: Bucket) => bucket.purchases.reduce((sum, item) => sum + item.amount, 0);
const todayFor = (period: string) => `${period}-01`;
const currentPeriod = () => new Date().toISOString().slice(0, 7);

function shiftPeriod(period: string, change: number) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1 + change, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function BucketBook({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [period, setPeriod] = useState(currentPeriod);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [addBucketOpen, setAddBucketOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [bucketToDelete, setBucketToDelete] = useState<Bucket | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const loadBuckets = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/buckets?period=${encodeURIComponent(period)}`, { signal, cache: "no-store" });
      if (response.status === 401) {
        router.push("/sign-in");
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error("Unable to load buckets");
      const data = await response.json() as { buckets: Bucket[] };
      setBuckets(data.buckets);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setToast("Could not load your buckets");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [period, router]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadBuckets(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadBuckets]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visible = buckets.filter((bucket) => {
    const ratio = spent(bucket) / bucket.amount;
    if (filter === "on-track") return ratio < 0.75;
    if (filter === "close") return ratio >= 0.75 && ratio <= 1;
    if (filter === "over") return ratio > 1;
    return true;
  });

  async function addBucket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const amount = Number(form.get("amount"));
    if (!name || amount <= 0) return;
    const response = await fetch("/api/buckets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, amount, period }),
    });
    if (!response.ok) return setToast("Could not add that bucket");
    const payload = await response.json() as { bucket: Bucket };
    setBuckets((current) => [...current, payload.bucket]);
    setAddBucketOpen(false);
    setToast(`${name} bucket added`);
  }

  async function addPurchase(event: FormEvent<HTMLFormElement>, bucketId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("purchase") ?? "").trim();
    const amount = Number(form.get("purchaseAmount"));
    const date = String(form.get("date") ?? todayFor(period));
    if (!name || amount <= 0) return;
    const response = await fetch(`/api/buckets/${encodeURIComponent(bucketId)}/purchases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, amount, date }),
    });
    if (!response.ok) return setToast("Could not add that purchase");
    const payload = await response.json() as { bucket: Bucket };
    setBuckets((current) => current.map((bucket) => bucket.id === bucketId ? payload.bucket : bucket));
    event.currentTarget.reset();
    setToast("Purchase added");
  }

  async function emptyBuckets() {
    const response = await fetch("/api/buckets/empty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period }),
    });
    if (!response.ok) return setToast("Could not empty the buckets");
    setBuckets((current) => current.map((bucket) => ({ ...bucket, purchases: [] })));
    setResetOpen(false);
    setToast(`${monthLabel(period)} purchases cleared`);
  }

  async function removePurchase(bucketId: string, purchaseId: string) {
    const response = await fetch(`/api/buckets/${encodeURIComponent(bucketId)}/purchases/${encodeURIComponent(purchaseId)}`, { method: "DELETE" });
    if (!response.ok) return setToast("Could not remove that purchase");
    const data = await response.json() as { bucket: Bucket };
    setBuckets((current) => current.map((bucket) => bucket.id === bucketId ? data.bucket : bucket));
    setToast("Purchase removed");
  }

  async function deleteBucket() {
    if (!bucketToDelete) return;
    const response = await fetch(`/api/buckets/${encodeURIComponent(bucketToDelete.id)}`, { method: "DELETE" });
    if (!response.ok) return setToast("Could not delete that bucket");
    setBuckets((current) => current.filter((bucket) => bucket.id !== bucketToDelete.id));
    if (expanded === bucketToDelete.id) setExpanded(null);
    setToast(`${bucketToDelete.name} bucket deleted`);
    setBucketToDelete(null);
  }

  function navigate(change: number) {
    setExpanded(null);
    setPeriod((current) => shiftPeriod(current, change));
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="BucketBook home"><span className="brandMark">B</span><span>Bucket<span>Book</span></span></a>
        <div className="topActions">
          <span className="signedInAs" title={userEmail}>{userEmail}</span>
          <button className="button ghost" onClick={() => setResetOpen(true)} disabled={!buckets.length}>↻ <span>Empty buckets</span></button>
          <a className="button dark" href="/api/export">⇩ <span>Export to Excel</span></a>
          <button className="signOutButton" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <div className="page" id="top">
        <section className="workspaceHead">
          <div>
            <p className="eyebrow">Monthly spending plan</p>
            <h1>Your buckets</h1>
            <p className="subtitle">Keep every purchase in its place.</p>
          </div>
          <div className="workspaceActions">
            <div className="monthPicker">
              <button onClick={() => navigate(-1)} aria-label="Previous month">‹</button>
              <strong>{monthLabel(period)}</strong>
              <button onClick={() => navigate(1)} aria-label="Next month">›</button>
            </div>
            <button className="button primary" onClick={() => setAddBucketOpen(true)}>＋ Add a bucket</button>
          </div>
        </section>

        <section className="bucketSection">
          <div className="sectionHead">
            <p>{buckets.length} bucket{buckets.length === 1 ? "" : "s"} · Tap one to view its purchases</p>
            <div className="filters" aria-label="Filter buckets">
              {[["all", "All"], ["on-track", "On track"], ["close", "Close"], ["over", "Over"]].map(([value, label]) => (
                <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="emptyState loadingState"><span>…</span><h3>Loading your buckets</h3></div>
          ) : visible.length ? (
            <div className="bucketGrid">
              {visible.map((bucket) => {
                const used = spent(bucket);
                const ratio = used / bucket.amount;
                const over = ratio > 1;
                const isOpen = expanded === bucket.id;
                return (
                  <article className={`bucketCard ${isOpen ? "open" : ""}`} key={bucket.id} style={{ "--accent": bucket.color } as React.CSSProperties}>
                    <button className="bucketTop" onClick={() => setExpanded(isOpen ? null : bucket.id)} aria-expanded={isOpen}>
                      <span className="bucketIcon">{bucket.name.slice(0, 1).toUpperCase()}</span>
                      <span className="bucketName"><strong>{bucket.name}</strong><small>{bucket.purchases.length} purchase{bucket.purchases.length === 1 ? "" : "s"}</small></span>
                      <span className="chevron">{isOpen ? "−" : "+"}</span>
                    </button>
                    <div className="amountLine"><strong>{money.format(used)}</strong><span>of {money.format(bucket.amount)}</span></div>
                    <div className={`track ${over ? "over" : ""}`}><span style={{ width: `${Math.min(ratio * 100, 100)}%` }} /></div>
                    <div className={`status ${over ? "over" : ratio >= .75 ? "close" : ""}`}>
                      <span>{over ? `${money.format(used - bucket.amount)} over` : `${money.format(bucket.amount - used)} left`}</span>
                      <strong>{Math.round(ratio * 100)}%</strong>
                    </div>

                    {isOpen && (
                      <div className="bucketDetails">
                        <div className="purchaseList">
                          {bucket.purchases.length ? bucket.purchases.slice().reverse().map((item) => (
                            <div className="purchaseRow" key={item.id}>
                              <span className="purchaseDot" />
                              <span><strong>{item.name}</strong><small>{new Date(`${item.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</small></span>
                              <b>{money.format(item.amount)}</b>
                              <button onClick={() => removePurchase(bucket.id, item.id)} aria-label={`Remove ${item.name}`}>×</button>
                            </div>
                          )) : <p className="emptyPurchases">No purchases yet. Add the first one below.</p>}
                        </div>
                        <form className="purchaseForm" onSubmit={(event) => addPurchase(event, bucket.id)}>
                          <label>Purchase<input name="purchase" placeholder="e.g. Grocery run" required /></label>
                          <label>Amount<div className="moneyInput"><span>$</span><input name="purchaseAmount" type="number" min="0.01" step="0.01" placeholder="0.00" required /></div></label>
                          <label>Date<input name="date" type="date" defaultValue={todayFor(period)} min={`${period}-01`} max={`${period}-31`} required /></label>
                          <button className="button small" type="submit">Add</button>
                        </form>
                        <div className="bucketDangerZone">
                          <button onClick={() => setBucketToDelete(bucket)}>Delete bucket</button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              <button className="newBucketCard" onClick={() => setAddBucketOpen(true)}><span>＋</span><strong>Add another bucket</strong><small>Create a new spending category</small></button>
            </div>
          ) : (
            <div className="emptyState"><span>＋</span><h3>{buckets.length ? "No buckets match this filter" : `Start planning ${monthLabel(period)}`}</h3><p>{buckets.length ? "Try a different view above." : "Create a bucket for anything you want to keep an eye on."}</p>{!buckets.length && <button className="button primary" onClick={() => setAddBucketOpen(true)}>Add your first bucket</button>}</div>
          )}
        </section>
      </div>

      {addBucketOpen && (
        <div className="modalBackdrop" onMouseDown={(event) => event.currentTarget === event.target && setAddBucketOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="bucket-modal-title">
            <button className="modalClose" onClick={() => setAddBucketOpen(false)} aria-label="Close">×</button>
            <span className="modalIcon">＋</span><p className="eyebrow">New spending category</p><h2 id="bucket-modal-title">Add a bucket</h2><p>Give this bucket a clear name and decide how much it should hold.</p>
            <form onSubmit={addBucket}>
              <label>Bucket name<input name="name" autoFocus placeholder="e.g. Home projects" maxLength={32} required /></label>
              <label>Monthly amount<div className="moneyInput"><span>$</span><input name="amount" type="number" min="1" step="0.01" placeholder="0.00" required /></div></label>
              <div className="modalActions"><button type="button" className="button ghost" onClick={() => setAddBucketOpen(false)}>Cancel</button><button className="button primary" type="submit">Create bucket</button></div>
            </form>
          </div>
        </div>
      )}

      {resetOpen && (
        <div className="modalBackdrop" onMouseDown={(event) => event.currentTarget === event.target && setResetOpen(false)}>
          <div className="modal compact" role="alertdialog" aria-modal="true" aria-labelledby="reset-title">
            <span className="modalIcon warning">↻</span><p className="eyebrow">Fresh start</p><h2 id="reset-title">Empty every bucket?</h2><p>This removes all purchases from {monthLabel(period)}, but keeps your buckets and their planned amounts.</p>
            <div className="modalActions"><button className="button ghost" onClick={() => setResetOpen(false)}>Keep purchases</button><button className="button danger" onClick={emptyBuckets}>Yes, empty them</button></div>
          </div>
        </div>
      )}
      {bucketToDelete && (
        <div className="modalBackdrop" onMouseDown={(event) => event.currentTarget === event.target && setBucketToDelete(null)}>
          <div className="modal compact" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
            <span className="modalIcon warning">×</span><p className="eyebrow">Delete bucket</p><h2 id="delete-title">Delete {bucketToDelete.name}?</h2><p>This permanently removes the bucket and its {bucketToDelete.purchases.length} purchase{bucketToDelete.purchases.length === 1 ? "" : "s"} from {monthLabel(period)}.</p>
            <div className="modalActions"><button className="button ghost" onClick={() => setBucketToDelete(null)}>Keep bucket</button><button className="button danger" onClick={deleteBucket}>Delete bucket</button></div>
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
