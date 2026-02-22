import { useState, useEffect } from "react";

// ── 상수 ──────────────────────────────────────────────────────
const ADMIN_KEYS = ["haks-admin", "haks-owner"];
const ADMIN_PW   = "haks2026";
const STORAGE_STOCKS = "aos_stocks_v3";
const STORAGE_KEY    = "aos_admin_key";
const STORAGE_AKEY   = "aos_anthropic_key";

// ── 유틸 ──────────────────────────────────────────────────────
const fmt = (v, cur = "USD") => {
  if (v === null || v === undefined || v === 0 || isNaN(parseFloat(v))) return "—";
  const n = parseFloat(v);
  if (cur === "KRW") return n.toLocaleString("ko-KR") + "원";
  if (cur === "JPY") return "¥" + n.toLocaleString("ja-JP");
  if (cur === "HKD") return "HK$" + n.toLocaleString();
  if (cur === "EUR") return "€" + n.toLocaleString();
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const pct = (v, plus = true) => {
  if (v === null || v === undefined || isNaN(parseFloat(v))) return "—";
  const n = parseFloat(v);
  return (plus && n > 0 ? "+" : "") + n.toFixed(1) + "%";
};
const num = (v, d = 1) => (v === null || v === undefined || isNaN(parseFloat(v))) ? "—" : parseFloat(v).toFixed(d) + "x";
const stars = n => "★".repeat(Math.min(5, Math.round((n || 0) / 20))) + "☆".repeat(Math.max(0, 5 - Math.round((n || 0) / 20)));
const dateStr = iso => { try { return new Date(iso).toLocaleDateString("ko-KR"); } catch { return "—"; } };

const VERDICT_META = {
  "STRONG BUY": { color: "#10b981", bg: "#10b98115", border: "#10b98140" },
  "BUY":        { color: "#34d399", bg: "#34d39915", border: "#34d39940" },
  "HOLD":       { color: "#f59e0b", bg: "#f59e0b15", border: "#f59e0b40" },
  "REDUCE":     { color: "#f97316", bg: "#f9731615", border: "#f9731640" },
  "AVOID":      { color: "#ef4444", bg: "#ef444415", border: "#ef444440" },
};
const VM = v => VERDICT_META[v] || VERDICT_META["HOLD"];

const MACRO_COLOR  = { "긍정": "#10b981", "중립": "#f59e0b", "부정": "#ef4444" };
const MOAT_COLOR   = { "넓음": "#10b981", "보통": "#3b82f6", "좁음": "#f59e0b", "없음": "#ef4444" };

// ── 관리자 감지 ───────────────────────────────────────────────
const detectAdmin = () => {
  try {
    const p = new URLSearchParams(window.location.search).get("key");
    if (p && ADMIN_KEYS.includes(p)) {
      localStorage.setItem(STORAGE_KEY, p);
      sessionStorage.setItem(STORAGE_KEY, p);
      window.history.replaceState({}, "", window.location.pathname);
      return true;
    }
    const ss = sessionStorage.getItem(STORAGE_KEY);
    if (ss && ADMIN_KEYS.includes(ss)) return true;
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls && ADMIN_KEYS.includes(ls)) { sessionStorage.setItem(STORAGE_KEY, ls); return true; }
  } catch {}
  return false;
};

// ══════════════════════════════════════════════════════════════
// CSS
// ══════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#07090f;--surface:#0c0f1a;--card:#111827;--card2:#161f30;
  --border:#1a2332;--border2:#243044;
  --text:#e2e8f0;--muted:#64748b;--muted2:#8899aa;
  --accent:#f59e0b;--accent2:#fbbf24;
  --green:#10b981;--red:#ef4444;--blue:#3b82f6;--purple:#8b5cf6;
  --font:'Outfit',sans-serif;--mono:'JetBrains Mono',monospace;--serif:'Playfair Display',serif;
}
body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;}
input,button,select,textarea{font-family:var(--font);}
button{cursor:pointer;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}

/* Layout */
.layout{display:flex;min-height:100vh;}
.sidebar{width:224px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh;z-index:100;transition:transform .25s;}
.main{margin-left:224px;flex:1;padding:32px 36px;min-height:100vh;max-width:1400px;}

/* Sidebar */
.logo-wrap{padding:24px 20px 18px;border-bottom:1px solid var(--border);}
.logo-mark{font-family:var(--serif);font-size:21px;font-weight:700;color:var(--accent);letter-spacing:-.5px;}
.logo-sub{font-size:8px;letter-spacing:3px;color:var(--muted);font-family:var(--mono);margin-top:3px;}
.nav-section{padding:14px 10px;flex:1;overflow-y:auto;}
.nav-label{font-size:8px;letter-spacing:2.5px;color:var(--muted);font-family:var(--mono);padding:0 10px;margin:16px 0 6px;}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;font-size:13px;color:var(--muted2);cursor:pointer;transition:all .15s;margin-bottom:1px;}
.nav-item:hover{background:var(--card);color:var(--text);}
.nav-item.active{background:var(--accent)18;color:var(--accent);font-weight:500;}
.nav-icon{font-size:16px;width:20px;text-align:center;}
.nav-badge{margin-left:auto;background:var(--card2);color:var(--muted2);font-size:10px;font-family:var(--mono);padding:1px 6px;border-radius:10px;border:1px solid var(--border2);}
.sidebar-foot{padding:14px;border-top:1px solid var(--border);}

/* Cards */
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;}
.card2{background:var(--card2);border:1px solid var(--border);border-radius:10px;}

