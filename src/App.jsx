import { useState, useEffect } from "react";

const ADMIN_KEYS = ["haks-admin", "haks-owner"];
const ADMIN_PW   = "haks2026";
const STORAGE_STOCKS = "aos_stocks_v4";
const STORAGE_KEY    = "aos_admin_key";
const STORAGE_AKEY   = "aos_anthropic_key";

const fmt = (v, cur = "USD") => {
  if (!v || isNaN(parseFloat(v))) return "—";
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
const stars = n => "★".repeat(Math.min(5, Math.round((n||0)/20))) + "☆".repeat(Math.max(0, 5 - Math.round((n||0)/20)));
const dateStr = iso => { try { return new Date(iso).toLocaleDateString("ko-KR"); } catch { return "—"; } };

const IB_VM = {
  "STRONG BUY": { color:"#10b981", bg:"#10b98115", border:"#10b98140" },
  "BUY":        { color:"#34d399", bg:"#34d39915", border:"#34d39940" },
  "HOLD":       { color:"#f59e0b", bg:"#f59e0b15", border:"#f59e0b40" },
  "REDUCE":     { color:"#f97316", bg:"#f9731615", border:"#f9731640" },
  "AVOID":      { color:"#ef4444", bg:"#ef444415", border:"#ef444440" },
};
const QUANT_VM = {
  "Strong Buy": { color:"#10b981", bg:"#10b98115", border:"#10b98140" },
  "Buy":        { color:"#34d399", bg:"#34d39915", border:"#34d39940" },
  "Hold":       { color:"#f59e0b", bg:"#f59e0b15", border:"#f59e0b40" },
  "Reduce":     { color:"#f97316", bg:"#f9731615", border:"#f9731640" },
  "Avoid":      { color:"#ef4444", bg:"#ef444415", border:"#ef444440" },
};
const MOAT_C = { "넓음":"#10b981","보통":"#3b82f6","좁음":"#f59e0b","없음":"#ef4444" };
const MACRO_C = { "긍정":"#10b981","중립":"#f59e0b","부정":"#ef4444" };

const getVM = (s) => {
  if (s.analysisType === "QUANT") return QUANT_VM[s.quantVerdict?.recommendation] || QUANT_VM["Hold"];
  return IB_VM[s.verdict] || IB_VM["HOLD"];
};
const getVerdict = (s) => s.analysisType === "QUANT" ? s.quantVerdict?.recommendation : s.verdict;

const detectAdmin = () => {
  try {
    const p = new URLSearchParams(window.location.search).get("key");
    if (p && ADMIN_KEYS.includes(p)) {
      localStorage.setItem(STORAGE_KEY, p); sessionStorage.setItem(STORAGE_KEY, p);
      window.history.replaceState({}, "", window.location.pathname); return true;
    }
    const ss = sessionStorage.getItem(STORAGE_KEY);
    if (ss && ADMIN_KEYS.includes(ss)) return true;
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls && ADMIN_KEYS.includes(ls)) { sessionStorage.setItem(STORAGE_KEY, ls); return true; }
  } catch {}
  return false;
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@400;700&display=swap');
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
input,button,select{font-family:var(--font);}button{cursor:pointer;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}

.layout{display:flex;min-height:100vh;}
.sidebar{width:220px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh;z-index:100;}
.main{margin-left:220px;flex:1;padding:32px 36px;}

.logo-wrap{padding:22px 18px 16px;border-bottom:1px solid var(--border);}
.logo-mark{font-family:var(--serif);font-size:20px;font-weight:700;color:var(--accent);}
.logo-sub{font-size:8px;letter-spacing:3px;color:var(--muted);font-family:var(--mono);margin-top:3px;}
.nav-section{padding:12px 8px;flex:1;}
.nav-lbl{font-size:8px;letter-spacing:2.5px;color:var(--muted);font-family:var(--mono);padding:0 10px;margin:14px 0 5px;}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:7px;font-size:13px;color:var(--muted2);cursor:pointer;transition:all .15s;margin-bottom:1px;}
.nav-item:hover{background:var(--card);color:var(--text);}
.nav-item.active{background:var(--accent)18;color:var(--accent);font-weight:500;}
.nav-icon{font-size:15px;width:18px;text-align:center;}
.nav-badge{margin-left:auto;background:var(--card2);color:var(--muted2);font-size:9px;font-family:var(--mono);padding:1px 6px;border-radius:8px;border:1px solid var(--border2);}
.sidebar-foot{padding:12px;border-top:1px solid var(--border);}

.btn{padding:8px 16px;border-radius:7px;font-size:12px;font-weight:600;border:none;transition:all .15s;display:inline-flex;align-items:center;gap:5px;}
.btn-primary{background:var(--accent);color:#000;}
.btn-primary:hover{background:var(--accent2);}
.btn-ghost{background:transparent;color:var(--muted2);border:1px solid var(--border);}
.btn-ghost:hover{border-color:var(--border2);color:var(--text);}
.btn-danger{background:transparent;color:var(--red);border:1px solid #ef444430;}
.btn-danger:hover{background:#ef444412;}
.btn-sm{padding:5px 12px;font-size:11px;border-radius:6px;}
.btn:disabled{opacity:.4;cursor:not-allowed;}

.inp{background:var(--surface);border:1px solid var(--border);color:var(--text);padding:10px 14px;border-radius:7px;font-size:13px;width:100%;outline:none;transition:border .15s;}
.inp:focus{border-color:var(--accent);}
.inp::placeholder{color:var(--muted);}

.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px;}
.stat-top{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px 18px;}
.stat-top-n{font-family:var(--mono);font-size:28px;font-weight:700;}
.stat-top-l{font-size:9px;color:var(--muted);letter-spacing:1.5px;font-family:var(--mono);margin-top:4px;}

.filter-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:18px;}
.fchip{font-size:10px;padding:5px 12px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted2);cursor:pointer;transition:all .15s;font-family:var(--mono);}
.fchip.active,.fchip:hover{background:var(--accent)18;border-color:var(--accent)66;color:var(--accent);}
.search-inp{background:var(--surface);border:1px solid var(--border);color:var(--text);padding:7px 14px;border-radius:7px;font-size:12px;outline:none;width:180px;}
.search-inp::placeholder{color:var(--muted);}

.stock-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;}

