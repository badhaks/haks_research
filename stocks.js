const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

const kv = async (method, ...args) => {
  const r = await fetch(`${KV_URL}/${[method, ...args].map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await r.json();
  return data.result;
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // 전체 목록 조회
  if (req.method === "GET") {
    try {
      const raw = await kv("get", "stocks");
      const stocks = raw ? JSON.parse(raw) : [];
      return res.status(200).json(stocks);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // 저장 (관리자만)
  if (req.method === "POST") {
    try {
      const { stock } = req.body;
      if (!stock) return res.status(400).json({ error: "stock 없음" });
      const raw = await kv("get", "stocks");
      const stocks = raw ? JSON.parse(raw) : [];
      // 같은 id면 교체, 없으면 추가
      const updated = [stock, ...stocks.filter(s => s.id !== stock.id)];
      await kv("set", "stocks", JSON.stringify(updated));
      return res.status(200).json({ ok: true, count: updated.length });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // 삭제 (관리자만)
  if (req.method === "DELETE") {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "id 없음" });
      const raw = await kv("get", "stocks");
      const stocks = raw ? JSON.parse(raw) : [];
      const updated = stocks.filter(s => s.id !== id);
      await kv("set", "stocks", JSON.stringify(updated));
      return res.status(200).json({ ok: true, count: updated.length });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).end();
}
