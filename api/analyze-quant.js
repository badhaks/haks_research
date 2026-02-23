export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { companyName, anthropicKey, depth = "deep" } = req.body;
  if (!companyName || !anthropicKey) return res.status(400).json({ error: "필수 파라미터 없음" });

  const MODEL = "claude-sonnet-4-6";
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const tools = [{ name: "web_search", type: "web_search_20250305" }];

  const SYSTEM = `당신은 세계 최고의 밸류 퀀트 트레이더입니다. 워런 버핏, 조엘 그린블랫, 벤저민 그레이엄의 가치투자 철학을 바탕으로 하되, 모든 판단을 정량적 데이터와 통계적 증거로 뒷받침합니다.

■ 핵심 원칙
• 감정적 편향, 서사 중심 스토리텔링 배제
• 냉정하고 객관적인 정량 분석만 수행
• 웹 검색으로 실제 데이터 반드시 확인
• 모든 숫자: [실제]/[추정]/[가정] 태깅 필수

■ 5단계 분석 프레임워크

1단계 — 매크로 환경
• 금리, 인플레이션, GDP 성장률, 통화정책
• 지정학적 리스크, 경기 사이클 위치
• 해당 섹터에 미치는 매크로 영향도 정량화

2단계 — 산업/섹터 분석
• Porter's Five Forces 정량 평가
• 산업 평균 ROIC, 성장률, 경쟁 강도
• 퀀트 팩터: 모멘텀/밸류/퀄리티/사이즈

3단계 — 기업 본질 분석
• 최근 10년 재무 추이: ROE, ROIC, FCF 마진
• 수익 안정성, 이익 변동성 정량화
• 경제적 해자(Economic Moat) 정량화
• 자본 배분 효율성

4단계 — 정량적 밸류에이션
• P/E, P/B, EV/EBITDA, FCF Yield, PEG
• 역사적 10년 백분위, 산업 평균 비교
• 정상화 이익 기반 DCF
• 안전마진(Margin of Safety) 계산

5단계 — 투자 결론
• 기대 수익률, 리스크-리워드 비율
• MOS 기준: >30% = Strong Buy, 15~30% = Buy
• Bear case 확률 가중

반드시 아래 JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "ticker": "",
  "name": "",
  "market": "US|KR|HK|JP|EU",
  "exchange": "",
  "sector": "",
  "currency": "USD|KRW|JPY|HKD|EUR",
  "currentPrice": 0,
  "analysisType": "QUANT",
  "macro": {
    "environment": "긍정|중립|부정",
    "score": 0,
    "cyclePosition": "확장|정점|수축|저점",
    "interestRateImpact": "",
    "geopoliticalRisk": "",
    "summary": "",
    "keyRisks": []
  },
  "industry": {
    "growthRate": 0,
    "avgROIC": 0,
    "competitiveIntensity": "높음|중간|낮음",
    "porterScore": 0,
    "momentumFactor": "강|중|약",
    "valueFactor": "저평가|적정|고평가",
    "qualityFactor": "높음|중간|낮음",
    "summary": ""
  },
  "fundamental": {
    "revenueGrowth5Y": 0,
    "revenueGrowth10Y": 0,
    "operatingMargin": 0,
    "roe": 0,
    "roic": 0,
    "fcfMargin": 0,
    "fcfConversion": 0,
    "debtToEquity": 0,
    "earningsStability": "높음|중간|낮음",
    "earningsVolatility": 0,
    "moatRating": "넓음|보통|좁음|없음",
    "moatEvidence": "",
    "capitalAllocationScore": 0,
    "summary": ""
  },
  "valuation": {
    "per": 0,
    "perHistoricalPct": 0,
    "pbr": 0,
    "pbrHistoricalPct": 0,
    "evEbitda": 0,
    "evEbitdaHistoricalPct": 0,
    "fcfYield": 0,
    "peg": 0,
    "industryPercentile": 0,
    "normalizedEarnings": 0,
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
    "riskRewardRatio": "",
    "recommendation": "Strong Buy|Buy|Hold|Reduce|Avoid",
    "bearCase": "",
    "bearCaseProb": 0,
    "verdictOneLiner": ""
  },
  "scenarios": {
    "bull": { "price": 0, "prob": 0, "thesis": "" },
    "base": { "price": 0, "prob": 0, "thesis": "" },
    "bear": { "price": 0, "prob": 0, "thesis": "" }
  },
  "weightedFairValue": 0,
  "upsideDownside": 0,
  "verdict": "STRONG BUY|BUY|HOLD|REDUCE|AVOID",
  "confidence": 0,
  "dataSources": [],
  "uncertainties": []
}`;

  const USER = `현재 날짜: ${today}\n분석 대상: ${companyName}\n분석 깊이: ${depth === "deep" ? "심층 — 웹검색 5회 이상, 10년 재무 추이 포함" : "빠른 — 웹검색 3회, 핵심 지표만"}\n\nJSON만 반환하세요.`;

  try {
    const messages = [{ role: "user", content: USER }];
    let finalText = "";
    for (let i = 0; i < 12; i++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "web-search-2025-03-05",
        },
        body: JSON.stringify({ model: MODEL, max_tokens: depth === "deep" ? 6000 : 4000, system: SYSTEM, tools, messages }),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error.message);
      const texts = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
      if (texts) finalText = texts;
      if (data.stop_reason === "end_turn") break;
      if (data.stop_reason === "tool_use") {
        const uses = (data.content || []).filter(b => b.type === "tool_use");
        messages.push({ role: "assistant", content: data.content });
        messages.push({ role: "user", content: uses.map(tu => ({ type: "tool_result", tool_use_id: tu.id, content: (tu.content || []).map(c => typeof c === "string" ? c.slice(0, 800) : JSON.stringify(c).slice(0, 800)).join("\n") })) });
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