/* IB 카드 */
.scard{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;}
.scard::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--vc,var(--border));}
.scard:hover{border-color:var(--border2);box-shadow:0 8px 32px #00000050;transform:translateY(-1px);}
.scard-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;}
.scard-ticker{font-family:var(--mono);font-size:17px;font-weight:700;}
.scard-name{font-size:11px;color:var(--muted);margin-top:2px;}
.scard-metrics{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;}
.scard-ml{font-size:8px;color:var(--muted);letter-spacing:1.5px;font-family:var(--mono);margin-bottom:2px;}
.scard-mv{font-size:14px;font-weight:600;font-family:var(--mono);}
.vtag{font-family:var(--mono);font-size:9px;font-weight:700;padding:4px 9px;border-radius:5px;letter-spacing:.5px;}
.type-badge{font-size:8px;font-family:var(--mono);padding:2px 6px;border-radius:3px;font-weight:700;letter-spacing:1px;}
.deal-pill{font-size:9px;font-family:var(--mono);padding:2px 7px;border-radius:4px;background:#ef444412;color:#ef4444;border:1px solid #ef444430;}

/* 퀀트 카드 특별 스타일 */
.qcard{background:var(--card);border:1px solid var(--border);border-left:3px solid var(--vc, var(--purple));border-radius:12px;padding:18px;cursor:pointer;transition:all .2s;}
.qcard:hover{border-color:var(--border2);box-shadow:0 8px 32px #00000050;transform:translateY(-1px);}
.qcard-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;}
.qcard-scores{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px;}
.qscore{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 10px;text-align:center;}
.qscore-l{font-size:7px;color:var(--muted);letter-spacing:1.5px;font-family:var(--mono);margin-bottom:3px;}
.qscore-v{font-family:var(--mono);font-size:16px;font-weight:700;}
.prog{height:3px;background:var(--border);border-radius:2px;overflow:hidden;margin-top:4px;}
.prog-f{height:100%;border-radius:2px;}

.page-title{font-family:var(--serif);font-size:25px;font-weight:400;margin-bottom:4px;}
.page-sub{font-size:11px;color:var(--muted);font-family:var(--mono);}
.topbar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;}

.sbox{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px 16px;}
.sbox-l{font-size:8px;color:var(--muted);letter-spacing:2px;font-family:var(--mono);margin-bottom:6px;}
.sbox-v{font-size:17px;font-weight:600;font-family:var(--mono);}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}

.tabs{display:flex;gap:2px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:3px;margin-bottom:18px;}
.tab{flex:1;text-align:center;padding:8px 4px;font-size:11px;font-family:var(--mono);color:var(--muted);border-radius:7px;cursor:pointer;transition:all .15s;}
.tab.active{background:var(--card);color:var(--text);font-weight:500;}

.sc-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);}
.sc-row:last-child{border-bottom:none;}
.sc-lbl{font-family:var(--mono);font-size:10px;font-weight:700;width:44px;}
.sc-bar{flex:1;height:5px;background:var(--border);border-radius:3px;overflow:hidden;}
.sc-fill{height:100%;border-radius:3px;}
.sc-price{font-family:var(--mono);font-size:12px;font-weight:600;width:90px;text-align:right;}
.sc-prob{font-family:var(--mono);font-size:9px;color:var(--muted);width:30px;text-align:right;}

.kp-row{display:flex;gap:14px;padding:13px 0;border-bottom:1px solid var(--border)55;}
.kp-no{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--accent);min-width:24px;padding-top:1px;}
.kp-lbl{font-size:9px;color:var(--muted);font-family:var(--mono);letter-spacing:1px;margin-bottom:4px;}
.kp-txt{font-size:12px;color:var(--text);line-height:1.75;}

.tbl{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:11px;}
.tbl th{text-align:left;padding:8px 10px;color:var(--muted);font-size:8px;letter-spacing:1.5px;border-bottom:1px solid var(--border);font-weight:400;}
.tbl td{padding:9px 10px;border-bottom:1px solid var(--border)33;}
.tbl tr:last-child td{border-bottom:none;}
.tbl .hl td{color:var(--accent);}

.deal-row{display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)44;}
.deal-row:last-child{border-bottom:none;}
.deal-status{font-size:8px;font-family:var(--mono);padding:2px 7px;border-radius:4px;white-space:nowrap;margin-top:2px;flex-shrink:0;}
.ev-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)33;}
.ev-row:last-child{border-bottom:none;}
.check-row{display:flex;align-items:flex-start;gap:8px;font-size:11px;padding:5px 0;color:var(--muted2);line-height:1.5;}