/* Stock grid */
.stock-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;}
.scard{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;}
.scard::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--vc,var(--border));}
.scard:hover{border-color:var(--border2);box-shadow:0 8px 32px #00000050;transform:translateY(-1px);}
.scard-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;}
.scard-ticker{font-family:var(--mono);font-size:18px;font-weight:700;}
.scard-name{font-size:11px;color:var(--muted);margin-top:2px;}
.scard-metrics{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;}
.scard-metric-l{font-size:8px;color:var(--muted);letter-spacing:1.5px;font-family:var(--mono);margin-bottom:2px;}
.scard-metric-v{font-size:14px;font-weight:600;font-family:var(--mono);}
.scard-pills{display:flex;gap:6px;flex-wrap:wrap;}
.pill{font-size:9px;padding:3px 8px;border-radius:4px;border:1px solid var(--border);color:var(--muted2);font-family:var(--mono);display:flex;align-items:center;gap:4px;}
.dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
.vtag{font-family:var(--mono);font-size:9px;font-weight:700;padding:4px 9px;border-radius:5px;letter-spacing:.5px;}
.deal-pill{font-size:9px;font-family:var(--mono);padding:2px 7px;border-radius:4px;background:#ef444412;color:#ef4444;border:1px solid #ef444430;}

/* Buttons */
.btn{padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;border:none;transition:all .15s;letter-spacing:.3px;display:inline-flex;align-items:center;gap:5px;}
.btn-primary{background:var(--accent);color:#000;}
.btn-primary:hover{background:var(--accent2);}
.btn-ghost{background:transparent;color:var(--muted2);border:1px solid var(--border);}
.btn-ghost:hover{border-color:var(--border2);color:var(--text);}
.btn-danger{background:transparent;color:var(--red);border:1px solid #ef444430;}
.btn-danger:hover{background:#ef444412;}
.btn-sm{padding:5px 12px;font-size:11px;border-radius:6px;}
.btn:disabled{opacity:.4;cursor:not-allowed;}

/* Input */
.inp{background:var(--surface);border:1px solid var(--border);color:var(--text);padding:10px 14px;border-radius:8px;font-size:13px;width:100%;outline:none;transition:border .15s;}
.inp:focus{border-color:var(--accent);}
.inp::placeholder{color:var(--muted);}

/* Stat boxes */
.stat-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.stat-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.stat-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.sbox{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px 16px;}
.sbox-l{font-size:8px;color:var(--muted);letter-spacing:2px;font-family:var(--mono);margin-bottom:6px;}
.sbox-v{font-size:20px;font-weight:600;font-family:var(--mono);}
.sbox-s{font-size:10px;color:var(--muted);margin-top:3px;}

/* Progress */
.prog{height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin-top:8px;}
.prog-f{height:100%;border-radius:2px;transition:width .6s ease;}

/* Scenario */
.sc-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);}
.sc-row:last-child{border-bottom:none;}
.sc-lbl{font-family:var(--mono);font-size:10px;font-weight:700;width:44px;}
.sc-bar{flex:1;height:5px;background:var(--border);border-radius:3px;overflow:hidden;}
.sc-fill{height:100%;border-radius:3px;}
.sc-price{font-family:var(--mono);font-size:12px;font-weight:600;width:90px;text-align:right;}
.sc-prob{font-family:var(--mono);font-size:9px;color:var(--muted);width:30px;text-align:right;}

/* Key points */
.kp-row{display:flex;gap:14px;padding:13px 0;border-bottom:1px solid var(--border)66;}
.kp-no{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--accent);min-width:24px;padding-top:1px;}
.kp-lbl{font-size:9px;color:var(--muted);font-family:var(--mono);letter-spacing:1px;margin-bottom:4px;}
.kp-txt{font-size:12px;color:var(--text);line-height:1.7;}

/* Table */
.tbl{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:11px;}
.tbl th{text-align:left;padding:8px 10px;color:var(--muted);font-size:8px;letter-spacing:1.5px;border-bottom:1px solid var(--border);font-weight:400;}
.tbl td{padding:9px 10px;border-bottom:1px solid var(--border)33;}
.tbl tr:last-child td{border-bottom:none;}
.tbl .hl td{color:var(--accent);}

/* Tabs */
.tabs{display:flex;gap:2px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:3px;margin-bottom:20px;}
.tab{flex:1;text-align:center;padding:8px 4px;font-size:11px;font-family:var(--mono);color:var(--muted);border-radius:7px;cursor:pointer;transition:all .15s;}
.tab.active{background:var(--card);color:var(--text);font-weight:500;}

/* Filters */
.filter-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:18px;}
.fchip{font-size:10px;padding:5px 12px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer;transition:all .15s;font-family:var(--mono);}
.fchip.active,.fchip:hover{background:var(--accent)18;border-color:var(--accent)66;color:var(--accent);}
.search-inp{background:var(--surface);border:1px solid var(--border);color:var(--text);padding:7px 14px;border-radius:8px;font-size:12px;outline:none;width:200px;transition:border .15s;}
.search-inp:focus{border-color:var(--border2);}
.search-inp::placeholder{color:var(--muted);}

/* Stats row */
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;}
.stat-top{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px 18px;}
.stat-top-n{font-family:var(--mono);font-size:30px;font-weight:700;}
.stat-top-l{font-size:9px;color:var(--muted);letter-spacing:1.5px;font-family:var(--mono);margin-top:4px;}

/* Deal */
.deal-row{display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)44;}
.deal-row:last-child{border-bottom:none;}
.deal-status{font-size:8px;font-family:var(--mono);padding:2px 7px;border-radius:4px;white-space:nowrap;margin-top:2px;flex-shrink:0;}

/* Events */
.ev-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)33;}
.ev-row:last-child{border-bottom:none;}

/* Check */
.check-row{display:flex;align-items:flex-start;gap:8px;font-size:11px;padding:5px 0;color:var(--muted2);line-height:1.5;}

/* Score */
.score-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
.score-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px;}
.score-lbl{font-size:8px;color:var(--muted);letter-spacing:2px;font-family:var(--mono);margin-bottom:8px;}
.score-n{font-family:var(--mono);font-size:26px;font-weight:700;}
.score-max{font-size:11px;color:var(--muted);}

/* Page title */
.page-title{font-family:var(--serif);font-size:26px;font-weight:400;margin-bottom:4px;}
.page-sub{font-size:11px;color:var(--muted);font-family:var(--mono);}
.topbar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;}

