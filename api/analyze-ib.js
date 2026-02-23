export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { companyName, anthropicKey, depth = "deep" } = req.body;
  if (!companyName || !anthropicKey) return res.status(400).json({ error: "필수 파라미터 없음" });

  const MODEL = "claude-sonnet-4-6";
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const tools = [{ name: "web_search", type: "web_search_20250305" }];

  const SYSTEM = `당신은 월스트리트 투자은행 출신의 시니어 재무 분석가입니다.

■ 핵심 작동 방식
기업명만 입력받으면 알아서 판단하여 적합한 분석을 자동 실행합니다. 질문하지 말고 바로 분석하세요.

■ 할루시네이션 방어 규칙 (최우선)
• 모든 숫자: [실제]/[추정]/[가정] 태깅 필수
• 웹 검색으로 확인된 데이터만 [실제] 태그
• 비교기업: 실존 상장사만. 멀티플 지어내기 금지
• 존재하지 않는 M&A 딜 생성 금지

■ 자동 판단 로직
• 상장사 → DCF + Comps + 민감도
• 비상장 스타트업 → 운영모델 + 유닛이코노믹스 + DCF
• 지주사/대기업 → SOTP + 부문별 Comps
• 판단 애매 → DCF + Comps + 민감도 기본 실행

■ 딜 레이더 (모든 분석에 자동 적용)
웹 검색으로 반드시 탐색: Pending M&A, 관계사 딜, 경쟁사 딜, 규제/반독점, 주주행동주의, 지분 변동
루머/공식 구분. 출처 필수.

■ 분석 프레임워크
1. DCF: FCFF = EBIT×(1-Tax) + D&A - Capex - ΔNWC / WACC, 터미널, 민감도, 역산
2. Trading Comps: 피어 7~15개, P/E·EV/EBITDA·P/B, 백분위
3. SOTP: 부문 분리, 옵션가치 별도
4. 민감도 & 시나리오: 확률가중, 이벤트별 주가 영향

반드시 아래 JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "ticker": "",
  "name": "",
  "market": "US|KR|HK|JP|EU",
  "exchange": "",
  "sector": "",
  "currency": "USD|KRW|JPY|HKD|EUR",
  "currentPrice": 0,
  "analysisType": "IB",
  "keyPoints": [
    { "no": 1, "label": "최종 판단", "content": "" },
    { "no": 2, "label": "DCF 인사이트", "content": "" },
    { "no": 3, "label": "Comps 인사이트", "content": "" },
    { "no": 4, "label": "시나리오 핵심", "content": "" },
    { "no": 5, "label": "가장 중요한 변수", "content": "" },
    { "no": 6, "label": "시장이 놓치는 것", "content": "" },
    { "no": 7, "label": "최대 리스크", "content": "" },
    { "no": 8, "label": "딜 레이더", "content": "" },
    { "no": 9, "label": "업사이드 촉매 + 신뢰도", "content": "" },
    { "no": 10, "label": "액션 아이템", "content": "" }
  ],
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
  "verdictOneLiner": "",
  "verdict": "STRONG BUY|BUY|HOLD|REDUCE|AVOID",
  "confidence": 0,
  "priceEvents": [{ "event": "", "impact": 0, "impactPrice": 0, "basis": "" }],
  "reverseCheck": { "impliedGrowth": "", "vsMarket": "", "warning": "" },
  "reliability": { "realDataSources": [], "estimateRatio": "", "topUncertainties": [], "limitations": "" }
}`;

  const USER = `현재 날짜: ${today}\n분석 대상: ${companyName}\n분석 깊이: ${depth === "deep" ? "심층 — 웹검색 5회 이상" : "빠른 — 웹검색 3회"}\n\nJSON만 반환하세요.`;

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
        body: JSON.stringify({ model: MODEL, max_tokens: depth === "deep" ? 8000 : 5000, system: SYSTEM, tools, messages }),
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
    return res.status(200).json({ ...result, analyzedAt: new Date().toISOString(), depth, id: Date.now().toString(), analysisType: "IB" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
