import { NextRequest, NextResponse } from "next/server";
import { bucketsCollection, publicBucket } from "@/lib/buckets";
import { sessionForRequest } from "@/lib/session";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ bucketId: string; purchaseId: string }> },
) {
  const session = await sessionForRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bucketId, purchaseId } = await context.params;
  const bucket = await bucketsCollection.findOne({ _id: bucketId, userId: session.user.id });
  if (!bucket) return NextResponse.json({ error: "Bucket not found" }, { status: 404 });

  const purchases = bucket.purchases.filter((purchase) => purchase.id !== purchaseId);
  if (purchases.length === bucket.purchases.length) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }

  bucket.purchases = purchases;
  bucket.updatedAt = new Date();
  await bucketsCollection.replaceOne({ _id: bucket._id, userId: session.user.id }, bucket);

  return NextResponse.json({ bucket: publicBucket(bucket) });
}
