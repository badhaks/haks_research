const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  const get = async () => {
    const r = await fetch(`${KV_URL}/get/stocks`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const d = await r.json();
    return d.result ? JSON.parse(d.result) : [];
  };

  const set = async (val) => {
    await fetch(`${KV_URL}/set/stocks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(val)
    });
  };

  if (req.method === "GET") {
    return res.status(200).json(await get());
  }
  if (req.method === "POST") {
    const { stock } = req.body;
    const stocks = await get();
    await set([stock, ...stocks.filter(s => s.id !== stock.id)]);
    return res.status(200).json({ ok: true });
  }
  if (req.method === "DELETE") {
    const { id } = req.body;
    const stocks = await get();
    await set(stocks.filter(s => s.id !== id));
    return res.status(200).json({ ok: true });
  }
  return res.status(405).end();
}
