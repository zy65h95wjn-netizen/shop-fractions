// Pulse Protocol: authenticated daily resting-heart-rate correction.
// Do not expose credentials or raw health samples in logs or responses.
// This function delegates authentication to the existing key-gated pulse_read RPC.
const PROJECT_URL = Deno.env.get("SUPABASE_URL") || "https://wosfukbzxrykwarxobfw.supabase.co";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ORIGIN = "https://zy65h95wjn-netizen.github.io";
const TYPES = ["heart_rate", "resting_heart_rate", "hrv_sdnn", "blood_oxygen_saturation"];

function response(body: unknown, status = 200, origin?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, private",
      "Vary": "Origin",
      ...(origin === ORIGIN ? { "Access-Control-Allow-Origin": ORIGIN } : {}),
    },
  });
}
function dayInNY(instant: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date(instant));
  const p: Record<string, string> = {};
  for (const part of parts) p[part.type] = part.value;
  return p.year + "-" + p.month + "-" + p.day;
}
type Sample = { start_at: string; end_at: string | null; value: number | string; sample_hash: string };
function isLater(a: Sample, b: Sample): boolean {
  const aEnd = Date.parse(a.end_at || a.start_at), bEnd = Date.parse(b.end_at || b.start_at);
  if (aEnd !== bEnd) return aEnd > bEnd;
  return a.sample_hash > b.sample_hash;
}
async function getRestingSamples(): Promise<Sample[]> {
  if (!SERVICE_ROLE) throw new Error("Missing server-side service role credential");
  const cutoff = new Date(Date.now() - 92 * 86400000).toISOString();
  const results: Sample[] = [];
  for (let offset = 0; offset <= 5000; offset += 1000) {
    const u = new URL(PROJECT_URL + "/rest/v1/health_samples");
    u.searchParams.set("select", "start_at,end_at,value,sample_hash");
    u.searchParams.set("metric", "eq.resting_heart_rate");
    u.searchParams.set("start_at", "gte." + cutoff);
    u.searchParams.set("order", "start_at.asc,sample_hash.asc");
    u.searchParams.set("limit", "1000");
    u.searchParams.set("offset", String(offset));
    const resp = await fetch(u, {
      headers: { "apikey": SERVICE_ROLE, "Authorization": "Bearer " + SERVICE_ROLE },
      cache: "no-store",
    });
    if (!resp.ok) throw new Error("Unable to retrieve authorized resting-HR records");
    const page = await resp.json();
    if (!Array.isArray(page) || page.some(s => typeof s.start_at !== "string" || !Number.isFinite(Number(s.value)))) {
      throw new Error("Unexpected resting-HR sample response");
    }
    results.push(...page);
    if (page.length < 1000) return results;
  }
  throw new Error("Resting-HR sample count exceeds safe paging limit");
}
Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin") || undefined;
  if (origin && origin !== ORIGIN) return response({ error: "Forbidden origin" }, 403);
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization", "Vary": "Origin",
        "Access-Control-Max-Age": "3600" }
    });
  }
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405, origin);
  if (!SERVICE_ROLE) return response({ error: "Server configuration unavailable" }, 503, origin);
  if (Number(req.headers.get("content-length") || "0") > 2048) return response({ error: "Request too large" }, 413, origin);
  let payload: { p_key?: unknown; p_days?: unknown };
  try { payload = await req.json(); } catch { return response({ error: "Invalid JSON" }, 400, origin); }
  if (!payload || typeof payload.p_key !== "string" || payload.p_key.length < 35 ||
      payload.p_key.length > 200 || payload.p_days !== 90) {
    return response({ error: "Invalid request" }, 400, origin);
  }
  try {
    // Check the private key with the original database function BEFORE any privileged read.
    const auth = await fetch(PROJECT_URL + "/rest/v1/rpc/pulse_read", {
      method: "POST",
      headers: { "apikey": SERVICE_ROLE, "Authorization": "Bearer " + SERVICE_ROLE,
        "Content-Type": "application/json" },
      body: JSON.stringify({ p_key: payload.p_key, p_days: 90 }),
      cache: "no-store"
    });
    // PostgREST can use HTTP 401/403 for invalid credentials, missing API
    // privileges or JWT failures. Only the explicit SQLSTATE 28000 returned
    // by pulse_read's key guard is evidence of a rejected private key.
    let authResult: any; // Runtime shape is checked below before accessing dashboard fields.
    try { authResult = await auth.json(); }
    catch { return response({ code: "upstream_auth_unavailable", error: "Authentication service unavailable" }, 503, origin); }
    if (!auth.ok) {
      if (authResult?.code === "28000") {
        return response({ code: "key_mismatch", error: "Private key does not match" }, 401, origin);
      }
      return response({ code: "upstream_auth_unavailable", error: "Authentication service unavailable" }, 503, origin);
    }
    const data = authResult;
    if (!Array.isArray(data?.daily) || !Array.isArray(data?.events) || !data?.latest) {
      throw new Error("Unexpected dashboard response");
    }
    const samples = await getRestingSamples();
    const latestByDay = new Map<string, Sample>();
    let latestOverall: Sample | null = null;
    for (const s of samples) {
      if (!s.start_at || !Number.isFinite(Date.parse(s.end_at || s.start_at))) continue;
      const day = dayInNY(s.start_at);
      const prior = latestByDay.get(day);
      if (!prior || isLater(s, prior)) latestByDay.set(day, s);
      if (!latestOverall || isLater(s, latestOverall)) latestOverall = s;
    }
    for (const item of data.daily) {
      const last = latestByDay.get(item.day);
      item.resting_heart_rate = last ? Number(last.value) : null;
    }
    data.latest.resting_heart_rate = latestOverall
      ? { value: Number(latestOverall.value), unit: "bpm", at: latestOverall.end_at || latestOverall.start_at }
      : null;
    data.resting_hr_method = "latest_end_at_per_local_day";
    return response(data, 200, origin);
  } catch {
    // Fail closed; never silently serve an inaccurate mean as resting HR.
    return response({ error: "Corrected dashboard temporarily unavailable" }, 503, origin);
  }
});
