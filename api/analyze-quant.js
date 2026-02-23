export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { companyName, anthropicKey, depth = "deep" } = req.body;
  if (!companyName || !anthropicKey) return res.status(400).json({ error: "필수 파라미터 없음" });

  const MODEL = "claude-sonnet-4-6";
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const tools = [{ name: "web_search", type: "web_search_20250305" }];

  const SYSTEM = `당신은 밸류 퀀트 트레이더입니다 (버핏·그린블랫·그레이엄 철학).
기업명을 받으면 웹검색 후 정량 분석하고, 반드시 아래 JSON만 반환하세요.

핵심 규칙:
- 모든 숫자 [실제]/[추정]/[가정] 태깅
- 웹검색으로 실제 재무데이터 확인 필수
- MOS >30% = Strong Buy, 15~30% = Buy 기준 적용

JSON 형식 (이것만 출력):
{"ticker":"","name":"","market":"US|KR|HK|JP|EU","exchange":"","sector":"","currency":"USD|KRW|JPY|HKD|EUR","currentPrice":0,"analysisType":"QUANT","macro":{"environment":"긍정|중립|부정","score":0,"cyclePosition":"확장|정점|수축|저점","summary":"","keyRisks":[]},"industry":{"growthRate":0,"avgROIC":0,"competitiveIntensity":"높음|중간|낮음","summary":""},"fundamental":{"revenueGrowth5Y":0,"operatingMargin":0,"roe":0,"roic":0,"fcfMargin":0,"fcfConversion":0,"debtToEquity":0,"earningsStability":"높음|중간|낮음","moatRating":"넓음|보통|좁음|없음","moatEvidence":"","summary":""},"valuation":{"per":0,"perHistoricalPct":0,"pbr":0,"pbrHistoricalPct":0,"evEbitda":0,"evEbitdaHistoricalPct":0,"fcfYield":0,"industryPercentile":0,"intrinsicValue":0,"marginOfSafety":0,"summary":""},"quantVerdict":{"qualityScore":0,"valueScore":0,"momentumScore":0,"overallScore":0,"expectedReturn":0,"recommendation":"Strong Buy|Buy|Hold|Reduce|Avoid","bearCase":"","bearCaseProb":0,"verdictOneLiner":""},"scenarios":{"bull":{"price":0,"prob":0,"thesis":""},"base":{"price":0,"prob":0,"thesis":""},"bear":{"price":0,"prob":0,"thesis":""}},"weightedFairValue":0,"upsideDownside":0,"verdict":"STRONG BUY|BUY|HOLD|REDUCE|AVOID","confidence":0,"dataSources":[],"uncertainties":[]}`;

  const USER = `날짜: ${today} / 분석: ${companyName} / 깊이: ${depth === "deep" ? "심층" : "빠른"}\n웹검색 후 JSON만 반환.`;

  try {
    const messages = [{ role: "user", content: USER }];
    let finalText = "";
    const MAX_ITER = depth === "deep" ? 7 : 5;

    for (let i = 0; i < MAX_ITER; i++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "web-search-2025-03-05",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: depth === "deep" ? 5000 : 3000,
          system: SYSTEM,
          tools,
          messages,
        }),
      });

      const data = await r.json();
      if (data.error) throw new Error(data.error.message);

      const texts = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
      if (texts) finalText = texts;
      if (data.stop_reason === "end_turn") break;

      if (data.stop_reason === "tool_use") {
        const uses = (data.content || []).filter(b => b.type === "tool_use");
        messages.push({ role: "assistant", content: data.content });
        messages.push({
          role: "user",
          content: uses.map(tu => ({
            type: "tool_result",
            tool_use_id: tu.id,
            content: (tu.content || [])
              .map(c => typeof c === "string" ? c.slice(0, 400) : JSON.stringify(c).slice(0, 400))
              .join("\n").slice(0, 600),
          }))
        });
      } else break;
    }

    const f = finalText.indexOf("{"), l = finalText.lastIndexOf("}");
    if (f === -1) throw new Error("JSON 파싱 실패");
    const result = JSON.parse(finalText.slice(f, l + 1));
    return res.status(200).json({ ...result, analyzedAt: new Date().toISOString(), depth, id: Date.now().toString(), analysisType: "QUANT" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
