export default async function handler(req: any, res: any) {
  const path = req.url?.split("?")[0] ?? "/";
  if (path === "/api/health" || path === "/health") {
    return res.status(200).json({ status: "ok", provider: "supabase", timestamp: new Date().toISOString() });
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (path === "/api/auth/login" && req.method === "POST") {
    if (!supabaseUrl || !supabaseKey) return res.status(503).json({ message: "Supabase não configurado" });
    const input = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: supabaseKey, "content-type": "application/json" },
      body: JSON.stringify({ email: input.email, password: input.password }),
    });
    const session = await response.json();
    if (!response.ok) return res.status(401).json({ message: session.error_description ?? "Credenciais inválidas" });
    res.setHeader("set-cookie", `fc_access_token=${session.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${session.expires_in ?? 3600}`);
    return res.status(200).json({ authenticated: true });
  }
  if (path === "/api/auth/logout") {
    res.setHeader("set-cookie", "fc_access_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
    return res.status(200).json({ loggedOut: true });
  }
  if (path === "/api/auth/me") {
    if (!supabaseUrl || !supabaseKey) return res.status(503).json({ message: "Supabase não configurado" });
    const token = (req.headers?.cookie ?? "").match(/(?:^|; )fc_access_token=([^;]+)/)?.[1];
    if (!token) return res.status(401).json({ message: "Não autenticado" });
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` } });
    const user = await response.json();
    if (!response.ok) return res.status(401).json({ message: "Sessão expirada" });
    return res.status(200).json({ id: user.id, name: user.user_metadata?.name ?? user.email, email: user.email, role: { key: "globalAdmin", name: "Administrador" }, scope: {} });
  }
  return res.status(410).json({
    error: "API migrada para Supabase",
    message: "Os endpoints de negócio devem ser acessados via Supabase Data API.",
  });
}
