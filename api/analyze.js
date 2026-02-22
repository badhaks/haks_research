export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { companyName, anthropicKey, depth = "deep" } = req.body;
  if (!companyName || !anthropicKey) return res.status(400).json({ error: "필수 파라미터 없음" });

  const MODEL = "claude-opus-4-6";
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const tools = [{ name: "web_search", type: "web_search_20250305" }];

  const callClaude = async (system, user, maxTokens) => {
    const messages = [{ role: "user", content: user }];
    let finalText = "";
    for (let i = 0; i < 8; i++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "web-search-2025-03-05",
        },
        body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, tools, messages }),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error.message);
      const texts = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
      if (texts) finalText = texts;
      if (data.stop_reason === "end_turn") break;
      if (data.stop_reason === "tool_use") {
        const uses = (data.content || []).filter(b => b.type === "tool_use");
        messages.push({ role: "assistant", content: data.content });
        messages.push({ role: "user", content: uses.map(tu => ({
          type: "tool_result", tool_use_id: tu.id,
          content: (tu.content || []).map(r => typeof r === "string" ? r.slice(0,2000) : JSON.stringify(r).slice(0,2000)).join("\n"),
        }))});
      } else break;
    }
    return finalText;
  };

  const parseJSON = (raw) => {
    const f = raw.indexOf("{"), l = raw.lastIndexOf("}");
    if (f === -1) throw new Error("JSON 없음");
    return JSON.parse(raw.slice(f, l + 1));
  };

  // ══ 1단계: 퀀트 분석 ══════════════════════════════════════════
  const QUANT_SYS = `당신은 세계 최고의 밸류 퀀트 트레이더입니다. 워런 버핏, 조엘 그린블랫, 벤저민 그레이엄의 가치투자 철학 기반으로 정량적 데이터로만 판단합니다. 웹 검색으로 실제 데이터를 반드시 확인하세요.

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "ticker": "",
  "name": "",
  "market": "US|KR|HK|JP|EU",
  "exchange": "",
  "sector": "",
  "currency": "USD|KRW|JPY|HKD|EUR",
  "currentPrice": 0,
  "macro": {
    "environment": "긍정|중립|부정",
    "score": 0,
    "cyclePosition": "확장|정점|수축|저점",
    "summary": "",
    "keyRisks": []
  },
  "industry": {
    "growthRate": 0,
    "avgROIC": 0,
    "competitiveIntensity": "높음|중간|낮음",
    "summary": ""
  },
  "fundamental": {
    "revenueGrowth5Y": 0,
    "operatingMargin": 0,
    "roe": 0,
    "roic": 0,
    "fcfConversion": 0,
    "debtRatio": 0,
    "earningsStability": "높음|중간|낮음",
    "moatRating": "넓음|보통|좁음|없음",
    "moatEvidence": "",
    "summary": ""
  },
  "valuation": {
    "per": 0,
    "pbr": 0,
    "evEbitda": 0,
    "fcfYield": 0,
    "peg": 0,
    "historicalPercentile": 0,
    "industryPercentile": 0,
    "intrinsicValue": 0,
    "marginOfSafety": 0,
    "summary": ""
  },
  "quantVerdict": {
    "qualityScore": 0,
    "valueScore": 0,
    "momentumScore": 0,
    "overallScore": 0,
    "expectedReturn": 0,
    "recommendation": "Strong Buy|Buy|Hold|Reduce|Avoid",
    "bearCase": "",
    "bearCaseProb": 0
  },
  "dataSources": [],
  "uncertainties": []
}`;

  // ══ 2단계: IB 분석 ════════════════════════════════════════════
  const IB_SYS = `당신은 월스트리트 IB 출신 시니어 재무 분석가입니다. 제공된 퀀트 분석을 바탕으로 IB 수준 심층 분석을 수행합니다.
할루시네이션 방어: 모든 숫자 [실제]/[추정]/[가정] 구분. 웹 검색 필수. 실존 기업만 비교기업으로 사용.

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "dealRadar": {
    "items": [{ "title": "", "status": "루머|공식발표|규제심사중", "impact": "", "valImpact": "" }],
    "summary": ""
  },
  "dcf": {
    "wacc": 0,
    "terminalGrowth": 0,
    "fairValue": 0,
    "assumptions": [{ "item": "", "value": "", "basis": "", "sensitivity": "" }]
  },
  "comps": {
    "peers": [{ "name": "", "ticker": "", "per": 0, "evEbitda": 0, "pbr": 0, "revenueGrowth": 0 }],
    "impliedValue": 0,
    "premiumDiscount": 0,
    "summary": ""
  },
  "scenarios": {
    "bull": { "price": 0, "prob": 0, "thesis": "", "catalysts": [] },
    "base": { "price": 0, "prob": 0, "thesis": "", "catalysts": [] },
    "bear": { "price": 0, "prob": 0, "thesis": "", "catalysts": [] }
  },
  "weightedFairValue": 0,
  "upsideDownside": 0,
  "keyPoints": [
    { "no": 1, "label": "최종 판단", "content": "" },
    { "no": 2, "label": "DCF 인사이트", "content": "" },
    { "no": 3, "label": "Comps 인사이트", "content": "" },
    { "no": 4, "label": "시나리오 핵심", "content": "" },
    { "no": 5, "label": "가장 중요한 변수", "content": "" },
    { "no": 6, "label": "시장이 놓치는 것", "content": "" },
    { "no": 7, "label": "최대 리스크", "content": "" },
    { "no": 8, "label": "딜 레이더", "content": "" },
    { "no": 9, "label": "업사이드 촉매", "content": "" },
    { "no": 10, "label": "액션 아이템", "content": "" }
  ],
  "priceEvents": [{ "event": "", "impact": 0, "impactPrice": 0, "basis": "" }],
  "verdict": "STRONG BUY|BUY|HOLD|REDUCE|AVOID",
  "verdictOneLiner": "",
  "confidence": 0,
  "reverseCheck": { "impliedGrowth": "", "vsMarket": "", "warning": "" },
  "reliability": {
    "realDataSources": [],
    "estimateRatio": "",
    "topUncertainties": [],
    "limitations": ""
  }
}`;

  try {
    const maxQ = depth === "deep" ? 5000 : 3000;
    const maxI = depth === "deep" ? 6000 : 4000;

    // 1단계
    const qRaw = await callClaude(QUANT_SYS,
      `현재 날짜: ${today}\n분석 대상: ${companyName}\n\n웹 검색으로 최신 데이터를 수집하여 퀀트 분석을 수행하세요. JSON만 반환.`,
      maxQ
    );
    const qData = parseJSON(qRaw);

    // 2단계
    const iRaw = await callClaude(IB_SYS,
      `현재 날짜: ${today}\n분석 대상: ${companyName}\n현재가: ${qData.currentPrice} ${qData.currency}\n\n━━ 퀀트 분석 결과 ━━\n${JSON.stringify(qData, null, 2)}\n━━━━━━━━━━━━━━━━\n\n위 결과 기반으로 웹 검색 후 IB 분석 수행. JSON만 반환.`,
      maxI
    );
    const iData = parseJSON(iRaw);

    return res.status(200).json({
      ticker: qData.ticker,
      name: qData.name,
      market: qData.market,
      exchange: qData.exchange,
      sector: qData.sector,
      currency: qData.currency,
      currentPrice: qData.currentPrice,
      quant: {
        macro: qData.macro,
        industry: qData.industry,
        fundamental: qData.fundamental,
        valuation: qData.valuation,
        verdict: qData.quantVerdict,
        sources: qData.dataSources,
        uncertainties: qData.uncertainties,
      },
      ib: {
        dealRadar: iData.dealRadar,
        dcf: iData.dcf,
        comps: iData.comps,
        scenarios: iData.scenarios,
        weightedFairValue: iData.weightedFairValue,
        upsideDownside: iData.upsideDownside,
        keyPoints: iData.keyPoints,
        priceEvents: iData.priceEvents,
        verdict: iData.verdict,
        verdictOneLiner: iData.verdictOneLiner,
        confidence: iData.confidence,
        reverseCheck: iData.reverseCheck,
        reliability: iData.reliability,
      },
      analyzedAt: new Date().toISOString(),
      depth,
      id: Date.now().toString(),
    });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
