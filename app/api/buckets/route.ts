import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  bucketColors,
  bucketsCollection,
  cleanAmount,
  cleanName,
  ensureBucketIndexes,
  isPeriod,
  publicBucket,
} from "@/lib/buckets";
import { sessionForRequest } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await sessionForRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const period = request.nextUrl.searchParams.get("period");
  if (!isPeriod(period)) return NextResponse.json({ error: "Invalid period" }, { status: 400 });

  await ensureBucketIndexes();
  const buckets = await bucketsCollection
    .find({ userId: session.user.id, period })
    .sort({ createdAt: 1 })
    .toArray();

  return NextResponse.json({ buckets: buckets.map(publicBucket) });
}

export async function POST(request: NextRequest) {
  const session = await sessionForRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = cleanName(body?.name, 32);
  const amount = cleanAmount(body?.amount);
  const period = body?.period;
  if (!name || amount === null || !isPeriod(period)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }

  await ensureBucketIndexes();
  const count = await bucketsCollection.countDocuments({ userId: session.user.id, period });
  const now = new Date();
  const bucket = {
    _id: randomUUID(),
    userId: session.user.id,
    period,
    name,
    amount,
    color: bucketColors[count % bucketColors.length],
    purchases: [],
    createdAt: now,
    updatedAt: now,
  };
  await bucketsCollection.insertOne(bucket);

  return NextResponse.json({ bucket: publicBucket(bucket) }, { status: 201 });
}
