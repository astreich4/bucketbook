import { NextRequest, NextResponse } from "next/server";
import { bucketsCollection, isPeriod } from "@/lib/buckets";
import { sessionForRequest } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await sessionForRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!isPeriod(body?.period)) return NextResponse.json({ error: "Invalid period" }, { status: 400 });

  await bucketsCollection.updateMany(
    { userId: session.user.id, period: body.period },
    { $set: { purchases: [], updatedAt: new Date() } },
  );
  return new NextResponse(null, { status: 204 });
}
