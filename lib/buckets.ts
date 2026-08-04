import "server-only";

import type { Collection } from "mongodb";
import { database } from "./mongodb";

export type PurchaseDocument = {
  id: string;
  name: string;
  amount: number;
  date: string;
  createdAt: Date;
};

export type BucketDocument = {
  _id: string;
  userId: string;
  period: string;
  name: string;
  amount: number;
  color: string;
  purchases: PurchaseDocument[];
  createdAt: Date;
  updatedAt: Date;
};

export const bucketColors = ["#FF7455", "#8C6FE8", "#42A989", "#E5A33F", "#5596D8", "#D96793"];

export const bucketsCollection = database.collection<BucketDocument>("buckets") as Collection<BucketDocument>;

let indexPromise: Promise<string> | undefined;

export function ensureBucketIndexes() {
  indexPromise ??= bucketsCollection.createIndex({ userId: 1, period: 1, createdAt: 1 });
  return indexPromise;
}

export function publicBucket(bucket: BucketDocument) {
  return {
    id: bucket._id,
    name: bucket.name,
    amount: bucket.amount,
    color: bucket.color,
    purchases: bucket.purchases.map(({ id, name, amount, date }) => ({ id, name, amount, date })),
  };
}

export const isPeriod = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

export const isDate = (value: unknown, period: string): value is string =>
  typeof value === "string" && new RegExp(`^${period}-(0[1-9]|[12]\\d|3[01])$`).test(value);

export function cleanName(value: unknown, maxLength = 64) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name && name.length <= maxLength ? name : null;
}

export function cleanAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(amount) && amount > 0 && amount <= 1_000_000_000
    ? Math.round(amount * 100) / 100
    : null;
}
