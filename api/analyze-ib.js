export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { companyName, anthropicKey, depth = "deep" } = req.body;
  if (!companyName || !anthropicKey) return res.status(400).json({ error: "필수 파라미터 없음" });

  const MODEL = "claude-sonnet-4-6";
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const tools = [{ name: "web_search", type: "web_search_20250305" }];

  // 시스템 프롬프트를 최소화 (토큰 절약)
  const SYSTEM = `당신은 월스트리트 IB 출신 시니어 재무 분석가입니다.
기업명을 받으면 즉시 웹검색 후 IB 분석을 수행하고, 반드시 아래 JSON만 반환하세요.

핵심 규칙:
- 모든 숫자 [실제]/[추정]/[가정] 태깅
- 실존 상장사만 비교기업으로 사용
- 웹검색으로 확인된 딜만 딜레이더에 포함
- 상장사→DCF+Comps, 비상장→운영모델+DCF, 지주사→SOTP

JSON 형식 (이것만 출력):
{"ticker":"","name":"","market":"US|KR|HK|JP|EU","exchange":"","sector":"","currency":"USD|KRW|JPY|HKD|EUR","currentPrice":0,"keyPoints":[{"no":1,"label":"최종 판단","content":""},{"no":2,"label":"DCF 인사이트","content":""},{"no":3,"label":"Comps 인사이트","content":""},{"no":4,"label":"시나리오 핵심","content":""},{"no":5,"label":"가장 중요한 변수","content":""},{"no":6,"label":"시장이 놓치는 것","content":""},{"no":7,"label":"최대 리스크","content":""},{"no":8,"label":"딜 레이더","content":""},{"no":9,"label":"업사이드 촉매","content":""},{"no":10,"label":"액션 아이템","content":""}],"dealRadar":{"items":[{"title":"","status":"루머|공식발표|규제심사중","impact":"","valImpact":""}],"summary":""},"dcf":{"wacc":0,"terminalGrowth":0,"fairValue":0,"assumptions":[{"item":"","value":"","basis":"","sensitivity":""}]},"comps":{"peers":[{"name":"","ticker":"","per":0,"evEbitda":0,"pbr":0,"revenueGrowth":0}],"impliedValue":0,"premiumDiscount":0,"summary":""},"scenarios":{"bull":{"price":0,"prob":0,"thesis":"","catalysts":[]},"base":{"price":0,"prob":0,"thesis":"","catalysts":[]},"bear":{"price":0,"prob":0,"thesis":"","catalysts":[]}},"weightedFairValue":0,"upsideDownside":0,"verdictOneLiner":"","verdict":"STRONG BUY|BUY|HOLD|REDUCE|AVOID","confidence":0,"priceEvents":[{"event":"","impact":0,"impactPrice":0,"basis":""}],"reverseCheck":{"impliedGrowth":"","vsMarket":"","warning":""},"reliability":{"realDataSources":[],"estimateRatio":"","topUncertainties":[],"limitations":""}}`;

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
          max_tokens: depth === "deep" ? 6000 : 4000,
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
        // 검색 결과를 400자로 강하게 트리밍
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
    return res.status(200).json({ ...result, analyzedAt: new Date().toISOString(), depth, id: Date.now().toString(), analysisType: "IB" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