.overlay{position:fixed;inset:0;background:#00000088;backdrop-filter:blur(6px);z-index:999;display:flex;align-items:center;justify-content:center;}
.modal{background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:28px;width:360px;box-shadow:0 24px 64px #00000060;}

/* 분석 선택 UI */
.mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:28px;}
.mode-card{border:2px solid var(--border);border-radius:12px;padding:22px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;}
.mode-card:hover{border-color:var(--border2);}
.mode-card.active-ib{border-color:#3b82f6;background:#3b82f608;}
.mode-card.active-quant{border-color:#8b5cf6;background:#8b5cf608;}
.mode-icon{font-size:28px;margin-bottom:12px;}
.mode-title{font-size:15px;font-weight:600;margin-bottom:6px;}
.mode-desc{font-size:11px;color:var(--muted);line-height:1.6;}
.mode-tag{position:absolute;top:12px;right:12px;font-size:8px;font-family:var(--mono);padding:3px 7px;border-radius:4px;font-weight:700;letter-spacing:1px;}

.depth-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;}
.depth-card{border:2px solid var(--border);border-radius:10px;padding:14px;cursor:pointer;transition:all .2s;}
.depth-card.active{border-color:var(--accent);background:var(--accent)0d;}
.phase-box{padding:18px;background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:14px;}
.phase-line{font-family:var(--mono);font-size:11px;padding:4px 0;color:var(--muted);transition:color .3s;}
.phase-line.active{color:var(--accent);}
.phase-line.done{color:var(--green);}

@keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
@keyframes spin{to{transform:rotate(360deg);}}
.fade-in{animation:fadeIn .25s ease;}
.pulsing{animation:pulse 1.4s infinite;}
.spin{display:inline-block;animation:spin .9s linear infinite;}

.mob-nav{display:none;}
@media(max-width:768px){
  .sidebar{display:none;}
  .main{margin-left:0;padding:16px;padding-bottom:72px;}
  .stats-row{grid-template-columns:1fr 1fr;}
  .stock-grid{grid-template-columns:1fr;}
  .grid2,.grid3,.grid4{grid-template-columns:1fr 1fr;}
  .mode-grid{grid-template-columns:1fr;}
  .mob-nav{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--surface);border-top:1px solid var(--border);z-index:100;}
  .mob-tab{flex:1;display:flex;flex-direction:column;align-items:center;padding:10px 0;font-size:8px;letter-spacing:1px;color:var(--muted);font-family:var(--mono);gap:3px;cursor:pointer;}
  .mob-tab.active{color:var(--accent);}
  .mob-tab-icon{font-size:19px;}
}
`;

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => detectAdmin());
  const [stocks, setStocks]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [view, setView]         = useState("dashboard");
  const [detailTab, setDetailTab] = useState("overview");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [keyInput, setKeyInput]         = useState("");
  const [searchQ, setSearchQ]           = useState("");
  const [filterType, setFilterType]     = useState("ALL");
  const [filterVerdict, setFilterVerdict] = useState("ALL");
  const [sortBy, setSortBy]             = useState("date");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [pwInput, setPwInput]   = useState("");
  const [pwError, setPwError]   = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const requireAdmin = (action) => {
    if (isAdmin) { action(); return; }
    setPendingAction(() => action);
    setShowAdminModal(true);
  };

  const handleAdminLogin = () => {
    if (pwInput === ADMIN_PW) {
      localStorage.setItem(STORAGE_KEY, "haks-admin");
      sessionStorage.setItem(STORAGE_KEY, "haks-admin");
      setIsAdmin(true); setShowAdminModal(false); setPwInput(""); setPwError(false);
      if (pendingAction) { pendingAction(); setPendingAction(null); }
    } else { setPwError(true); setTimeout(() => setPwError(false), 1500); }
  };

  const filtered = stocks
    .filter(s => filterType === "ALL" || s.analysisType === filterType)
    .filter(s => {
      if (filterVerdict === "ALL") return true;
      const v = getVerdict(s);
      return v === filterVerdict;
    })
    .filter(s => !searchQ || [s.name, s.ticker, s.sector].some(t => t?.toLowerCase().includes(searchQ.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === "date")   return new Date(b.analyzedAt||0) - new Date(a.analyzedAt||0);
      if (sortBy === "upside") return (parseFloat(b.upsideDownside)||0) - (parseFloat(a.upsideDownside)||0);
      return 0;
    });

  // ── IB 카드 ────────────────────────────────────────────────
  const IBCard = ({ stock }) => {
    const v = getVM(stock);
    const upside = parseFloat(stock.upsideDownside) || 0;
    const hasDeals = stock.dealRadar?.items?.filter(d=>d.title)?.length > 0;
    return (
      <div className="scard fade-in" style={{ "--vc": v.color }}
        onClick={() => { setSelected(stock); setDetailTab("overview"); setView("detail"); }}>
        <div className="scard-head">
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
              <div className="scard-ticker">{stock.ticker||"—"}</div>
              <span className="type-badge" style={{ background:"#3b82f618", color:"#3b82f6", border:"1px solid #3b82f630" }}>IB</span>
            </div>
            <div className="scard-name">{stock.name} · {stock.sector}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
            <span className="vtag" style={{ background:v.bg, color:v.color, border:`1px solid ${v.border}` }}>{stock.verdict||"—"}</span>
            {hasDeals && <span className="deal-pill">🔍 딜</span>}
          </div>
        </div>
        <div className="scard-metrics">
          {[
            { l:"현재가", v:fmt(stock.currentPrice, stock.currency) },
            { l:"적정가", v:fmt(stock.weightedFairValue, stock.currency), c:"var(--accent)" },
            { l:"업사이드", v:pct(upside), c:upside>0?"var(--green)":upside<0?"var(--red)":"var(--text)" },
          ].map(m => (
            <div key={m.l}>
              <div className="scard-ml">{m.l}</div>
              <div className="scard-mv" style={{ color:m.c||"var(--text)" }}>{m.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, paddingTop:10, borderTop:"1px solid var(--border)" }}>
          <div style={{ fontSize:9, color:"var(--muted)", fontFamily:"var(--mono)" }}>{dateStr(stock.analyzedAt)}</div>
          <div style={{ fontSize:9, color:"var(--muted)", fontFamily:"var(--mono)" }}>{stars(stock.confidence||0)}</div>
        </div>
      </div>
    );
  };

  // ── 퀀트 카드 ──────────────────────────────────────────────
  const QuantCard = ({ stock }) => {
    const v = getVM(stock);
    const qv = stock.quantVerdict || {};
    const upside = parseFloat(stock.upsideDownside) || 0;
    return (
      <div className="qcard fade-in" style={{ "--vc": v.color }}
        onClick={() => { setSelected(stock); setDetailTab("overview"); setView("detail"); }}>
        <div className="qcard-head">
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
              <div className="scard-ticker">{stock.ticker||"—"}</div>
              <span className="type-badge" style={{ background:"#8b5cf618", color:"#8b5cf6", border:"1px solid #8b5cf630" }}>QUANT</span>
            </div>
            <div className="scard-name">{stock.name} · {stock.sector}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
            <span className="vtag" style={{ background:v.bg, color:v.color, border:`1px solid ${v.border}` }}>{qv.recommendation||"—"}</span>
            <div style={{ fontSize:9, color:"var(--muted)", fontFamily:"var(--mono)" }}>MOS {pct(stock.valuation?.marginOfSafety, false)}</div>
          </div>
        </div>
        <div className="qcard-scores">
          {[
            { l:"QUALITY", v:qv.qualityScore, c:"var(--green)" },
            { l:"VALUE",   v:qv.valueScore,   c:"var(--blue)" },
            { l:"MOMENTUM",v:qv.momentumScore,c:"var(--purple)" },
          ].map(s => (
            <div key={s.l} className="qscore">
              <div className="qscore-l">{s.l}</div>
              <div className="qscore-v" style={{ color:s.c }}>{s.v??<span style={{color:"var(--muted)"}}>—</span>}</div>
              <div className="prog"><div className="prog-f" style={{ width:`${s.v||0}%`, background:s.c }} /></div>
            </div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:10 }}>
          {[
            { l:"현재가", v:fmt(stock.currentPrice, stock.currency) },
            { l:"내재가치", v:fmt(stock.weightedFairValue, stock.currency), c:"var(--accent)" },
            { l:"업사이드", v:pct(upside), c:upside>0?"var(--green)":upside<0?"var(--red)":"var(--text)" },
          ].map(m => (
            <div key={m.l}>
              <div className="scard-ml">{m.l}</div>
              <div className="scard-mv" style={{ color:m.c||"var(--text)", fontSize:13 }}>{m.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {stock.macro?.environment && (
            <div style={{ fontSize:9, fontFamily:"var(--mono)", padding:"2px 7px", borderRadius:4, border:"1px solid var(--border)", color:MACRO_C[stock.macro.environment]||"var(--muted)" }}>
              매크로 {stock.macro.environment}
            </div>
          )}
          {stock.fundamental?.moatRating && (
            <div style={{ fontSize:9, fontFamily:"var(--mono)", padding:"2px 7px", borderRadius:4, border:"1px solid var(--border)", color:MOAT_C[stock.fundamental.moatRating]||"var(--muted)" }}>
              해자 {stock.fundamental.moatRating}
            </div>
          )}
          <div style={{ marginLeft:"auto", fontSize:9, color:"var(--muted)", fontFamily:"var(--mono)" }}>{dateStr(stock.analyzedAt)}</div>
        </div>
      </div>
    );
  };

  // ── 대시보드 ───────────────────────────────────────────────
  const Dashboard = () => {
    const ibCount    = stocks.filter(s=>s.analysisType==="IB").length;
    const quantCount = stocks.filter(s=>s.analysisType==="QUANT").length;
    const buyCount   = stocks.filter(s=>["STRONG BUY","BUY","Strong Buy","Buy"].includes(getVerdict(s))).length;
    const avgUp      = stocks.length ? (stocks.reduce((a,s)=>a+(parseFloat(s.upsideDownside)||0),0)/stocks.length).toFixed(1) : null;

    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-title">Research Desk</div>
            <div className="page-sub">{stocks.length}개 종목 ({ibCount} IB · {quantCount} QUANT) · {new Date().toLocaleDateString("ko-KR")}</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => requireAdmin(() => setView("analyze"))}>🤖 AI 분석</button>
            {isAdmin
              ? <button className="btn btn-ghost btn-sm" onClick={() => setView("settings")}>⚙</button>
              : <button className="btn btn-ghost btn-sm" onClick={() => setShowAdminModal(true)}>🔑 관리자</button>
            }
          </div>
        </div>

        <div className="stats-row">
          {[
            { l:"TOTAL", v:stocks.length, c:"var(--text)" },
            { l:"IB", v:ibCount, c:"var(--blue)" },
            { l:"QUANT", v:quantCount, c:"var(--purple)" },
            { l:"BUY 신호", v:buyCount, c:"var(--green)" },
          ].map(s => (
            <div key={s.l} className="stat-top">
              <div className="stat-top-n" style={{ color:s.c }}>{s.v}</div>
              <div className="stat-top-l">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="filter-row">
          <input className="search-inp" placeholder="종목 검색..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
          {[
            { v:"ALL", l:"전체" },
            { v:"IB",    l:"🏦 IB" },
            { v:"QUANT", l:"📐 퀀트" },
          ].map(t => (
            <button key={t.v} className={`fchip ${filterType===t.v?"active":""}`} onClick={()=>setFilterType(t.v)}>{t.l}</button>
          ))}
          <div style={{ width:1, height:20, background:"var(--border)", margin:"0 4px" }} />
          {["ALL","STRONG BUY","BUY","HOLD","REDUCE","AVOID"].map(v => (
            <button key={v} className={`fchip ${filterVerdict===v?"active":""}`} onClick={()=>setFilterVerdict(v)} style={{ fontSize:9 }}>
              {v==="ALL"?"전체":v}
            </button>
          ))}
          <select className="fchip" style={{ cursor:"pointer" }} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="date">최신순</option>
            <option value="upside">업사이드순</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"var(--muted)" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
            <div style={{ fontSize:14, marginBottom:20 }}>{stocks.length===0?"아직 분석된 종목이 없어요":"검색 결과가 없어요"}</div>
            {stocks.length===0 && <button className="btn btn-primary" onClick={() => requireAdmin(() => setView("analyze"))}>첫 종목 분석하기</button>}
          </div>
        ) : (
          <div className="stock-grid">
            {filtered.map(s => s.analysisType === "QUANT"
              ? <QuantCard key={s.id} stock={s} />
              : <IBCard key={s.id} stock={s} />
            )}
          </div>
        )}
      </div>
    );
  };

  // ── AI 분석 뷰 ─────────────────────────────────────────────
  const AnalyzeView = () => {
    const [mode, setMode]       = useState(null); // "IB" | "QUANT"
    const [company, setCompany] = useState("");
    const [depth, setDepth]     = useState("deep");
    const [loading, setLoading] = useState(false);
    const [phase, setPhase]     = useState(0);
    const [error, setError]     = useState("");

    const IB_PHASES    = ["웹검색으로 재무 데이터 · 딜레이더 수집 중...","DCF · Comps · 시나리오 분석 중...","10 Key Points · 신뢰도 체크 완성 중..."];
    const QUANT_PHASES = ["매크로 환경 · 산업 데이터 수집 중...","10년 재무 추이 · 밸류에이션 백분위 분석 중...","퀀트 스코어 · 안전마진 계산 완성 중..."];

    const run = async () => {
      if (!company.trim() || !mode) return;
      if (!anthropicKey) { setError("설정에서 Anthropic API 키를 입력해주세요"); return; }
      setLoading(true); setError(""); setPhase(1);
      const endpoint = mode === "IB" ? "/api/analyze-ib" : "/api/analyze-quant";
      try {
        const r = await fetch(endpoint, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ companyName:company.trim(), anthropicKey, depth }),
        });
        setPhase(2);
        const data = await r.json();
        if (data.error) { setError(data.error); setPhase(0); setLoading(false); return; }
        setPhase(3);
        saveStocks([data, ...stocks.filter(s=>s.id!==data.id)]);
        setSelected(data);
        setTimeout(() => { setDetailTab("overview"); setView("detail"); }, 500);
      } catch(e) { setError(e.message); setPhase(0); }
      setLoading(false);
    };

    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-title">AI 분석</div>
            <div className="page-sub">분석 방식을 선택하세요</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setView("dashboard")}>← 뒤로</button>
        </div>

        <div style={{ maxWidth:580 }}>
          {/* 모드 선택 */}
          <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:12 }}>ANALYSIS MODE</div>
          <div className="mode-grid">
            <div className={`mode-card ${mode==="IB"?"active-ib":""}`} onClick={() => !loading && setMode("IB")}>
              <span className="mode-tag" style={{ background:"#3b82f618", color:"#3b82f6", border:"1px solid #3b82f630" }}>IB</span>
              <div className="mode-icon">🏦</div>
              <div className="mode-title">IB 분석가</div>
              <div className="mode-desc">월스트리트 투자은행 방식<br/>DCF · Comps · 딜레이더<br/>10 Key Points · 시나리오</div>
              <div style={{ marginTop:12, fontSize:9, fontFamily:"var(--mono)", color:"var(--muted)" }}>웹검색 5~7회 · 60~90초</div>
            </div>
            <div className={`mode-card ${mode==="QUANT"?"active-quant":""}`} onClick={() => !loading && setMode("QUANT")}>
              <span className="mode-tag" style={{ background:"#8b5cf618", color:"#8b5cf6", border:"1px solid #8b5cf630" }}>QUANT</span>
              <div className="mode-icon">📐</div>
              <div className="mode-title">퀀트 트레이더</div>
              <div className="mode-desc">버핏·그린블랫·그레이엄 철학<br/>매크로 · 해자 · 백분위<br/>안전마진 · 퀄리티 스코어</div>
              <div style={{ marginTop:12, fontSize:9, fontFamily:"var(--mono)", color:"var(--muted)" }}>웹검색 4~6회 · 50~80초</div>
            </div>
          </div>

          {mode && (
            <>
              <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:10 }}>DEPTH</div>
              <div className="depth-grid">
                {[
                  { v:"quick", icon:"⚡", label:"Quick", desc:"핵심만" },
                  { v:"deep",  icon:"🔬", label:"Deep",  desc:"심층 분석" },
                ].map(d => (
                  <div key={d.v} className={`depth-card ${depth===d.v?"active":""}`} onClick={() => !loading && setDepth(d.v)}>
                    <div style={{ fontSize:18, marginBottom:6 }}>{d.icon}</div>
                    <div style={{ fontWeight:600, fontSize:13, marginBottom:3 }}>{d.label}</div>
                    <div style={{ fontSize:10, color:"var(--muted)" }}>{d.desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <input className="inp" placeholder="기업명 또는 티커 (예: 삼성전자 / NVDA / TSMC)"
                  value={company} onChange={e=>setCompany(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&!loading&&run()} disabled={loading} autoFocus />
                <button className="btn btn-primary" style={{ whiteSpace:"nowrap", padding:"10px 20px" }}
                  onClick={run} disabled={loading||!company.trim()}>
                  {loading ? <span className="spin">◐</span> : "분석 시작"}
                </button>
              </div>
            </>
          )}

          {loading && (
            <div className="phase-box">
              {(mode==="IB"?IB_PHASES:QUANT_PHASES).map((p,i) => (
                <div key={i} className={`phase-line ${phase===i+1?"active pulsing":phase>i+1?"done":""}`}>
                  {phase>i+1?"✓ ":phase===i+1?"◐ ":"○ "}{p}
                </div>
              ))}
              <div style={{ marginTop:14, height:2, background:"var(--border)", borderRadius:1, overflow:"hidden" }}>
                <div style={{ height:"100%", background: mode==="IB"?"var(--blue)":"var(--purple)", width:`${(phase/3)*100}%`, transition:"width .5s", borderRadius:1 }} />
              </div>
            </div>
          )}

          {error && <div style={{ padding:"12px 16px", background:"#ef444412", border:"1px solid #ef444430", borderRadius:8, fontSize:12, color:"var(--red)" }}>{error}</div>}
        </div>
      </div>
    );
  };

  // ── 상세 뷰 ────────────────────────────────────────────────
  const DetailView = ({ stock }) => {
    if (!stock) return null;
    const v    = getVM(stock);
    const isIB = stock.analysisType === "IB";
    const sc   = stock.scenarios || {};

    return (
      <div className="fade-in">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
              <div style={{ fontFamily:"var(--mono)", fontSize:26, fontWeight:700 }}>{stock.ticker}</div>
              <span className="type-badge" style={isIB
                ? { background:"#3b82f618", color:"#3b82f6", border:"1px solid #3b82f630", padding:"4px 10px", borderRadius:6, fontSize:10 }
                : { background:"#8b5cf618", color:"#8b5cf6", border:"1px solid #8b5cf630", padding:"4px 10px", borderRadius:6, fontSize:10 }}>
                {isIB?"IB 분석":"퀀트 분석"}
              </span>
              <span className="vtag" style={{ background:v.bg, color:v.color, border:`1px solid ${v.border}`, fontSize:11, padding:"5px 11px" }}>
                {getVerdict(stock)||"—"}
              </span>
              {isIB && stock.dealRadar?.items?.filter(d=>d.title)?.length>0 && <span className="deal-pill">🔍 딜</span>}
            </div>
            <div style={{ fontSize:13, color:"var(--muted2)" }}>{stock.name} · {stock.sector} · {stock.exchange}</div>
            <div style={{ fontSize:9, color:"var(--muted)", fontFamily:"var(--mono)", marginTop:5 }}>분석일: {dateStr(stock.analyzedAt)} · 신뢰도: {stars(stock.confidence||0)}</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setView("dashboard")}>← 목록</button>
            <button className="btn btn-ghost btn-sm" onClick={() => requireAdmin(() => setView("analyze"))}>🤖 재분석</button>
            {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}>삭제</button>}
          </div>
        </div>

        {/* 가격 요약 */}
        <div className="grid3" style={{ marginBottom:18 }}>
          {[
            { l:"현재가", v:fmt(stock.currentPrice, stock.currency) },
            { l:"내재/적정가", v:fmt(stock.weightedFairValue, stock.currency), c:"var(--accent)" },
            { l:"업사이드", v:pct(stock.upsideDownside), c:(stock.upsideDownside||0)>0?"var(--green)":"var(--red)" },
            isIB
              ? { l:"DCF 적정가", v:fmt(stock.dcf?.fairValue, stock.currency) }
              : { l:"MOS", v:pct(stock.valuation?.marginOfSafety, false), c:(stock.valuation?.marginOfSafety||0)>30?"var(--green)":"var(--accent)" },
            isIB
              ? { l:"Comps 적정가", v:fmt(stock.comps?.impliedValue, stock.currency) }
              : { l:"WACC/기대수익률", v:pct(stock.quantVerdict?.expectedReturn, false) },
            { l:"분석 방식", v: isIB ? "IB 분석가" : "퀀트 트레이더" },
          ].map(m => (
            <div key={m.l} className="sbox">
              <div className="sbox-l">{m.l}</div>
              <div className="sbox-v" style={{ color:m.c||"var(--text)" }}>{m.v}</div>
            </div>
          ))}
        </div>

        {/* ── IB 탭 ── */}
        {isIB && (
          <>
            <div className="tabs">
              {[{k:"overview",l:"개요"},{k:"keypoints",l:"10 Key Points"},{k:"dcf",l:"DCF"},{k:"comps",l:"Comps"},{k:"reliability",l:"신뢰도"}]
                .map(t => <div key={t.k} className={`tab ${detailTab===t.k?"active":""}`} onClick={() => setDetailTab(t.k)}>{t.l}</div>)}
            </div>

            {detailTab==="overview" && (
              <div className="fade-in">
                {stock.verdictOneLiner && (
                  <div style={{ padding:"15px 18px", background:`${v.color}10`, border:`1px solid ${v.color}28`, borderRadius:10, marginBottom:16, fontSize:13, lineHeight:1.8 }}>
                    💬 {stock.verdictOneLiner}
                  </div>
                )}
                <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:20, marginBottom:14 }}>
                  <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>SCENARIOS</div>
                  {[{k:"bull",l:"BULL",c:"var(--green)"},{k:"base",l:"BASE",c:"var(--accent)"},{k:"bear",l:"BEAR",c:"var(--red)"}].map(s => sc[s.k] && (
                    <div key={s.k} className="sc-row">
                      <div className="sc-lbl" style={{ color:s.c }}>{s.l}</div>
                      <div className="sc-bar"><div className="sc-fill" style={{ width:`${sc[s.k].prob||0}%`, background:s.c }} /></div>
                      <div className="sc-price" style={{ color:s.c }}>{fmt(sc[s.k].price, stock.currency)}</div>
                      <div className="sc-prob">{sc[s.k].prob}%</div>
                    </div>
                  ))}
                  {sc.base?.thesis && <div style={{ marginTop:14, fontSize:11, color:"var(--muted2)", lineHeight:1.75 }}>{sc.base.thesis}</div>}
                </div>

                {stock.priceEvents?.filter(e=>e.event)?.length>0 && (
                  <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:20, marginBottom:14 }}>
                    <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>이벤트별 주가 영향</div>
                    {stock.priceEvents.filter(e=>e.event).map((e,i) => (
                      <div key={i} className="ev-row">
                        <div style={{ fontSize:12 }}>{e.event}</div>
                        <div style={{ fontFamily:"var(--mono)", display:"flex", gap:12 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:e.impact>0?"var(--green)":"var(--red)" }}>{e.impact>0?"+":""}{e.impact}%</span>
                          <span style={{ fontSize:10, color:"var(--muted)" }}>{e.impactPrice?fmt(e.impactPrice,stock.currency):""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:20 }}>
                  <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>🔍 딜 레이더</div>
                  {stock.dealRadar?.items?.filter(d=>d.title)?.length>0 ? (
                    stock.dealRadar.items.filter(d=>d.title).map((d,i) => (
                      <div key={i} className="deal-row">
                        <span className="deal-status" style={{
                          background:d.status==="공식발표"?"#10b98118":d.status==="루머"?"#f59e0b18":"#3b82f618",
                          color:d.status==="공식발표"?"var(--green)":d.status==="루머"?"var(--accent)":"var(--blue)",
                        }}>{d.status}</span>
                        <div>
                          <div style={{ fontSize:12, marginBottom:3 }}>{d.title}</div>
                          <div style={{ fontSize:10, color:"var(--muted)" }}>{d.impact} · {d.valImpact}</div>
                        </div>
                      </div>
                    ))
                  ) : <div style={{ fontSize:12, color:"var(--muted)" }}>현재 확인된 주요 딜 현안 없음</div>}
                </div>
              </div>
            )}

            {detailTab==="keypoints" && (
              <div className="fade-in">
                <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:22 }}>
                  <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:16 }}>🎯 {stock.ticker} — 10 KEY POINTS</div>
                  {(stock.keyPoints||[]).map((kp,i) => (
                    <div key={i} className="kp-row">
                      <div className="kp-no">{"①②③④⑤⑥⑦⑧⑨⑩"[i]||`${i+1}`}</div>
                      <div><div className="kp-lbl">{kp.label}</div><div className="kp-txt">{kp.content}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailTab==="dcf" && (
              <div className="fade-in">
                <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:20, marginBottom:14 }}>
                  <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>DCF 모델</div>
                  <div style={{ display:"flex", gap:24, fontSize:11, fontFamily:"var(--mono)", color:"var(--muted)", marginBottom:16 }}>
                    <span>WACC <span style={{ color:"var(--text)" }}>{pct(stock.dcf?.wacc, false)}</span></span>
                    <span>터미널성장률 <span style={{ color:"var(--text)" }}>{pct(stock.dcf?.terminalGrowth, false)}</span></span>
                    <span>DCF 적정가 <span style={{ color:"var(--accent)" }}>{fmt(stock.dcf?.fairValue, stock.currency)}</span></span>
                  </div>
                  {stock.dcf?.assumptions?.length>0 && (
                    <div style={{ overflowX:"auto" }}>
                      <table className="tbl">
                        <thead><tr>{["가정 항목","적용값","근거","민감도"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                        <tbody>
                          {stock.dcf.assumptions.map((a,i) => (
                            <tr key={i}><td style={{ color:"var(--muted2)" }}>{a.item}</td><td style={{ color:"var(--accent)" }}>{a.value}</td><td style={{ color:"var(--muted)" }}>{a.basis}</td><td style={{ color:"var(--muted)" }}>{a.sensitivity}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {stock.reverseCheck && (
                  <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:20 }}>
                    <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:12 }}>역산 검증</div>
                    <div style={{ display:"flex", gap:24, fontSize:11, fontFamily:"var(--mono)", color:"var(--muted)", marginBottom:10 }}>
                      <span>내재 성장률 <span style={{ color:"var(--text)" }}>{stock.reverseCheck.impliedGrowth||"—"}</span></span>
                      <span>시장 비교 <span style={{ color:"var(--text)" }}>{stock.reverseCheck.vsMarket||"—"}</span></span>
                    </div>
                    {stock.reverseCheck.warning && (
                      <div style={{ fontSize:11, color:"var(--accent)", background:"var(--accent)0d", padding:"8px 12px", borderRadius:6, border:"1px solid var(--accent)28" }}>⚠️ {stock.reverseCheck.warning}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {detailTab==="comps" && (
              <div className="fade-in">
                <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:20 }}>
                  <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>비교기업 분석 (Trading Comps)</div>
                  <div style={{ display:"flex", gap:24, fontSize:11, fontFamily:"var(--mono)", color:"var(--muted)", marginBottom:16 }}>
                    <span>Comps 적정가 <span style={{ color:"var(--accent)" }}>{fmt(stock.comps?.impliedValue, stock.currency)}</span></span>
                    <span>프리미엄/디스카운트 <span style={{ color:"var(--text)" }}>{pct(stock.comps?.premiumDiscount)}</span></span>
                  </div>
                  <div style={{ overflowX:"auto" }}>
                    <table className="tbl">
                      <thead><tr>{["기업","티커","P/E","EV/EBITDA","P/B","매출성장"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(stock.comps?.peers||[]).map((p,i) => (
                          <tr key={i} className={p.ticker===stock.ticker?"hl":""}>
                            <td>{p.name}</td><td style={{ color:"var(--muted2)" }}>{p.ticker}</td>
                            <td>{p.per?p.per.toFixed(1)+"x":"—"}</td><td>{p.evEbitda?p.evEbitda.toFixed(1)+"x":"—"}</td>
                            <td>{p.pbr?p.pbr.toFixed(1)+"x":"—"}</td>
                            <td style={{ color:(p.revenueGrowth||0)>0?"var(--green)":"var(--red)" }}>{pct(p.revenueGrowth)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {stock.comps?.summary && <div style={{ marginTop:14, fontSize:12, color:"var(--muted2)", lineHeight:1.75 }}>{stock.comps.summary}</div>}
                </div>
              </div>
            )}

            {detailTab==="reliability" && (
              <div className="fade-in">
                <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:22 }}>
                  <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:16 }}>📋 신뢰도 체크리스트</div>
                  <div className="check-row">📌 데이터 출처: {stock.reliability?.realDataSources?.join(", ")||"—"}</div>
                  <div className="check-row">📊 추정/가정 비율: {stock.reliability?.estimateRatio||"—"}</div>
                  {stock.reliability?.topUncertainties?.map((u,i) => u && <div key={i} className="check-row">⚠️ {u}</div>)}
                  {stock.reliability?.limitations && <div style={{ marginTop:10, fontSize:11, color:"var(--muted)", lineHeight:1.6 }}>{stock.reliability.limitations}</div>}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── 퀀트 탭 ── */}
        {!isIB && (
          <>
            <div className="tabs">
              {[{k:"overview",l:"개요"},{k:"fundamental",l:"기업 본질"},{k:"valuation",l:"밸류에이션"},{k:"macro",l:"매크로"}]
                .map(t => <div key={t.k} className={`tab ${detailTab===t.k?"active":""}`} onClick={() => setDetailTab(t.k)}>{t.l}</div>)}
            </div>

            {detailTab==="overview" && (
              <div className="fade-in">
                {/* 퀀트 스코어 */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:14 }}>
                  {[
                    { l:"QUALITY",  v:stock.quantVerdict?.qualityScore,  c:"var(--green)" },
                    { l:"VALUE",    v:stock.quantVerdict?.valueScore,    c:"var(--blue)" },
                    { l:"MOMENTUM", v:stock.quantVerdict?.momentumScore, c:"var(--purple)" },
                  ].map(s => (
                    <div key={s.l} className="sbox" style={{ textAlign:"center" }}>
                      <div className="sbox-l" style={{ textAlign:"center" }}>{s.l}</div>
                      <div style={{ fontFamily:"var(--mono)", fontSize:30, fontWeight:700, color:s.c }}>{s.v??<span style={{color:"var(--muted)"}}>—</span>}</div>
                      <div style={{ height:4, background:"var(--border)", borderRadius:2, overflow:"hidden", marginTop:8 }}>
                        <div style={{ height:"100%", width:`${s.v||0}%`, background:s.c, borderRadius:2 }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 시나리오 */}
                <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:20, marginBottom:14 }}>
                  <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>SCENARIOS</div>
                  {[{k:"bull",l:"BULL",c:"var(--green)"},{k:"base",l:"BASE",c:"var(--accent)"},{k:"bear",l:"BEAR",c:"var(--red)"}].map(s => sc[s.k] && (
                    <div key={s.k} className="sc-row">
                      <div className="sc-lbl" style={{ color:s.c }}>{s.l}</div>
                      <div className="sc-bar"><div className="sc-fill" style={{ width:`${sc[s.k].prob||0}%`, background:s.c }} /></div>
                      <div className="sc-price" style={{ color:s.c }}>{fmt(sc[s.k].price, stock.currency)}</div>
                      <div className="sc-prob">{sc[s.k].prob}%</div>
                    </div>
                  ))}
                  {sc.base?.thesis && <div style={{ marginTop:14, fontSize:11, color:"var(--muted2)", lineHeight:1.75 }}>{sc.base.thesis}</div>}
                </div>

                {/* 퀀트 판단 */}
                {stock.quantVerdict?.verdictOneLiner && (
                  <div style={{ padding:"15px 18px", background:`${v.color}10`, border:`1px solid ${v.color}28`, borderRadius:10, fontSize:13, lineHeight:1.8 }}>
                    💬 {stock.quantVerdict.verdictOneLiner}
                  </div>
                )}
              </div>
            )}

            {detailTab==="fundamental" && (
              <div className="fade-in">
                <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:20, marginBottom:14 }}>
                  <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>기업 본질 분석</div>
                  <div className="grid3" style={{ marginBottom:14 }}>
                    {[
                      { l:"ROE", v:pct(stock.fundamental?.roe,false) },
                      { l:"ROIC", v:pct(stock.fundamental?.roic,false) },
                      { l:"영업이익률", v:pct(stock.fundamental?.operatingMargin,false) },
                      { l:"5Y 매출성장", v:pct(stock.fundamental?.revenueGrowth5Y,false) },
                      { l:"FCF 마진", v:pct(stock.fundamental?.fcfMargin,false) },
                      { l:"부채/자본", v:stock.fundamental?.debtToEquity?stock.fundamental.debtToEquity.toFixed(1)+"x":"—" },
                    ].map(m => (
                      <div key={m.l} className="sbox">
                        <div className="sbox-l">{m.l}</div>
                        <div style={{ fontFamily:"var(--mono)", fontSize:16, fontWeight:600 }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
                    {stock.fundamental?.moatRating && (
                      <div style={{ fontSize:10, fontFamily:"var(--mono)", padding:"3px 10px", borderRadius:4, border:"1px solid var(--border)", color:MOAT_C[stock.fundamental.moatRating]||"var(--muted)" }}>
                        해자 {stock.fundamental.moatRating}
                      </div>
                    )}
                    {stock.fundamental?.earningsStability && (
                      <div style={{ fontSize:10, fontFamily:"var(--mono)", padding:"3px 10px", borderRadius:4, border:"1px solid var(--border)", color:"var(--muted2)" }}>
                        수익안정성 {stock.fundamental.earningsStability}
                      </div>
                    )}
                  </div>
                  {stock.fundamental?.moatEvidence && <div style={{ fontSize:12, color:"var(--muted2)", lineHeight:1.75 }}>{stock.fundamental.moatEvidence}</div>}
                </div>
              </div>
            )}

            {detailTab==="valuation" && (
              <div className="fade-in">
                <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:20 }}>
                  <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>밸류에이션 분석</div>
                  <div className="grid4" style={{ marginBottom:16 }}>
                    {[
                      { l:"P/E", v:stock.valuation?.per?stock.valuation.per.toFixed(1)+"x":"—" },
                      { l:"P/B", v:stock.valuation?.pbr?stock.valuation.pbr.toFixed(1)+"x":"—" },
                      { l:"EV/EBITDA", v:stock.valuation?.evEbitda?stock.valuation.evEbitda.toFixed(1)+"x":"—" },
                      { l:"FCF Yield", v:pct(stock.valuation?.fcfYield,false) },
                    ].map(m => (
                      <div key={m.l} className="sbox">
                        <div className="sbox-l">{m.l}</div>
                        <div style={{ fontFamily:"var(--mono)", fontSize:15, fontWeight:600 }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:24, fontSize:10, color:"var(--muted)", fontFamily:"var(--mono)", marginBottom:12 }}>
                    <span>역사적 P/E 백분위 <span style={{ color:"var(--text)" }}>{stock.valuation?.perHistoricalPct??<span style={{color:"var(--muted)"}}>—</span>}%</span></span>
                    <span>업종 백분위 <span style={{ color:"var(--text)" }}>{stock.valuation?.industryPercentile??<span style={{color:"var(--muted)"}}>—</span>}%</span></span>
                    <span>MOS <span style={{ color:(stock.valuation?.marginOfSafety||0)>30?"var(--green)":"var(--accent)" }}>{pct(stock.valuation?.marginOfSafety,false)}</span></span>
                  </div>
                  {stock.valuation?.summary && <div style={{ fontSize:12, color:"var(--muted2)", lineHeight:1.75 }}>{stock.valuation.summary}</div>}
                </div>
              </div>
            )}

            {detailTab==="macro" && (
              <div className="fade-in">
                <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:20, marginBottom:14 }}>
                  <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>매크로 환경</div>
                  <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:12 }}>
                    <div style={{ fontSize:22, fontWeight:700, color:MACRO_C[stock.macro?.environment]||"var(--muted)" }}>{stock.macro?.environment||"—"}</div>
                    <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--mono)" }}>사이클: {stock.macro?.cyclePosition||"—"}</div>
                  </div>
                  <div style={{ fontSize:12, color:"var(--muted2)", lineHeight:1.8, marginBottom:12 }}>{stock.macro?.summary}</div>
                  {stock.macro?.keyRisks?.length>0 && <div style={{ fontSize:11, color:"var(--red)" }}>⚠️ {stock.macro.keyRisks.join(" · ")}</div>}
                </div>
                <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:20 }}>
                  <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>산업 분석</div>
                  <div className="grid3" style={{ marginBottom:12 }}>
                    {[
                      { l:"산업 성장률", v:pct(stock.industry?.growthRate,false) },
                      { l:"평균 ROIC", v:pct(stock.industry?.avgROIC,false) },
                      { l:"경쟁 강도", v:stock.industry?.competitiveIntensity||"—" },
                    ].map(m => (
                      <div key={m.l} className="sbox">
                        <div className="sbox-l">{m.l}</div>
                        <div style={{ fontFamily:"var(--mono)", fontSize:15, fontWeight:600 }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                  {stock.industry?.summary && <div style={{ fontSize:12, color:"var(--muted2)", lineHeight:1.75 }}>{stock.industry.summary}</div>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ── 설정 ───────────────────────────────────────────────────
  const SettingsView = () => (
    <div className="fade-in">
      <div className="topbar">
        <div><div className="page-title">설정</div><div className="page-sub">API 키 및 데이터 관리</div></div>
        <button className="btn btn-ghost btn-sm" onClick={() => setView("dashboard")}>← 뒤로</button>
      </div>
      <div style={{ maxWidth:480 }}>
        <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:22, marginBottom:14 }}>
          <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>ANTHROPIC API KEY</div>
          <div style={{ fontSize:12, color:"var(--muted)", marginBottom:12 }}>IB 분석 + 퀀트 분석 모두에 사용됩니다</div>
          <div style={{ display:"flex", gap:8 }}>
            <input className="inp" type="password" placeholder="sk-ant-..." value={keyInput} onChange={e=>setKeyInput(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={() => {
              setAnthropicKey(keyInput);
              try { localStorage.setItem(STORAGE_AKEY, keyInput); } catch {}
            }}>저장</button>
          </div>
          {anthropicKey && <div style={{ fontSize:9, color:"var(--green)", fontFamily:"var(--mono)", marginTop:8 }}>✓ 키 등록됨</div>}
        </div>
        <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:22, marginBottom:14 }}>
          <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:14 }}>데이터 관리</div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-danger btn-sm" onClick={() => {
              if (window.confirm("모든 데이터를 삭제할까요?")) { saveStocks([]); setSelected(null); setView("dashboard"); }
            }}>전체 초기화</button>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              localStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem(STORAGE_KEY);
              setIsAdmin(false); setView("dashboard");
            }}>관리자 로그아웃</button>
          </div>
        </div>
        <div style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:12, padding:22 }}>
          <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:2.5, fontFamily:"var(--mono)", marginBottom:12 }}>접속 정보</div>
          <div style={{ fontSize:11, fontFamily:"var(--mono)", color:"var(--muted2)", lineHeight:2.2 }}>
            <div>관리자 URL: ?key=haks-admin</div>
            <div>관리자 PW: haks2026</div>
          </div>
        </div>
      </div>
    </div>
  );

  const NAV = [
    { k:"dashboard", icon:"📊", label:"대시보드", badge:stocks.length||null },
    ...(isAdmin?[{k:"analyze",icon:"🤖",label:"AI 분석"}]:[]),
    ...(isAdmin?[{k:"settings",icon:"⚙",label:"설정"}]:[]),
  ];

  const renderView = () => {
    if (view==="dashboard") return <Dashboard />;
    if (view==="analyze" && isAdmin) return <AnalyzeView />;
    if (view==="detail" && selected) return <DetailView stock={selected} />;
    if (view==="settings" && isAdmin) return <SettingsView />;
    return <Dashboard />;
  };

  return (
    <>
      <style>{CSS}</style>

      {showAdminModal && (
        <div className="overlay" onClick={() => setShowAdminModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{ fontFamily:"var(--serif)", fontSize:20, marginBottom:6 }}>관리자 로그인</div>
            <div style={{ fontSize:12, color:"var(--muted)", marginBottom:20 }}>AI 분석·수정·삭제는 관리자 전용입니다.</div>
            <input className="inp" type="password" placeholder="비밀번호" value={pwInput}
              onChange={e=>setPwInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAdminLogin()}
              style={{ marginBottom:8, border:pwError?"1px solid var(--red)":undefined }} autoFocus />
            {pwError && <div style={{ fontSize:11, color:"var(--red)", marginBottom:10 }}>비밀번호가 틀렸어요</div>}
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={() => { setShowAdminModal(false); setPwInput(""); }}>취소</button>
              <button className="btn btn-primary btn-sm" style={{ flex:1 }} onClick={handleAdminLogin}>로그인</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{ fontFamily:"var(--serif)", fontSize:20, marginBottom:8 }}>종목 삭제</div>
            <div style={{ fontSize:13, color:"var(--muted2)", marginBottom:22, lineHeight:1.6 }}>
              <strong style={{ color:"var(--text)" }}>{selected?.name}</strong> 분석을 삭제할까요?
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={() => setShowDeleteConfirm(false)}>취소</button>
              <button className="btn btn-danger btn-sm" style={{ flex:1 }} onClick={() => {
                saveStocks(stocks.filter(s=>s.id!==selected?.id));
                setSelected(null); setShowDeleteConfirm(false); setView("dashboard");
              }}>삭제</button>
            </div>
          </div>
        </div>
      )}

      <div className="layout">
        <div className="sidebar">
          <div className="logo-wrap">
            <div className="logo-mark">AnalystOS</div>
            <div className="logo-sub">RESEARCH PLATFORM v3</div>
          </div>
          <nav className="nav-section">
            <div className="nav-lbl">MENU</div>
            {NAV.map(item => (
              <div key={item.k} className={`nav-item ${view===item.k?"active":""}`} onClick={() => setView(item.k)}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </div>
            ))}
            {!isAdmin && (
              <>
                <div className="nav-lbl" style={{ marginTop:20 }}>ADMIN</div>
                <div className="nav-item" onClick={() => requireAdmin(() => setView("analyze"))}>
                  <span className="nav-icon">🤖</span>AI 분석
                </div>
                <div className="nav-item" onClick={() => setShowAdminModal(true)}>
                  <span className="nav-icon">🔑</span>관리자 로그인
                </div>
              </>
            )}
          </nav>
          <div className="sidebar-foot">
            <div style={{
              fontSize:10, fontFamily:"var(--mono)", padding:"7px 12px", borderRadius:7, textAlign:"center",
              background:isAdmin?"var(--accent)18":"var(--surface)",
              color:isAdmin?"var(--accent)":"var(--muted)",
              border:`1px solid ${isAdmin?"var(--accent)33":"var(--border)"}`,
            }}>{isAdmin?"★ ADMIN":"👁 VIEWER"}</div>
          </div>
        </div>

        <main className="main">{renderView()}</main>

        <div className="mob-nav">
          {[
            {k:"dashboard",icon:"📊",l:"홈"},
            {k:"analyze",icon:"🤖",l:"분석",admin:true},
            {k:"settings",icon:"⚙",l:"설정",admin:true},
          ].map(t => (
            <div key={t.k} className={`mob-tab ${view===t.k?"active":""}`}
              onClick={() => t.admin?requireAdmin(()=>setView(t.k)):setView(t.k)}>
              <span className="mob-tab-icon">{t.icon}</span>{t.l}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
