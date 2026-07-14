export default async function handler(req: any, res: any) {
  const path = req.url?.split("?")[0] ?? "/";
  if (path === "/api/health" || path === "/health") {
    return res.status(200).json({ status: "ok", provider: "supabase", timestamp: new Date().toISOString() });
  }
  return res.status(410).json({
    error: "API migrada para Supabase",
    message: "Os endpoints de negócio devem ser acessados via Supabase Data API.",
  });
}