/* Overlay */
.overlay{position:fixed;inset:0;background:#00000088;backdrop-filter:blur(6px);z-index:999;display:flex;align-items:center;justify-content:center;}
.modal{background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:28px;width:360px;box-shadow:0 24px 64px #00000060;}

/* Analyze */
.analyze-wrap{max-width:560px;margin:0 auto;}
.depth-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;}
.depth-card{border:2px solid var(--border);border-radius:10px;padding:16px;cursor:pointer;transition:all .2s;}
.depth-card.active{border-color:var(--accent);background:var(--accent)0d;}
.phase-box{padding:18px;background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:14px;}
.phase-line{font-family:var(--mono);font-size:11px;padding:4px 0;color:var(--muted);transition:color .3s;}
.phase-line.active{color:var(--accent);}
.phase-line.done{color:var(--green);}

/* Animations */
@keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
@keyframes spin{to{transform:rotate(360deg);}}
@keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
.fade-in{animation:fadeIn .25s ease;}
.pulsing{animation:pulse 1.4s infinite;}
.spin{display:inline-block;animation:spin .9s linear infinite;}

/* Mobile */
.mob-nav{display:none;}
@media(max-width:768px){
  .sidebar{transform:translateX(-100%);}
  .sidebar.open{transform:translateX(0);}
  .main{margin-left:0;padding:16px;padding-bottom:72px;}
  .stats-row{grid-template-columns:1fr 1fr;}
  .stock-grid{grid-template-columns:1fr;}
  .stat-grid-2,.stat-grid-3,.stat-grid-4,.score-grid{grid-template-columns:1fr 1fr;}
  .mob-nav{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--surface);border-top:1px solid var(--border);z-index:100;}
  .mob-tab{flex:1;display:flex;flex-direction:column;align-items:center;padding:10px 0;font-size:8px;letter-spacing:1px;color:var(--muted);font-family:var(--mono);gap:3px;cursor:pointer;transition:color .15s;}
  .mob-tab.active{color:var(--accent);}
  .mob-tab-icon{font-size:19px;}
}
`;

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => detectAdmin());
  const [stocks, setStocks]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [view, setView]         = useState("dashboard");
  const [detailTab, setDetailTab] = useState("overview");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [keyInput, setKeyInput]         = useState("");

  // 검색/필터
  const [searchQ, setSearchQ]           = useState("");
  const [filterVerdict, setFilterVerdict] = useState("ALL");
  const [sortBy, setSortBy]             = useState("date");

  // 관리자 모달
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [pwInput, setPwInput]   = useState("");
  const [pwError, setPwError]   = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 로그인 후 실행할 액션

  // 삭제 확인
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 사이드바 모바일
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 로드
  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_STOCKS);
      if (s) setStocks(JSON.parse(s));
      const k = localStorage.getItem(STORAGE_AKEY);
      if (k) { setAnthropicKey(k); setKeyInput(k); }
    } catch {}
  }, []);

  const saveStocks = (data) => {
    setStocks(data);
    try { localStorage.setItem(STORAGE_STOCKS, JSON.stringify(data)); } catch {}
  };

  // 관리자 권한이 필요한 액션 요청
  const requireAdmin = (action) => {
    if (isAdmin) { action(); return; }
    setPendingAction(() => action);
    setShowAdminModal(true);
  };

  const handleAdminLogin = () => {
    if (pwInput === ADMIN_PW) {
      localStorage.setItem(STORAGE_KEY, "haks-admin");
      sessionStorage.setItem(STORAGE_KEY, "haks-admin");
      setIsAdmin(true);
      setShowAdminModal(false);
      setPwInput(""); setPwError(false);
      if (pendingAction) { pendingAction(); setPendingAction(null); }
    } else {
      setPwError(true);
      setTimeout(() => setPwError(false), 1500);
    }
  };

  const adminLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    setIsAdmin(false);
    setView("dashboard");
  };

  // 필터/정렬
  const filtered = stocks
    .filter(s => filterVerdict === "ALL" || s.ib?.verdict === filterVerdict)
    .filter(s => !searchQ || [s.name, s.ticker, s.sector].some(t => t?.toLowerCase().includes(searchQ.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === "date")    return new Date(b.analyzedAt||0) - new Date(a.analyzedAt||0);
      if (sortBy === "upside")  return (parseFloat(b.ib?.upsideDownside)||0) - (parseFloat(a.ib?.upsideDownside)||0);
      if (sortBy === "quality") return (b.quant?.verdict?.qualityScore||0) - (a.quant?.verdict?.qualityScore||0);
      if (sortBy === "mos")     return (b.quant?.valuation?.marginOfSafety||0) - (a.quant?.valuation?.marginOfSafety||0);
      return 0;
    });

  // ── 종목 카드 ──────────────────────────────────────────────
  const StockCard = ({ stock }) => {
    const vm = VM(stock.ib?.verdict);
    const upside = parseFloat(stock.ib?.upsideDownside) || 0;
    const hasDeals = stock.ib?.dealRadar?.items?.filter(d => d.title)?.length > 0;

    return (
      <div className="scard fade-in" style={{ "--vc": vm.color }}
        onClick={() => { setSelected(stock); setDetailTab("overview"); setView("detail"); }}>
        <div className="scard-head">
          <div>
            <div className="scard-ticker">{stock.ticker || "—"}</div>
            <div className="scard-name">{stock.name} · {stock.sector}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
            <span className="vtag" style={{ background:vm.bg, color:vm.color, border:`1px solid ${vm.border}` }}>
              {stock.ib?.verdict || "—"}
            </span>
            {hasDeals && <span className="deal-pill">🔍 딜</span>}
          </div>
        </div>

        <div className="scard-metrics">
          {[
            { l:"현재가", v: fmt(stock.currentPrice, stock.currency) },
            { l:"적정가", v: fmt(stock.ib?.weightedFairValue, stock.currency), c:"var(--accent)" },
            { l:"업사이드", v: pct(upside), c: upside>0?"var(--green)":upside<0?"var(--red)":"var(--text)" },
          ].map(m => (
            <div key={m.l}>
              <div className="scard-metric-l">{m.l}</div>
              <div className="scard-metric-v" style={{ color:m.c||"var(--text)" }}>{m.v}</div>
            </div>
          ))}
        </div>

        <div className="scard-pills">
          {stock.quant?.valuation?.marginOfSafety !== undefined && (
            <div className="pill">
              <div className="dot" style={{ background: stock.quant.valuation.marginOfSafety>30?"var(--green)":stock.quant.valuation.marginOfSafety>15?"var(--accent)":"var(--red)" }} />
              MOS {pct(stock.quant.valuation.marginOfSafety, false)}
            </div>
          )}
          {stock.quant?.verdict?.qualityScore !== undefined && (
            <div className="pill">
              <div className="dot" style={{ background: stock.quant.verdict.qualityScore>70?"var(--green)":"var(--accent)" }} />
              Q {stock.quant.verdict.qualityScore}
            </div>
          )}
          {stock.quant?.macro?.environment && (
            <div className="pill">
              <div className="dot" style={{ background: MACRO_COLOR[stock.quant.macro.environment]||"var(--muted)" }} />
              {stock.quant.macro.environment}
            </div>
          )}
          {stock.quant?.fundamental?.moatRating && stock.quant.fundamental.moatRating !== "없음" && (
            <div className="pill">
              <div className="dot" style={{ background: MOAT_COLOR[stock.quant.fundamental.moatRating]||"var(--muted)" }} />
              해자 {stock.quant.fundamental.moatRating}
            </div>
          )}
        </div>

        <div style={{ marginTop:12, paddingTop:10, borderTop:"1px solid var(--border)", display:"flex", justifyContent:"space-between" }}>
          <div style={{ fontSize:9, color:"var(--muted)", fontFamily:"var(--mono)" }}>{dateStr(stock.analyzedAt)}</div>
          <div style={{ fontSize:9, color:"var(--muted)", fontFamily:"var(--mono)" }}>{stars(stock.ib?.confidence||0)}</div>
        </div>
      </div>
    );
  };

  // ── 대시보드 ───────────────────────────────────────────────
  const Dashboard = () => {
    const buyC  = stocks.filter(s => ["STRONG BUY","BUY"].includes(s.ib?.verdict)).length;
    const holdC = stocks.filter(s => s.ib?.verdict === "HOLD").length;
    const avgUp = stocks.length
      ? (stocks.reduce((a,s)=>a+(parseFloat(s.ib?.upsideDownside)||0),0)/stocks.length).toFixed(1)
      : null;

    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-title">Research Desk</div>
            <div className="page-sub">{stocks.length}개 종목 · {new Date().toLocaleDateString("ko-KR")}</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => requireAdmin(() => setView("analyze"))}>
              🤖 AI 분석
            </button>
            {isAdmin
              ? <button className="btn btn-ghost btn-sm" onClick={() => setView("settings")}>⚙</button>
              : <button className="btn btn-ghost btn-sm" onClick={() => setShowAdminModal(true)}>🔑 관리자</button>
            }
          </div>
        </div>

        <div className="stats-row">
          {[
            { l:"TOTAL", v: stocks.length, c:"var(--text)" },
            { l:"BUY", v: buyC, c:"var(--green)" },
            { l:"HOLD", v: holdC, c:"var(--accent)" },
            { l:"AVG UPSIDE", v: avgUp !== null ? pct(avgUp) : "—", c: (avgUp||0)>0?"var(--green)":"var(--red)" },
          ].map(s => (
            <div key={s.l} className="stat-top">
              <div className="stat-top-n" style={{ color:s.c }}>{s.v}</div>
              <div className="stat-top-l">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="filter-row">
          <input className="search-inp" placeholder="종목 검색..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
          {["ALL","STRONG BUY","BUY","HOLD","REDUCE","AVOID"].map(v => (
            <button key={v} className={`fchip ${filterVerdict===v?"active":""}`} onClick={()=>setFilterVerdict(v)}>
              {v==="ALL"?"전체":v}
            </button>
          ))}
          <select className="fchip" style={{ cursor:"pointer" }} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="date">최신순</option>
            <option value="upside">업사이드순</option>
            <option value="quality">퀄리티순</option>
            <option value="mos">MOS순</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"var(--muted)" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
            <div style={{ fontSize:14, marginBottom:20 }}>
              {stocks.length === 0 ? "아직 분석된 종목이 없어요" : "검색 결과가 없어요"}
            </div>
            {stocks.length === 0 && (
              <button className="btn btn-primary" onClick={() => requireAdmin(() => setView("analyze"))}>
                첫 종목 분석하기
              </button>
            )}
          </div>
        ) : (
          <div className="stock-grid">
            {filtered.map(s => <StockCard key={s.id} stock={s} />)}
          </div>
        )}
      </div>
    );
  };

  // ── AI 분석 뷰 ─────────────────────────────────────────────
  const AnalyzeView = () => {
    const [company, setCompany] = useState("");
    const [depth, setDepth]     = useState("deep");
    const [loading, setLoading] = useState(false);
    const [phase, setPhase]     = useState(0);
    const [error, setError]     = useState("");

    const PHASES = [
      "1단계: 퀀트 분석 중... (매크로 · 재무 · 밸류에이션)",
      "2단계: IB 분석 중... (딜레이더 · DCF · Comps · 시나리오)",
      "분석 완료 ✓",
    ];

    const run = async () => {
      if (!company.trim()) return;
      if (!anthropicKey) { setError("설정에서 Anthropic API 키를 입력해주세요"); return; }
      setLoading(true); setError(""); setPhase(1);

      try {
        const r = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyName: company.trim(), anthropicKey, depth }),
        });
        setPhase(2);
        const data = await r.json();
        if (data.error) { setError(data.error); setPhase(0); setLoading(false); return; }
        setPhase(3);
        const updated = [data, ...stocks.filter(s=>s.id!==data.id)];
        saveStocks(updated);
        setSelected(data);
        setTimeout(() => { setDetailTab("overview"); setView("detail"); }, 600);
      } catch(e) {
        setError(e.message);
        setPhase(0);
      }
      setLoading(false);
    };

    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-title">AI 분석</div>
            <div className="page-sub">퀀트 트레이더 × IB 분석가 · 2단계 순차 분석</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setView("dashboard")}>← 뒤로</button>
        </div>

        <div className="analyze-wrap">
          <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:10 }}>ANALYSIS DEPTH</div>
          <div className="depth-grid">
            {[
              { v:"quick", icon:"⚡", label:"Quick", desc:"핵심만 · 40~70초", info:"웹검색 4~5회" },
              { v:"deep",  icon:"🔬", label:"Deep",  desc:"심층 분석 · 90~150초", info:"웹검색 6~9회" },
            ].map(d => (
              <div key={d.v} className={`depth-card ${depth===d.v?"active":""}`} onClick={() => !loading && setDepth(d.v)}>
                <div style={{ fontSize:22, marginBottom:8 }}>{d.icon}</div>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{d.label}</div>
                <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>{d.desc}</div>
                <div style={{ fontSize:9, color:"var(--muted)", fontFamily:"var(--mono)" }}>{d.info}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:10, marginBottom:14 }}>
            <input className="inp" placeholder="기업명 또는 티커 (예: 삼성전자 / NVDA / TSMC)"
              value={company} onChange={e => setCompany(e.target.value)}
              onKeyDown={e => e.key==="Enter" && !loading && run()}
              disabled={loading} autoFocus />
            <button className="btn btn-primary" style={{ whiteSpace:"nowrap", padding:"10px 20px" }}
              onClick={run} disabled={loading || !company.trim()}>
              {loading ? <span className="spin">◐</span> : "분석 시작"}
            </button>
          </div>

          {loading && (
            <div className="phase-box">
              {PHASES.map((p,i) => (
                <div key={i} className={`phase-line ${phase===i+1?"active pulsing":phase>i+1?"done":""}`}>
                  {phase>i+1?"✓ ":phase===i+1?"◐ ":"○ "}{p}
                </div>
              ))}
              <div style={{ marginTop:14, height:2, background:"var(--border)", borderRadius:1, overflow:"hidden" }}>
                <div style={{ height:"100%", background:"var(--accent)", width:`${(phase/3)*100}%`, transition:"width .5s", borderRadius:1 }} />
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding:"12px 16px", background:"#ef444412", border:"1px solid #ef444430", borderRadius:8, fontSize:12, color:"var(--red)" }}>
              {error}
            </div>
          )}

          {!loading && (
            <div style={{ marginTop:24, padding:18, background:"var(--surface)", borderRadius:10, border:"1px solid var(--border)" }}>
              <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>분석 포함 항목</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                {[
                  ["퀀트","매크로 환경 (금리·GDP·사이클)"],
                  ["퀀트","산업 구조 & Porter's Five Forces"],
                  ["퀀트","10년 재무 추이 (ROE·ROIC·FCF)"],
                  ["퀀트","밸류에이션 역사적/업종 백분위"],
                  ["IB","딜 레이더 (M&A·IPO·규제·행동주의)"],
                  ["IB","DCF + 비교기업 Comps"],
                  ["IB","Bull/Base/Bear 시나리오"],
                  ["IB","10 Key Points + 역산검증"],
                ].map(([tag, item]) => (
                  <div key={item} style={{ display:"flex", gap:7, alignItems:"flex-start", fontSize:11, color:"var(--muted2)" }}>
                    <span style={{ fontFamily:"var(--mono)", fontSize:8, padding:"2px 5px", borderRadius:3,
                      background: tag==="퀀트"?"#3b82f618":"#8b5cf618",
                      color: tag==="퀀트"?"var(--blue)":"var(--purple)", flexShrink:0 }}>{tag}</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── 상세 뷰 ────────────────────────────────────────────────
  const DetailView = ({ stock }) => {
    if (!stock) return null;
    const vm = VM(stock.ib?.verdict);
    const q  = stock.quant || {};
    const ib = stock.ib || {};
    const sc = ib.scenarios || {};

    return (
      <div className="fade-in">
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
              <div style={{ fontFamily:"var(--mono)", fontSize:28, fontWeight:700 }}>{stock.ticker}</div>
              <span className="vtag" style={{ background:vm.bg, color:vm.color, border:`1px solid ${vm.border}`, fontSize:11, padding:"5px 11px" }}>
                {ib.verdict || "—"}
              </span>
              {ib.dealRadar?.items?.filter(d=>d.title)?.length > 0 && (
                <span className="deal-pill" style={{ fontSize:10 }}>🔍 딜 감지</span>
              )}
            </div>
            <div style={{ fontSize:13, color:"var(--muted2)" }}>{stock.name} · {stock.sector} · {stock.exchange}</div>
            <div style={{ fontSize:9, color:"var(--muted)", fontFamily:"var(--mono)", marginTop:5 }}>
              분석일: {dateStr(stock.analyzedAt)} · 신뢰도: {stars(ib.confidence||0)}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setView("dashboard")}>← 목록</button>
            <button className="btn btn-ghost btn-sm" onClick={() => requireAdmin(() => setView("analyze"))}>🤖 재분석</button>
            {isAdmin && (
              <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}>삭제</button>
            )}
          </div>
        </div>

        {/* 가격 요약 */}
        <div className="stat-grid-3" style={{ marginBottom:18 }}>
          {[
            { l:"현재가", v: fmt(stock.currentPrice, stock.currency) },
            { l:"확률가중 적정가", v: fmt(ib.weightedFairValue, stock.currency), c:"var(--accent)" },
            { l:"업사이드", v: pct(ib.upsideDownside), c:(ib.upsideDownside||0)>0?"var(--green)":"var(--red)" },
            { l:"DCF 적정가", v: fmt(ib.dcf?.fairValue, stock.currency) },
            { l:"Comps 적정가", v: fmt(ib.comps?.impliedValue, stock.currency) },
            { l:"MOS", v: pct(q.valuation?.marginOfSafety, false), c:(q.valuation?.marginOfSafety||0)>30?"var(--green)":"var(--accent)" },
          ].map(m => (
            <div key={m.l} className="sbox">
              <div className="sbox-l">{m.l}</div>
              <div className="sbox-v" style={{ color:m.c||"var(--text)", fontSize:18 }}>{m.v}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { k:"overview", l:"개요" },
            { k:"quant",    l:"퀀트" },
            { k:"ib",       l:"IB 분석" },
            { k:"keypoints",l:"10 Key Points" },
            { k:"comps",    l:"Comps" },
          ].map(t => (
            <div key={t.k} className={`tab ${detailTab===t.k?"active":""}`} onClick={() => setDetailTab(t.k)}>{t.l}</div>
          ))}
        </div>

        {/* ── 개요 탭 ── */}
        {detailTab === "overview" && (
          <div className="fade-in">
            {ib.verdictOneLiner && (
              <div style={{ padding:"15px 18px", background:`${vm.color}10`, border:`1px solid ${vm.color}28`, borderRadius:10, marginBottom:16, fontSize:13, lineHeight:1.8, color:"var(--text)" }}>
                💬 {ib.verdictOneLiner}
              </div>
            )}
            <div className="card" style={{ padding:20, marginBottom:14 }}>
              <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>SCENARIOS</div>
              {[
                { k:"bull", l:"BULL", c:"var(--green)" },
                { k:"base", l:"BASE", c:"var(--accent)" },
                { k:"bear", l:"BEAR", c:"var(--red)" },
              ].map(s => sc[s.k] && (
                <div key={s.k} className="sc-row">
                  <div className="sc-lbl" style={{ color:s.c }}>{s.l}</div>
                  <div className="sc-bar"><div className="sc-fill" style={{ width:`${sc[s.k].prob||0}%`, background:s.c }} /></div>
                  <div className="sc-price" style={{ color:s.c }}>{fmt(sc[s.k].price, stock.currency)}</div>
                  <div className="sc-prob">{sc[s.k].prob}%</div>
                </div>
              ))}
              {sc.base?.thesis && (
                <div style={{ marginTop:14, fontSize:11, color:"var(--muted2)", lineHeight:1.7 }}>{sc.base.thesis}</div>
              )}
            </div>

            {ib.priceEvents?.filter(e=>e.event)?.length > 0 && (
              <div className="card" style={{ padding:20, marginBottom:14 }}>
                <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>이벤트별 주가 영향</div>
                {ib.priceEvents.filter(e=>e.event).map((e,i) => (
                  <div key={i} className="ev-row">
                    <div style={{ fontSize:12, color:"var(--text)" }}>{e.event}</div>
                    <div style={{ fontFamily:"var(--mono)", display:"flex", gap:12, alignItems:"center" }}>
                      <span style={{ fontSize:12, fontWeight:600, color:e.impact>0?"var(--green)":"var(--red)" }}>
                        {e.impact>0?"+":""}{e.impact}%
                      </span>
                      <span style={{ fontSize:10, color:"var(--muted)" }}>{e.impactPrice?fmt(e.impactPrice,stock.currency):""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="card" style={{ padding:20 }}>
              <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>🔍 딜 레이더</div>
              {ib.dealRadar?.items?.filter(d=>d.title)?.length > 0 ? (
                ib.dealRadar.items.filter(d=>d.title).map((d,i) => (
                  <div key={i} className="deal-row">
                    <span className="deal-status" style={{
                      background: d.status==="공식발표"?"#10b98118":d.status==="루머"?"#f59e0b18":"#3b82f618",
                      color: d.status==="공식발표"?"var(--green)":d.status==="루머"?"var(--accent)":"var(--blue)",
                    }}>{d.status}</span>
                    <div>
                      <div style={{ fontSize:12, marginBottom:3 }}>{d.title}</div>
                      <div style={{ fontSize:10, color:"var(--muted)" }}>{d.impact} · {d.valImpact}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize:12, color:"var(--muted)" }}>현재 확인된 주요 딜 현안 없음</div>
              )}
            </div>
          </div>
        )}

        {/* ── 퀀트 탭 ── */}
        {detailTab === "quant" && (
          <div className="fade-in">
            <div className="score-grid" style={{ marginBottom:14 }}>
              {[
                { l:"QUALITY",  v:q.verdict?.qualityScore,  c:"var(--green)" },
                { l:"VALUE",    v:q.verdict?.valueScore,    c:"var(--blue)" },
                { l:"MOMENTUM", v:q.verdict?.momentumScore, c:"var(--purple)" },
              ].map(s => (
                <div key={s.l} className="score-card">
                  <div className="score-lbl">{s.l}</div>
                  <div className="score-n" style={{ color:s.c }}>{s.v??<span style={{color:"var(--muted)"}}>—</span>}<span className="score-max">/100</span></div>
                  <div className="prog"><div className="prog-f" style={{ width:`${s.v||0}%`, background:s.c }} /></div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding:20, marginBottom:14 }}>
              <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>매크로 환경</div>
              <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:10 }}>
                <div style={{ fontSize:20, fontWeight:700, color: MACRO_COLOR[q.macro?.environment]||"var(--muted)" }}>
                  {q.macro?.environment || "—"}
                </div>
                <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--mono)" }}>사이클: {q.macro?.cyclePosition || "—"}</div>
              </div>
              <div style={{ fontSize:12, color:"var(--muted2)", lineHeight:1.8, marginBottom:10 }}>{q.macro?.summary}</div>
              {q.macro?.keyRisks?.length > 0 && (
                <div style={{ fontSize:11, color:"var(--red)" }}>⚠️ {q.macro.keyRisks.join(" · ")}</div>
              )}
            </div>

            <div className="card" style={{ padding:20, marginBottom:14 }}>
              <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>기업 본질</div>
              <div className="stat-grid-3" style={{ marginBottom:14 }}>
                {[
                  { l:"ROE", v: pct(q.fundamental?.roe, false) },
                  { l:"ROIC", v: pct(q.fundamental?.roic, false) },
                  { l:"영업이익률", v: pct(q.fundamental?.operatingMargin, false) },
                  { l:"5Y 매출성장", v: pct(q.fundamental?.revenueGrowth5Y, false) },
                  { l:"FCF 전환율", v: pct(q.fundamental?.fcfConversion, false) },
                  { l:"부채비율", v: pct(q.fundamental?.debtRatio, false) },
                ].map(m => (
                  <div key={m.l} className="sbox">
                    <div className="sbox-l">{m.l}</div>
                    <div style={{ fontFamily:"var(--mono)", fontSize:16, fontWeight:600 }}>{m.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:10, marginBottom:10 }}>
                <div className="pill">해자 <span style={{ color: MOAT_COLOR[q.fundamental?.moatRating]||"var(--muted)", marginLeft:4 }}>{q.fundamental?.moatRating||"—"}</span></div>
                <div className="pill">수익 안정성 {q.fundamental?.earningsStability||"—"}</div>
              </div>
              {q.fundamental?.moatEvidence && (
                <div style={{ fontSize:11, color:"var(--muted2)", lineHeight:1.7 }}>{q.fundamental.moatEvidence}</div>
              )}
            </div>

            <div className="card" style={{ padding:20 }}>
              <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>밸류에이션</div>
              <div className="stat-grid-4" style={{ marginBottom:14 }}>
                {[
                  { l:"P/E", v: num(q.valuation?.per) },
                  { l:"P/B", v: num(q.valuation?.pbr) },
                  { l:"EV/EBITDA", v: num(q.valuation?.evEbitda) },
                  { l:"FCF Yield", v: pct(q.valuation?.fcfYield, false) },
                ].map(m => (
                  <div key={m.l} className="sbox">
                    <div className="sbox-l">{m.l}</div>
                    <div style={{ fontFamily:"var(--mono)", fontSize:15, fontWeight:600 }}>{m.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:24, fontSize:10, color:"var(--muted)", fontFamily:"var(--mono)", marginBottom:12 }}>
                <span>역사적 백분위 <span style={{ color:"var(--text)" }}>{q.valuation?.historicalPercentile ?? "—"}%</span></span>
                <span>업종 백분위 <span style={{ color:"var(--text)" }}>{q.valuation?.industryPercentile ?? "—"}%</span></span>
              </div>
              {q.valuation?.summary && <div style={{ fontSize:12, color:"var(--muted2)", lineHeight:1.7 }}>{q.valuation.summary}</div>}
            </div>
          </div>
        )}

        {/* ── IB 탭 ── */}
        {detailTab === "ib" && (
          <div className="fade-in">
            <div className="card" style={{ padding:20, marginBottom:14 }}>
              <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>DCF 모델</div>
              <div style={{ display:"flex", gap:24, fontSize:11, fontFamily:"var(--mono)", color:"var(--muted)", marginBottom:16 }}>
                <span>WACC <span style={{ color:"var(--text)" }}>{pct(ib.dcf?.wacc, false)}</span></span>
                <span>터미널성장률 <span style={{ color:"var(--text)" }}>{pct(ib.dcf?.terminalGrowth, false)}</span></span>
                <span>DCF 적정가 <span style={{ color:"var(--accent)" }}>{fmt(ib.dcf?.fairValue, stock.currency)}</span></span>
              </div>
              {ib.dcf?.assumptions?.length > 0 && (
                <div style={{ overflowX:"auto" }}>
                  <table className="tbl">
                    <thead><tr>{["가정 항목","적용값","근거","민감도"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {ib.dcf.assumptions.map((a,i) => (
                        <tr key={i}>
                          <td style={{ color:"var(--muted2)" }}>{a.item}</td>
                          <td style={{ color:"var(--accent)" }}>{a.value}</td>
                          <td style={{ color:"var(--muted)" }}>{a.basis}</td>
                          <td style={{ color:"var(--muted)" }}>{a.sensitivity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {ib.reverseCheck && (
              <div className="card" style={{ padding:20, marginBottom:14 }}>
                <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:12 }}>역산 검증</div>
                <div style={{ display:"flex", gap:24, fontSize:11, fontFamily:"var(--mono)", color:"var(--muted)", marginBottom:10 }}>
                  <span>내재 성장률 <span style={{ color:"var(--text)" }}>{ib.reverseCheck.impliedGrowth||"—"}</span></span>
                  <span>시장 비교 <span style={{ color:"var(--text)" }}>{ib.reverseCheck.vsMarket||"—"}</span></span>
                </div>
                {ib.reverseCheck.warning && (
                  <div style={{ fontSize:11, color:"var(--accent)", background:"var(--accent)0d", padding:"8px 12px", borderRadius:6, border:"1px solid var(--accent)28" }}>
                    ⚠️ {ib.reverseCheck.warning}
                  </div>
                )}
              </div>
            )}

            {ib.reliability && (
              <div className="card" style={{ padding:20 }}>
                <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:12 }}>📋 신뢰도 체크리스트</div>
                <div className="check-row">📌 데이터 출처: {ib.reliability.realDataSources?.join(", ")||"—"}</div>
                <div className="check-row">📊 추정/가정 비율: {ib.reliability.estimateRatio||"—"}</div>
                {ib.reliability.topUncertainties?.map((u,i) => u && <div key={i} className="check-row">⚠️ {u}</div>)}
                {ib.reliability.limitations && <div style={{ marginTop:8, fontSize:11, color:"var(--muted)", lineHeight:1.6 }}>{ib.reliability.limitations}</div>}
              </div>
            )}
          </div>
        )}

        {/* ── 10 Key Points 탭 ── */}
        {detailTab === "keypoints" && (
          <div className="fade-in">
            <div className="card" style={{ padding:22 }}>
              <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:16 }}>
                🎯 {stock.ticker} — 10 KEY POINTS
              </div>
              {(ib.keyPoints||[]).map((kp,i) => (
                <div key={i} className="kp-row">
                  <div className="kp-no">{"①②③④⑤⑥⑦⑧⑨⑩"[i]||`${i+1}`}</div>
                  <div>
                    <div className="kp-lbl">{kp.label}</div>
                    <div className="kp-txt">{kp.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Comps 탭 ── */}
        {detailTab === "comps" && (
          <div className="fade-in">
            <div className="card" style={{ padding:20 }}>
              <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>비교기업 분석 (Trading Comps)</div>
              <div style={{ display:"flex", gap:24, fontSize:11, fontFamily:"var(--mono)", color:"var(--muted)", marginBottom:16 }}>
                <span>Comps 적정가 <span style={{ color:"var(--accent)" }}>{fmt(ib.comps?.impliedValue, stock.currency)}</span></span>
                <span>프리미엄/디스카운트 <span style={{ color:"var(--text)" }}>{pct(ib.comps?.premiumDiscount)}</span></span>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table className="tbl">
                  <thead><tr>{["기업","티커","P/E","EV/EBITDA","P/B","매출성장"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {(ib.comps?.peers||[]).map((p,i) => (
                      <tr key={i} className={p.ticker===stock.ticker?"hl":""}>
                        <td>{p.name}</td>
                        <td style={{ color:"var(--muted2)" }}>{p.ticker}</td>
                        <td>{p.per?p.per.toFixed(1)+"x":"—"}</td>
                        <td>{p.evEbitda?p.evEbitda.toFixed(1)+"x":"—"}</td>
                        <td>{p.pbr?p.pbr.toFixed(1)+"x":"—"}</td>
                        <td style={{ color:(p.revenueGrowth||0)>0?"var(--green)":"var(--red)" }}>{pct(p.revenueGrowth)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ib.comps?.summary && <div style={{ marginTop:14, fontSize:12, color:"var(--muted2)", lineHeight:1.7 }}>{ib.comps.summary}</div>}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── 설정 뷰 ────────────────────────────────────────────────
  const SettingsView = () => (
    <div className="fade-in">
      <div className="topbar">
        <div>
          <div className="page-title">설정</div>
          <div className="page-sub">API 키 및 데이터 관리</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setView("dashboard")}>← 뒤로</button>
      </div>
      <div style={{ maxWidth:480 }}>
        <div className="card" style={{ padding:22, marginBottom:14 }}>
          <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>ANTHROPIC API KEY</div>
          <div style={{ fontSize:12, color:"var(--muted)", marginBottom:12 }}>AI 분석에 사용 (Claude claude-opus-4-6 + 웹검색)</div>
          <div style={{ display:"flex", gap:8 }}>
            <input className="inp" type="password" placeholder="sk-ant-..." value={keyInput} onChange={e=>setKeyInput(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={() => {
              setAnthropicKey(keyInput);
              try { localStorage.setItem(STORAGE_AKEY, keyInput); } catch {}
            }}>저장</button>
          </div>
          {anthropicKey && <div style={{ fontSize:9, color:"var(--green)", fontFamily:"var(--mono)", marginTop:8 }}>✓ 키 등록됨</div>}
        </div>

        <div className="card" style={{ padding:22, marginBottom:14 }}>
          <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>데이터 관리</div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-danger btn-sm" onClick={() => {
              if (window.confirm("모든 분석 데이터를 삭제할까요?")) {
                saveStocks([]); setSelected(null); setView("dashboard");
              }
            }}>전체 초기화</button>
            <button className="btn btn-danger btn-sm" onClick={adminLogout}>관리자 로그아웃</button>
          </div>
        </div>

        <div className="card" style={{ padding:22 }}>
          <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:12 }}>접속 정보</div>
          <div style={{ fontSize:11, fontFamily:"var(--mono)", color:"var(--muted2)", lineHeight:2.2 }}>
            <div>관리자 URL: ?key=haks-admin</div>
            <div>관리자 PW: haks2026</div>
            <div style={{ marginTop:6, fontSize:10, color:"var(--muted)" }}>일반 방문자는 URL만으로 열람 가능</div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── 렌더링 ─────────────────────────────────────────────────
  const NAV = [
    { k:"dashboard", icon:"📊", label:"대시보드", badge: stocks.length||null },
    { k:"compare",   icon:"⚖", label:"비교" },
    ...(isAdmin ? [
      { k:"analyze",  icon:"🤖", label:"AI 분석" },
      { k:"settings", icon:"⚙", label:"설정" },
    ] : []),
  ];

  const renderView = () => {
    if (view === "dashboard") return <Dashboard />;
    if (view === "analyze")   return isAdmin ? <AnalyzeView /> : <Dashboard />;
    if (view === "detail" && selected) return <DetailView stock={selected} />;
    if (view === "settings")  return isAdmin ? <SettingsView /> : <Dashboard />;
    return <Dashboard />;
  };

  return (
    <>
      <style>{CSS}</style>

      {/* 관리자 로그인 모달 */}
      {showAdminModal && (
        <div className="overlay" onClick={() => setShowAdminModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily:"var(--serif)", fontSize:21, marginBottom:6 }}>관리자 로그인</div>
            <div style={{ fontSize:12, color:"var(--muted)", marginBottom:20, lineHeight:1.6 }}>
              분석 추가·수정·삭제는 관리자 전용입니다.
            </div>
            <input className="inp" type="password" placeholder="비밀번호"
              value={pwInput} onChange={e => setPwInput(e.target.value)}
              onKeyDown={e => e.key==="Enter" && handleAdminLogin()}
              style={{ marginBottom:8, border: pwError?"1px solid var(--red)":undefined }}
              autoFocus />
            {pwError && <div style={{ fontSize:11, color:"var(--red)", marginBottom:10 }}>비밀번호가 틀렸어요</div>}
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={() => { setShowAdminModal(false); setPwInput(""); }}>취소</button>
              <button className="btn btn-primary btn-sm" style={{ flex:1 }} onClick={handleAdminLogin}>로그인</button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily:"var(--serif)", fontSize:20, marginBottom:8 }}>종목 삭제</div>
            <div style={{ fontSize:13, color:"var(--muted2)", marginBottom:22, lineHeight:1.6 }}>
              <strong style={{ color:"var(--text)" }}>{selected?.name}</strong> 분석을 삭제할까요?<br/>이 작업은 되돌릴 수 없어요.
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={() => setShowDeleteConfirm(false)}>취소</button>
              <button className="btn btn-danger btn-sm" style={{ flex:1 }} onClick={() => {
                saveStocks(stocks.filter(s => s.id !== selected?.id));
                setSelected(null); setShowDeleteConfirm(false); setView("dashboard");
              }}>삭제</button>
            </div>
          </div>
        </div>
      )}

      <div className="layout">
        {/* 사이드바 */}
        <div className={`sidebar ${sidebarOpen?"open":""}`}>
          <div className="logo-wrap">
            <div className="logo-mark">AnalystOS</div>
            <div className="logo-sub">RESEARCH PLATFORM v3</div>
          </div>
          <nav className="nav-section">
            <div className="nav-label">MENU</div>
            {NAV.map(item => (
              <div key={item.k} className={`nav-item ${view===item.k?"active":""}`}
                onClick={() => { setView(item.k); setSidebarOpen(false); }}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </div>
            ))}
            {!isAdmin && (
              <>
                <div className="nav-label" style={{ marginTop:24 }}>ADMIN</div>
                <div className="nav-item" onClick={() => requireAdmin(() => setView("analyze"))}>
                  <span className="nav-icon">🤖</span> AI 분석
                </div>
                <div className="nav-item" onClick={() => setShowAdminModal(true)}>
                  <span className="nav-icon">🔑</span> 관리자 로그인
                </div>
              </>
            )}
          </nav>
          <div className="sidebar-foot">
            <div style={{
              fontSize:10, fontFamily:"var(--mono)", padding:"7px 12px", borderRadius:7, textAlign:"center",
              background: isAdmin?"var(--accent)18":"var(--surface)",
              color: isAdmin?"var(--accent)":"var(--muted)",
              border: `1px solid ${isAdmin?"var(--accent)33":"var(--border)"}`,
            }}>
              {isAdmin ? "★ ADMIN" : "👁 VIEWER"}
            </div>
          </div>
        </div>

        {/* 메인 */}
        <main className="main">{renderView()}</main>

        {/* 모바일 바텀 탭 */}
        <div className="mob-nav">
          {[
            { k:"dashboard", icon:"📊", l:"홈" },
            { k:"analyze",   icon:"🤖", l:"분석", admin:true },
            { k:"compare",   icon:"⚖",  l:"비교" },
            { k:"settings",  icon:"⚙",  l:"설정", admin:true },
          ].map(t => (
            <div key={t.k} className={`mob-tab ${view===t.k?"active":""}`}
              onClick={() => t.admin ? requireAdmin(() => setView(t.k)) : setView(t.k)}>
              <span className="mob-tab-icon">{t.icon}</span>
              {t.l}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
