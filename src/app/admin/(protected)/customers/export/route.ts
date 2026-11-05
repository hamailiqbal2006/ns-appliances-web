import { getAdminCustomerLeads } from "@/lib/supabase-admin";

function csvCell(value: string) { return `"${value.replace(/"/g, '""')}"`; }

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.slice(0, 30) ?? "";
  const { leads, isReady } = await getAdminCustomerLeads(q);
  if (!isReady) return new Response("Customer lead setup is incomplete.", { status: 503 });
  const eligible = leads.filter((lead) => lead.marketing_consent && lead.marketing_status !== "opted_out");
  const rows = ["whatsapp_number,consent_at,consent_version,manual_status,submitted_at"];
  for (const lead of eligible) rows.push([lead.whatsapp_number, lead.consent_at ?? "", lead.consent_version ?? "", lead.marketing_status, lead.created_at].map(csvCell).join(","));
  return new Response(rows.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=ns-whatsapp-opt-in-leads.csv", "Cache-Control": "no-store" } });
}
