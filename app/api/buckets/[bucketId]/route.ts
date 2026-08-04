import { NextRequest, NextResponse } from "next/server";
import { bucketsCollection } from "@/lib/buckets";
import { sessionForRequest } from "@/lib/session";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest, context: { params: Promise<{ bucketId: string }> }) {
  const session = await sessionForRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bucketId } = await context.params;
  const result = await bucketsCollection.deleteOne({ _id: bucketId, userId: session.user.id });
  if (!result.deletedCount) return NextResponse.json({ error: "Bucket not found" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
