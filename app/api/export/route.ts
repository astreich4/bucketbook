import { NextRequest, NextResponse } from "next/server";
import { bucketsCollection } from "@/lib/buckets";
import { sessionForRequest } from "@/lib/session";

export const runtime = "nodejs";

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export async function GET(request: NextRequest) {
  const session = await sessionForRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const buckets = await bucketsCollection.find({ userId: session.user.id }).sort({ period: 1, createdAt: 1 }).toArray();
  const rows: string[] = [];
  for (const bucket of buckets) {
    if (!bucket.purchases.length) {
      rows.push(`<Row><Cell><Data ss:Type="String">${escapeXml(bucket.period)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(bucket.name)}</Data></Cell><Cell><Data ss:Type="Number">${bucket.amount}</Data></Cell><Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="Number">0</Data></Cell><Cell><Data ss:Type="String"></Data></Cell></Row>`);
    }
    for (const purchase of bucket.purchases) {
      rows.push(`<Row><Cell><Data ss:Type="String">${escapeXml(bucket.period)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(bucket.name)}</Data></Cell><Cell><Data ss:Type="Number">${bucket.amount}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(purchase.name)}</Data></Cell><Cell><Data ss:Type="Number">${purchase.amount}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(purchase.date)}</Data></Cell></Row>`);
    }
  }

  const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="BucketBook"><Table><Row><Cell><Data ss:Type="String">Period</Data></Cell><Cell><Data ss:Type="String">Bucket</Data></Cell><Cell><Data ss:Type="String">Budget</Data></Cell><Cell><Data ss:Type="String">Purchase</Data></Cell><Cell><Data ss:Type="String">Amount</Data></Cell><Cell><Data ss:Type="String">Date</Data></Cell></Row>${rows.join("")}</Table></Worksheet></Workbook>`;
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": "attachment; filename=bucketbook-export.xls",
      "Cache-Control": "private, no-store",
    },
  });
}
