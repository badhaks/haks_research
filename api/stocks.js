import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const stocks = await kv.get("stocks") || [];
    return res.status(200).json(stocks);
  }

  if (req.method === "POST") {
    const { stock } = req.body;
    const stocks = await kv.get("stocks") || [];
    const updated = [stock, ...stocks.filter(s => s.id !== stock.id)];
    await kv.set("stocks", updated);
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { id } = req.body;
    const stocks = await kv.get("stocks") || [];
    const updated = stocks.filter(s => s.id !== id);
    await kv.set("stocks", updated);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
