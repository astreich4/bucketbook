"use client";

import { FormEvent, useEffect, useState } from "react";

type Purchase = { id: string; name: string; amount: number; date: string };
type Bucket = { id: string; name: string; amount: number; color: string; purchases: Purchase[] };
type Periods = Record<string, Bucket[]>;

const colors = ["#FF7455", "#8C6FE8", "#42A989", "#E5A33F", "#5596D8", "#D96793"];
const starter: Bucket[] = [
  {
    id: "groceries", name: "Groceries", amount: 600, color: "#FF7455",
    purchases: [
      { id: "g1", name: "Weekly groceries", amount: 142.8, date: "2026-08-01" },
      { id: "g2", name: "Farmers market", amount: 68.4, date: "2026-08-03" },
      { id: "g3", name: "Pantry restock", amount: 165.6, date: "2026-08-05" },
    ],
  },
  {
    id: "dining", name: "Dining out", amount: 300, color: "#8C6FE8",
    purchases: [
      { id: "d1", name: "Friday dinner", amount: 86.2, date: "2026-08-02" },
      { id: "d2", name: "Lunch with Maya", amount: 58.4, date: "2026-08-04" },
      { id: "d3", name: "Coffee & pastries", amount: 119.8, date: "2026-08-06" },
    ],
  },
  {
    id: "travel", name: "Travel", amount: 500, color: "#42A989",
    purchases: [
      { id: "t1", name: "Train tickets", amount: 218.2, date: "2026-08-01" },
      { id: "t2", name: "Weekend hotel", amount: 390, date: "2026-08-05" },
    ],
  },
  {
    id: "personal", name: "Personal", amount: 250, color: "#E5A33F",
    purchases: [
      { id: "p1", name: "Haircut", amount: 52, date: "2026-08-03" },
      { id: "p2", name: "New notebook", amount: 35, date: "2026-08-06" },
    ],
  },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const monthLabel = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
};
const spent = (bucket: Bucket) => bucket.purchases.reduce((sum, item) => sum + item.amount, 0);
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const todayFor = (period: string) => `${period}-01`;

function shiftPeriod(period: string, change: number) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1 + change, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function BucketBook() {
  const [periods, setPeriods] = useState<Periods>({ "2026-08": starter });
  const [period, setPeriod] = useState("2026-08");
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState("all");
  const [addBucketOpen, setAddBucketOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [bucketToDelete, setBucketToDelete] = useState<Bucket | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bucketbook-data-v1");
      if (saved) {
        const parsed = JSON.parse(saved) as { periods: Periods; period: string };
        setPeriods(parsed.periods);
        setPeriod(parsed.period);
      }
    } catch { /* Keep the friendly starter data if saved data is unavailable. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("bucketbook-data-v1", JSON.stringify({ periods, period }));
  }, [periods, period, ready]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const buckets = periods[period] ?? [];
  const visible = buckets.filter((bucket) => {
    const ratio = spent(bucket) / bucket.amount;
    if (filter === "on-track") return ratio < 0.75;
    if (filter === "close") return ratio >= 0.75 && ratio <= 1;
    if (filter === "over") return ratio > 1;
    return true;
  });

  const updateBuckets = (next: Bucket[]) => setPeriods((current) => ({ ...current, [period]: next }));

  function addBucket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const amount = Number(data.get("amount"));
    if (!name || amount <= 0) return;
    updateBuckets([...buckets, { id: uid(), name, amount, color: colors[buckets.length % colors.length], purchases: [] }]);
    setAddBucketOpen(false);
    setToast(`${name} bucket added`);
  }

  function addPurchase(event: FormEvent<HTMLFormElement>, bucketId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("purchase") ?? "").trim();
    const amount = Number(data.get("purchaseAmount"));
    const date = String(data.get("date") ?? todayFor(period));
    if (!name || amount <= 0) return;
    updateBuckets(buckets.map((bucket) => bucket.id === bucketId
      ? { ...bucket, purchases: [...bucket.purchases, { id: uid(), name, amount, date }] }
      : bucket));
    event.currentTarget.reset();
    setToast("Purchase added");
  }

  function emptyBuckets() {
    updateBuckets(buckets.map((bucket) => ({ ...bucket, purchases: [] })));
    setResetOpen(false);
    setToast(`${monthLabel(period)} purchases cleared`);
  }

  function removePurchase(bucketId: string, purchaseId: string) {
    updateBuckets(buckets.map((bucket) => bucket.id === bucketId
      ? { ...bucket, purchases: bucket.purchases.filter((item) => item.id !== purchaseId) }
      : bucket));
    setToast("Purchase removed");
  }

  function deleteBucket() {
    if (!bucketToDelete) return;
    updateBuckets(buckets.filter((bucket) => bucket.id !== bucketToDelete.id));
    if (expanded === bucketToDelete.id) setExpanded(null);
    setToast(`${bucketToDelete.name} bucket deleted`);
    setBucketToDelete(null);
  }

  function exportExcel() {
    const rows: string[] = [];
    Object.entries(periods).sort().forEach(([month, monthBuckets]) => {
      monthBuckets.forEach((bucket) => {
        if (!bucket.purchases.length) rows.push(`<Row><Cell><Data ss:Type="String">${escapeXml(monthLabel(month))}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(bucket.name)}</Data></Cell><Cell><Data ss:Type="Number">${bucket.amount}</Data></Cell><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="Number">0</Data></Cell><Cell><Data ss:Type="String"></Data></Cell></Row>`);
        bucket.purchases.forEach((item) => rows.push(`<Row><Cell><Data ss:Type="String">${escapeXml(monthLabel(month))}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(bucket.name)}</Data></Cell><Cell><Data ss:Type="Number">${bucket.amount}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(item.name)}</Data></Cell><Cell><Data ss:Type="Number">${item.amount}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(item.date)}</Data></Cell></Row>`));
      });
    });
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="BucketBook"><Table><Row><Cell><Data ss:Type="String">Period</Data></Cell><Cell><Data ss:Type="String">Bucket</Data></Cell><Cell><Data ss:Type="String">Budget</Data></Cell><Cell><Data ss:Type="String">Purchase</Data></Cell><Cell><Data ss:Type="String">Amount</Data></Cell><Cell><Data ss:Type="String">Date</Data></Cell></Row>${rows.join("")}</Table></Worksheet></Workbook>`;
    const url = URL.createObjectURL(new Blob([xml], { type: "application/vnd.ms-excel" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `bucketbook-${period}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("Excel file downloaded");
  }

  function navigate(change: number) {
    setExpanded(null);
    setPeriod((current) => shiftPeriod(current, change));
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="BucketBook home"><span className="brandMark">B</span><span>Bucket<span>Book</span></span></a>
        <div className="topActions">
          <button className="button ghost" onClick={() => setResetOpen(true)} disabled={!buckets.length}>↻ <span>Empty buckets</span></button>
          <button className="button dark" onClick={exportExcel}>⇩ <span>Export to Excel</span></button>
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

          {visible.length ? (
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
