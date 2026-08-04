import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { bucketsCollection, cleanAmount, cleanName, isDate, publicBucket } from "@/lib/buckets";
import { sessionForRequest } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ bucketId: string }> }) {
  const session = await sessionForRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bucketId } = await context.params;
  const bucket = await bucketsCollection.findOne({ _id: bucketId, userId: session.user.id });
  if (!bucket) return NextResponse.json({ error: "Bucket not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const name = cleanName(body?.name);
  const amount = cleanAmount(body?.amount);
  const date = body?.date;
  if (!name || amount === null || !isDate(date, bucket.period)) {
    return NextResponse.json({ error: "Invalid purchase" }, { status: 400 });
  }

  bucket.purchases.push({ id: randomUUID(), name, amount, date, createdAt: new Date() });
  bucket.updatedAt = new Date();
  await bucketsCollection.replaceOne({ _id: bucket._id, userId: session.user.id }, bucket);

  return NextResponse.json({ bucket: publicBucket(bucket) }, { status: 201 });
}
