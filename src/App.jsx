import React, { useState, useEffect, useRef } from "react";

// ============================================================================
// MatIQ — Win the scrambles
// Coach Noonan's private & small-group wrestling coaching platform
// ----------------------------------------------------------------------------
// NOTE ON DATA: In-memory React state. Data resets on reload — expected for
// a prototype. A developer wires this to a real backend for production.
//
// NOTE ON PAYMENTS:
//   - Venmo & Cash App: mobile deep links (work great on phones, show
//     username on desktop). Fully functional today.
//   - Card (Stripe) & PayPal: "Coming soon" — visible in UI, ready to flip on.
//     Search "STRIPE INTEGRATION POINT" for the wiring spot.
//
// NOTE ON PARTNER EMAIL: Uses mailto: to pre-fill the user's email client.
// For automatic server-sent emails, swap in Resend/SendGrid.
// Search "PARTNER EMAIL".
//
// ADMIN ACCESS: Footer → "Coach Login". Demo passcode: matiq2026
// ============================================================================

const ADMIN_PASSCODE = "matiq2026"; // DEMO ONLY — replace with real auth

const PAYMENT_INFO = {
  venmo: "patrick-noonan-49",
  cashapp: "patnoonan1",
};

const COACH = {
  name: "Coach Noonan",
  tagline: "Win the scrambles.",
  bio: "Patrick Noonan had a stellar career at a national level throughout high school into NCAA competition before turning to coaching. He now coaches at Mat Assassins Wrestling Club alongside Van Dobish and Colby Ems. He develops wrestlers K–12 through private and small-group training. His athletes win — and the sessions book out fast.",
  accolades: [
    "3x NHSCA HS Champion",
    "Ranked Top 10 in the Nation @ 132 lbs",
    "PIAA State Finalist",
    "Super 32 Place Winner",
    "3x Journeymen Classic Champion",
    "Wrestled under two Power 5 Programs",
  ],
  pedigree: {
    label: "NCAA Division 1 Pedigree",
    coachedUnder: "Van Dobish · Brent Metcalf · Kevin Dresser · Derek St. John · Jeff Buxton & more",
  },
};

const SEED_SESSION_TYPES = [
  {
    id: "st_1on1",
    name: "Private 1-on-1",
    duration: 60,
    price: 60,
    capacity: 1,
    blurb:
      "Fully individualized. Technique, scrambles, and match strategy tailored to one wrestler. Where the fastest gains happen.",
    color: "#d4422f",
    isPartner: false,
  },
  {
    id: "st_pair",
    name: "Partner Session (2)",
    duration: 60,
    price: 35,
    blurbPerPerson: true,
    capacity: 2,
    blurb:
      "Bring a partner or train with one of Coach's. Live drilling with real resistance, coached rep by rep. Per wrestler.",
    color: "#e08a1e",
    isPartner: true,
  },
  {
    id: "st_group",
    name: "Small Group (up to 10)",
    duration: 90,
    price: 25,
    blurbPerPerson: true,
    capacity: 10,
    blurb:
      "High-energy group work. Position-specific drilling, situational wrestling, and conditioning. Per wrestler.",
    color: "#2f7dd4",
    isPartner: false,
  },
];

// Default schedule: Mon–Sun, 7 AM – 5 PM ET, with 1–3 PM lunch break.
const DEFAULT_TIMES = [
  "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  // 1:00 – 3:00 PM blocked for lunch
  "3:00 PM", "4:00 PM", "5:00 PM",
];

function seedAvailability() {
  const slots = [];
  const now = new Date();
  for (let d = 1; d <= 14; d++) {
    const date = new Date(now);
    date.setDate(now.getDate() + d);
    DEFAULT_TIMES.forEach((t, i) => {
      slots.push({
        id: `slot_${d}_${i}`,
        dateISO: date.toISOString().slice(0, 10),
        time: t,
        booked: false,
      });
    });
  }
  return slots;
}

const fmtDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const fmtDuration = (min) =>
  min >= 60
    ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}`
    : `${min}m`;

// ============================================================================
// LOGO — MatIQ
// ============================================================================
function Logo({ size = 42 }) {
  // Bold athletic monogram on a tilted red plate, with a scramble-hook tail
  // connecting the M to the IQ.
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <defs>
        <linearGradient id="mq-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d4422f" />
          <stop offset="100%" stopColor="#b3331f" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="13" fill="url(#mq-grad)" />
      {/* M strokes */}
      <path d="M11 47 L11 21 L19 21 L26 34 L33 21 L41 21 L41 47" fill="none" stroke="#f5f3ee" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* I */}
      <circle cx="49" cy="22" r="3.2" fill="#f5f3ee" />
      <path d="M49 28 L49 47" stroke="#f5f3ee" strokeWidth="4.5" strokeLinecap="round" />
      {/* Scramble-hook connector */}
      <path d="M41 47 Q45 51 49 47" fill="none" stroke="#f5f3ee" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

// ============================================================================
// ROOT
// ============================================================================
export default function App() {
  const [sessionTypes, setSessionTypes] = useState(SEED_SESSION_TYPES);
  const [availability, setAvailability] = useState(seedAvailability);
  const [bookings, setBookings] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState("home");
  const [selectedType, setSelectedType] = useState(null);

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Narrow:wght@500;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    :root {
      --ink:#0c0d10; --ink2:#15171c; --panel:#1b1e25; --line:#2a2e38;
      --fog:#9aa3b2; --fog2:#6b7382; --paper:#f5f3ee; --red:#d4422f;
      --red2:#b3331f; --gold:#e0a92e; --venmo:#3d95ce; --cashapp:#00d632;
    }
    body { background:var(--ink); }
    .pt-root {
      font-family:'Archivo',sans-serif; color:var(--paper);
      background:
        radial-gradient(1200px 600px at 80% -10%, rgba(212,66,47,.10), transparent 60%),
        radial-gradient(900px 500px at -10% 20%, rgba(224,169,46,.06), transparent 55%),
        var(--ink);
      min-height:100vh; -webkit-font-smoothing:antialiased;
    }
    .pt-noise:before {
      content:""; position:fixed; inset:0; pointer-events:none; opacity:.035; z-index:1;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }
    .wrap { max-width:1120px; margin:0 auto; padding:0 24px; position:relative; z-index:2; }
    .display { font-family:'Anton',sans-serif; letter-spacing:.5px; text-transform:uppercase; line-height:.95; }
    .narrow { font-family:'Archivo Narrow',sans-serif; }

    /* NAV */
    .nav { display:flex; align-items:center; justify-content:space-between; padding:20px 0; position:sticky; top:0; z-index:50;
      background:linear-gradient(var(--ink),rgba(12,13,16,.82)); backdrop-filter:blur(8px); border-bottom:1px solid var(--line); }
    .brand { display:flex; align-items:center; gap:12px; cursor:pointer; }
    .brand-name { font-family:'Anton',sans-serif; font-size:24px; text-transform:uppercase; letter-spacing:1px; line-height:1; }
    .brand-name em { color:var(--red); font-style:normal; }
    .brand-tag { font-family:'Archivo Narrow',sans-serif; font-size:10px; font-weight:700; color:var(--fog2); letter-spacing:2px; text-transform:uppercase; margin-top:3px; }
    .nav-cta { background:var(--red); color:#fff; border:none; padding:11px 20px; border-radius:8px;
      font-family:'Archivo',sans-serif; font-weight:800; font-size:13px; text-transform:uppercase; letter-spacing:.6px;
      cursor:pointer; transition:.2s; }
    .nav-cta:hover { background:var(--red2); transform:translateY(-1px); }
    .badge-admin { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.5px; color:var(--gold);
      border:1px solid var(--gold); padding:5px 10px; border-radius:6px; }

    /* HERO */
    .hero { padding:72px 0 48px; position:relative; }
    .hero-mark { display:flex; align-items:center; gap:18px; margin-bottom:8px; }
    .hero-mark .wordmark { font-family:'Anton',sans-serif; font-size:clamp(64px,11vw,128px); line-height:.9; text-transform:uppercase;
      letter-spacing:-1px; }
    .hero-mark .wordmark .iq { color:var(--red); }
    .hero-slogan { font-family:'Archivo Narrow',sans-serif; font-weight:700; font-size:clamp(18px,2.4vw,26px);
      letter-spacing:6px; text-transform:uppercase; color:var(--paper); margin-top:8px; }
    .hero-slogan:before { content:""; display:inline-block; width:36px; height:2px; background:var(--red); vertical-align:middle; margin-right:14px; margin-bottom:5px; }
    .hero-tag { display:inline-flex; align-items:center; gap:8px; font-size:12px; font-weight:800; text-transform:uppercase;
      letter-spacing:1.5px; color:var(--red); margin-bottom:22px; }
    .hero-tag:before { content:""; width:28px; height:2px; background:var(--red); }
    .hero p { max-width:540px; margin:26px 0 0; font-size:18px; line-height:1.55; color:var(--fog); }
    .hero-actions { margin-top:34px; display:flex; gap:14px; flex-wrap:wrap; }
    .btn-primary { background:var(--red); color:#fff; border:none; padding:16px 30px; border-radius:10px;
      font-family:'Archivo',sans-serif; font-weight:800; font-size:15px; text-transform:uppercase; letter-spacing:.7px;
      cursor:pointer; transition:.2s; box-shadow:0 10px 30px rgba(212,66,47,.35); }
    .btn-primary:hover { background:var(--red2); transform:translateY(-2px); box-shadow:0 14px 36px rgba(212,66,47,.45); }
    .btn-primary:disabled { opacity:.45; cursor:not-allowed; transform:none; box-shadow:none; }
    .btn-ghost { background:transparent; color:var(--paper); border:1px solid var(--line); padding:16px 28px; border-radius:10px;
      font-family:'Archivo',sans-serif; font-weight:700; font-size:15px; text-transform:uppercase; letter-spacing:.7px;
      cursor:pointer; transition:.2s; }
    .btn-ghost:hover { border-color:var(--paper); }

    /* PEDIGREE BAR */
    .pedigree { margin-top:48px; padding:22px 26px; background:var(--ink2); border:1px solid var(--line); border-radius:12px;
      display:flex; gap:24px; align-items:center; flex-wrap:wrap; }
    .pedigree-badge { display:inline-flex; align-items:center; gap:10px; font-family:'Anton',sans-serif; text-transform:uppercase;
      font-size:18px; letter-spacing:1px; color:var(--red); flex:none; }
    .pedigree-badge .dot { width:10px; height:10px; background:var(--red); border-radius:50%; box-shadow:0 0 12px rgba(212,66,47,.6); }
    .pedigree-text { color:var(--fog); font-weight:500; font-size:14px; line-height:1.55; flex:1; min-width:200px; }
    .pedigree-text b { color:var(--paper); font-weight:800; text-transform:uppercase; letter-spacing:.6px; font-size:11px; display:block; margin-bottom:4px; }

    /* SECTION HEADING */
    .sec { padding:64px 0; }
    .sec-head { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:36px; gap:20px; flex-wrap:wrap; }
    .sec-head h2 { font-family:'Anton',sans-serif; font-size:clamp(30px,5vw,46px); text-transform:uppercase; line-height:.95; }
    .sec-head .kicker { color:var(--red); font-weight:800; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px; }
    .sec-head p { color:var(--fog); max-width:420px; }

    /* SESSION CARDS */
    .cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:18px; }
    .card { background:linear-gradient(180deg,var(--panel),var(--ink2)); border:1px solid var(--line); border-radius:16px;
      padding:26px; position:relative; overflow:hidden; transition:.25s; }
    .card:hover { transform:translateY(-4px); border-color:var(--fog2); }
    .card-accent { position:absolute; top:0; left:0; width:100%; height:4px; }
    .card-cap { font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:var(--fog2); }
    .card h3 { font-family:'Anton',sans-serif; font-size:25px; text-transform:uppercase; margin:10px 0 6px; line-height:1; }
    .card-meta { display:flex; gap:14px; color:var(--fog); font-size:13px; font-weight:600; margin-bottom:14px; }
    .card-blurb { color:var(--fog); font-size:14px; line-height:1.5; min-height:62px; }
    .card-foot { display:flex; align-items:flex-end; justify-content:space-between; margin-top:18px; }
    .price { font-family:'Anton',sans-serif; font-size:34px; }
    .price small { font-family:'Archivo',sans-serif; font-size:13px; color:var(--fog2); font-weight:600; }
    .card-book { background:var(--paper); color:var(--ink); border:none; padding:11px 18px; border-radius:8px;
      font-weight:800; font-size:13px; text-transform:uppercase; letter-spacing:.5px; cursor:pointer; transition:.2s; }
    .card-book:hover { background:#fff; transform:translateY(-1px); }

    /* ABOUT */
    .about { display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:center; }
    .about-photo { aspect-ratio:4/5; border-radius:18px; border:1px solid var(--line); position:relative; overflow:hidden;
      background:linear-gradient(135deg,#1b1e25,#0c0d10); display:grid; place-items:center; }
    .about-photo .mono { font-family:'Anton',sans-serif; font-size:200px; color:rgba(245,243,238,.05); line-height:1; }
    .about-photo .tagm { position:absolute; bottom:20px; left:20px; right:20px; }
    .about-photo .tagm .display { font-size:30px; color:var(--red); }
    .accolades { list-style:none; margin-top:22px; display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .accolades li { display:flex; align-items:center; gap:12px; color:var(--paper); font-weight:600; font-size:14px; }
    .accolades li:before { content:""; width:8px; height:8px; background:var(--red); transform:rotate(45deg); flex:none; }
    .coached-under { margin-top:26px; padding:18px 20px; background:var(--ink2); border:1px solid var(--line); border-radius:12px; }
    .coached-under .lbl { font-size:11px; font-weight:800; color:var(--red); letter-spacing:1.5px; margin-bottom:8px; text-transform:uppercase; }
    .coached-under .names { color:var(--paper); font-weight:600; font-size:14px; line-height:1.55; }

    /* FOOTER */
    .footer { border-top:1px solid var(--line); padding:40px 0; margin-top:40px; }
    .footer-inner { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; }
    .footer .muted { color:var(--fog2); font-size:13px; }
    .coach-login { background:none; border:none; color:var(--fog2); font-size:12px; cursor:pointer; text-decoration:underline;
      font-family:'Archivo',sans-serif; }
    .coach-login:hover { color:var(--paper); }

    /* MODAL / OVERLAY */
    .overlay { position:fixed; inset:0; background:rgba(8,9,11,.78); backdrop-filter:blur(6px); z-index:100;
      display:grid; place-items:center; padding:24px; animation:fade .2s ease; }
    @keyframes fade { from{opacity:0} to{opacity:1} }
    .modal { background:var(--ink2); border:1px solid var(--line); border-radius:18px; width:100%; max-width:560px;
      max-height:90vh; overflow:auto; animation:rise .25s ease; }
    @keyframes rise { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
    .modal-head { padding:24px 28px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;
      position:sticky; top:0; background:var(--ink2); z-index:2; }
    .modal-head h3 { font-family:'Anton',sans-serif; font-size:24px; text-transform:uppercase; }
    .x { background:none; border:none; color:var(--fog); font-size:26px; cursor:pointer; line-height:1; }
    .x:hover { color:var(--paper); }
    .modal-body { padding:28px; }

    .field { margin-bottom:18px; }
    .field label { display:block; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.6px; color:var(--fog);
      margin-bottom:7px; }
    .field input, .field select, .field textarea { width:100%; background:var(--panel); border:1px solid var(--line);
      border-radius:9px; padding:13px 14px; color:var(--paper); font-family:'Archivo',sans-serif; font-size:15px; transition:.15s; }
    .field input:focus, .field select:focus, .field textarea:focus { outline:none; border-color:var(--red); }
    .field-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .field-hint { font-size:12px; color:var(--fog2); margin-top:6px; }

    .slot-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(92px,1fr)); gap:10px; }
    .slot { background:var(--panel); border:1px solid var(--line); border-radius:9px; padding:11px 6px; text-align:center;
      cursor:pointer; transition:.15s; }
    .slot:hover:not(.disabled) { border-color:var(--red); }
    .slot.sel { background:var(--red); border-color:var(--red); color:#fff; }
    .slot.disabled { opacity:.3; cursor:not-allowed; text-decoration:line-through; }
    .slot .st { font-weight:800; font-size:14px; }
    .day-block { margin-bottom:18px; }
    .day-label { font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:.6px; color:var(--paper); margin-bottom:9px;
      display:flex; align-items:center; gap:8px; }
    .day-label:before { content:""; width:6px; height:6px; background:var(--red); border-radius:50%; }

    .pay-opts { display:grid; gap:12px; }
    .pay-opt { border:1px solid var(--line); border-radius:12px; padding:16px; cursor:pointer; transition:.15s;
      display:flex; align-items:center; gap:14px; }
    .pay-opt:hover:not(.disabled) { border-color:var(--fog2); }
    .pay-opt.sel { border-color:var(--red); background:rgba(212,66,47,.08); }
    .pay-opt.disabled { opacity:.5; cursor:not-allowed; }
    .pay-radio { width:18px; height:18px; border-radius:50%; border:2px solid var(--fog2); flex:none; position:relative; }
    .pay-opt.sel .pay-radio { border-color:var(--red); }
    .pay-opt.sel .pay-radio:after { content:""; position:absolute; inset:3px; border-radius:50%; background:var(--red); }
    .pay-opt .pt { font-weight:800; display:flex; align-items:center; gap:8px; }
    .pay-opt .ps { font-size:13px; color:var(--fog); }
    .pay-icon { width:28px; height:28px; border-radius:6px; display:grid; place-items:center; flex:none; font-weight:900; font-size:13px; color:#fff; }
    .soon-pill { font-size:10px; font-weight:800; padding:3px 8px; border-radius:4px; background:var(--panel); color:var(--fog2); letter-spacing:.5px; text-transform:uppercase; }

    .summary { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:18px; margin-bottom:20px; }
    .summary-row { display:flex; justify-content:space-between; padding:6px 0; font-size:14px; }
    .summary-row.total { border-top:1px solid var(--line); margin-top:8px; padding-top:12px; font-size:18px; font-weight:800; }
    .summary-row .lbl { color:var(--fog); }

    .stepper { display:flex; gap:8px; margin-bottom:24px; }
    .step-dot { flex:1; height:4px; border-radius:2px; background:var(--line); }
    .step-dot.on { background:var(--red); }

    .success { text-align:center; padding:20px 0; }
    .success .check { width:72px; height:72px; border-radius:50%; background:rgba(30,158,106,.15); border:2px solid #1e9e6a;
      display:grid; place-items:center; margin:0 auto 20px; font-size:36px; }
    .success h3 { font-family:'Anton',sans-serif; font-size:28px; text-transform:uppercase; margin-bottom:10px; }
    .success p { color:var(--fog); margin-bottom:6px; }

    .pay-action { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:18px; margin:18px 0; text-align:left; }
    .pay-action .pa-title { font-family:'Anton',sans-serif; font-size:18px; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; }
    .pay-action .pa-amount { font-size:13px; color:var(--fog); margin-bottom:14px; }
    .pay-action .pa-handle { background:var(--ink2); border:1px solid var(--line); border-radius:8px;
      padding:10px 14px; font-weight:800; color:var(--paper); margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; }
    .pay-btn { display:inline-block; width:100%; text-align:center; padding:13px 20px; border-radius:8px; font-weight:800;
      font-family:'Archivo',sans-serif; font-size:14px; text-decoration:none; text-transform:uppercase; letter-spacing:.7px; transition:.15s; }
    .pay-btn.venmo { background:var(--venmo); color:#fff; }
    .pay-btn.cashapp { background:var(--cashapp); color:#0c0d10; }
    .pay-btn:hover { transform:translateY(-1px); opacity:.92; }
    .copy-btn { background:none; border:none; color:var(--red); font-weight:800; font-size:12px; cursor:pointer; text-transform:uppercase; letter-spacing:.5px; }

    /* Partner choice toggle */
    .pchoice { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:18px; }
    .pchoice-opt { border:1px solid var(--line); border-radius:12px; padding:18px 14px; cursor:pointer; transition:.15s;
      background:var(--panel); text-align:center; }
    .pchoice-opt:hover { border-color:var(--fog2); }
    .pchoice-opt.sel { border-color:var(--red); background:rgba(212,66,47,.08); }
    .pchoice-opt .pco-icon { font-size:26px; margin-bottom:8px; }
    .pchoice-opt .pco-title { font-family:'Anton',sans-serif; font-size:16px; text-transform:uppercase; letter-spacing:.5px; }
    .pchoice-opt .pco-sub { font-size:12px; color:var(--fog); margin-top:4px; line-height:1.4; }

    .notify-toggle { display:flex; align-items:center; gap:12px; background:var(--panel); border:1px solid var(--line);
      border-radius:10px; padding:14px 16px; margin-top:6px; cursor:pointer; transition:.15s; }
    .notify-toggle:hover { border-color:var(--fog2); }
    .notify-toggle.on { border-color:#2f7dd4; background:rgba(47,125,212,.08); }
    .notify-check { width:22px; height:22px; border-radius:5px; border:2px solid var(--fog2); flex:none; display:grid; place-items:center;
      color:#fff; font-size:14px; font-weight:900; transition:.15s; }
    .notify-toggle.on .notify-check { background:#2f7dd4; border-color:#2f7dd4; }
    .notify-toggle .nt-title { font-weight:800; font-size:14px; }
    .notify-toggle .nt-sub { font-size:12px; color:var(--fog); margin-top:2px; }

    .info-box { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:16px 18px; font-size:13.5px; color:var(--fog); line-height:1.55; }
    .info-box b { color:var(--paper); }

    /* ADMIN */
    .admin-tabs { display:flex; gap:8px; margin-bottom:28px; border-bottom:1px solid var(--line); flex-wrap:wrap; }
    .admin-tab { background:none; border:none; color:var(--fog); padding:12px 18px; font-family:'Archivo',sans-serif;
      font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:.5px; cursor:pointer; border-bottom:2px solid transparent; }
    .admin-tab.on { color:var(--paper); border-bottom-color:var(--red); }
    .admin-section { animation:fade .2s; }
    .row-item { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:18px; margin-bottom:12px;
      display:flex; justify-content:space-between; align-items:center; gap:16px; }
    .row-item .ri-main { display:flex; align-items:center; gap:14px; }
    .ri-dot { width:10px; height:36px; border-radius:4px; flex:none; }
    .ri-name { font-weight:800; font-size:16px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .ri-sub { font-size:13px; color:var(--fog); }
    .ri-actions { display:flex; gap:8px; }
    .mini { background:var(--panel); border:1px solid var(--line); color:var(--paper); padding:8px 14px; border-radius:7px;
      font-weight:700; font-size:12px; text-transform:uppercase; cursor:pointer; transition:.15s; }
    .mini:hover { border-color:var(--paper); }
    .mini.danger:hover { border-color:var(--red); color:var(--red); }
    .mini.add { background:var(--red); border-color:var(--red); color:#fff; }
    .mini.add:hover { background:var(--red2); }
    .admin-avail-day { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:12px; }
    .aad-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px; }
    .aad-head .d { font-weight:800; text-transform:uppercase; letter-spacing:.5px; }
    .admin-slot { display:inline-flex; align-items:center; gap:8px; background:var(--ink2); border:1px solid var(--line);
      border-radius:8px; padding:7px 10px; margin:0 8px 8px 0; font-size:13px; font-weight:700; }
    .admin-slot.booked { opacity:.5; }
    .admin-slot button { background:none; border:none; color:var(--fog2); cursor:pointer; font-size:15px; line-height:1; }
    .admin-slot button:hover { color:var(--red); }
    .empty { text-align:center; color:var(--fog2); padding:40px; border:1px dashed var(--line); border-radius:12px; }
    .bk-card { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:10px; }
    .bk-top { display:flex; justify-content:space-between; margin-bottom:6px; align-items:center; flex-wrap:wrap; gap:8px; }
    .bk-name { font-weight:800; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .pill { font-size:11px; font-weight:800; text-transform:uppercase; padding:4px 9px; border-radius:20px; letter-spacing:.4px; }
    .pill.paid { background:rgba(30,158,106,.15); color:#3fcf8e; }
    .pill.cash { background:rgba(224,169,46,.15); color:var(--gold); }
    .pill.venmo { background:rgba(61,149,206,.15); color:var(--venmo); }
    .pill.cashapp { background:rgba(0,214,50,.15); color:#3fcf8e; }
    .pill.partner { background:rgba(47,125,212,.15); color:#5ba0ea; }
    .note { background:rgba(212,66,47,.08); border:1px solid rgba(212,66,47,.3); border-radius:10px; padding:14px 16px;
      font-size:13px; color:var(--fog); line-height:1.5; margin-bottom:20px; }
    .note b { color:var(--paper); }

    @media (max-width:760px){
      .wrap { padding:0 18px; }
      .nav { padding:14px 0; }
      .brand-name { font-size:21px; }
      .brand-tag { font-size:9px; letter-spacing:1.5px; }
      .nav-cta { padding:10px 16px; font-size:12px; }
      .hero { padding:40px 0 32px; }
      .hero-tag { font-size:11px; margin-bottom:18px; letter-spacing:1px; }
      .hero-tag:before { width:20px; }
      .hero-mark .wordmark { font-size:64px; letter-spacing:-1.5px; }
      .hero-slogan { font-size:14px; letter-spacing:4px; margin-top:6px; }
      .hero-slogan:before { width:24px; margin-right:10px; }
      .hero p { font-size:16px; margin-top:20px; }
      .hero-actions { margin-top:26px; gap:10px; }
      .btn-primary, .btn-ghost { padding:14px 22px; font-size:13px; width:100%; }
      .pedigree { margin-top:36px; padding:18px 20px; gap:14px; flex-direction:column; align-items:flex-start; }
      .pedigree-badge { font-size:15px; }
      .pedigree-text { font-size:13px; }
      .sec { padding:44px 0; }
      .sec-head { margin-bottom:28px; }
      .sec-head h2 { font-size:32px; }
      .card { padding:22px; border-radius:14px; }
      .card h3 { font-size:22px; }
      .price { font-size:30px; }
      .about { grid-template-columns:1fr; gap:32px; }
      .about-photo { max-width:280px; margin:0 auto; }
      .about-photo .mono { font-size:160px; }
      .about-photo .tagm .display { font-size:26px; }
      .accolades { grid-template-columns:1fr; gap:10px; }
      .accolades li { font-size:13.5px; }
      .coached-under { padding:16px 18px; }
      .coached-under .names { font-size:13.5px; }
      .footer { padding:28px 0; margin-top:24px; }
      .footer-inner { gap:14px; }

      .modal { border-radius:14px; max-height:94vh; }
      .modal-head { padding:18px 20px; }
      .modal-head h3 { font-size:20px; }
      .modal-body { padding:20px; }
      .field-row { grid-template-columns:1fr; }
      .pchoice { grid-template-columns:1fr; }
      .slot-grid { grid-template-columns:repeat(auto-fill,minmax(80px,1fr)); gap:8px; }
      .slot { padding:10px 4px; }
      .slot .st { font-size:13px; }
      .pay-opt { padding:14px; }
      .pay-opt .pt { font-size:14px; }
      .pay-opt .ps { font-size:12px; }
      .pay-icon { width:24px; height:24px; font-size:11px; }
      .pay-action { padding:16px; }
      .summary-row { font-size:13px; }
      .summary-row.total { font-size:16px; }

      .admin-tabs { gap:4px; overflow-x:auto; flex-wrap:nowrap; padding-bottom:2px; }
      .admin-tab { padding:10px 14px; font-size:13px; white-space:nowrap; }
      .row-item { padding:14px; gap:12px; }
      .ri-name { font-size:14.5px; }
      .ri-sub { font-size:12.5px; }
      .ri-actions { flex-direction:column; gap:6px; }
      .mini { padding:7px 12px; font-size:11px; }
      .admin-avail-day { padding:14px; }
    }
  `;

  return (
    <div className="pt-root pt-noise">
      <style>{styles}</style>

      <Nav
        isAdmin={isAdmin}
        onHome={() => setView("home")}
        onBook={() => { setSelectedType(null); setView("booking"); }}
        onExitAdmin={() => { setIsAdmin(false); setView("home"); }}
        adminMode={view === "admin"}
      />

      {view === "admin" && isAdmin ? (
        <AdminPanel
          sessionTypes={sessionTypes}
          setSessionTypes={setSessionTypes}
          availability={availability}
          setAvailability={setAvailability}
          bookings={bookings}
        />
      ) : (
        <Home
          sessionTypes={sessionTypes}
          onBook={(t) => { setSelectedType(t); setView("booking"); }}
        />
      )}

      <Footer
        onCoachLogin={() => { if (isAdmin) setView("admin"); else setView("login"); }}
        isAdmin={isAdmin}
      />

      {view === "booking" && (
        <BookingFlow
          sessionTypes={sessionTypes}
          availability={availability}
          preselected={selectedType}
          onClose={() => setView("home")}
          onComplete={(booking, slotId) => {
            setBookings((b) => [booking, ...b]);
            setAvailability((a) => a.map((s) => (s.id === slotId ? { ...s, booked: true } : s)));
          }}
        />
      )}

      {view === "login" && (
        <LoginModal
          onClose={() => setView("home")}
          onSuccess={() => { setIsAdmin(true); setView("admin"); }}
        />
      )}
    </div>
  );
}

// ============================================================================
// NAV
// ============================================================================
function Nav({ isAdmin, onHome, onBook, onExitAdmin, adminMode }) {
  return (
    <nav className="nav">
      <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 0 }}>
        <div className="brand" onClick={onHome}>
          <div>
            <div className="brand-name">Mat<em>IQ</em></div>
            <div className="brand-tag">Win the scrambles</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {isAdmin && <span className="badge-admin">Coach Mode</span>}
          {adminMode ? (
            <button className="nav-cta" onClick={onExitAdmin}>Exit to Site</button>
          ) : (
            <button className="nav-cta" onClick={onBook}>Book a Session</button>
          )}
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// HOME
// ============================================================================
function Home({ sessionTypes, onBook }) {
  return (
    <>
      <header className="hero">
        <div className="wrap">
          <div className="hero-tag">Private &amp; Small-Group Wrestling · K–12</div>
          <div className="hero-mark">
            <div className="wordmark">Mat<span className="iq">IQ</span></div>
          </div>
          <div className="hero-slogan">Win the scrambles</div>
          <p>Train with Coach Noonan — NCAA Division 1 pedigree, national credentials, and a record of building wrestlers who win when the match gets ugly.</p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => onBook(null)}>Book a Session →</button>
            <button className="btn-ghost" onClick={() => document.getElementById("sessions")?.scrollIntoView({ behavior: "smooth" })}>View Session Types</button>
          </div>

          <div className="pedigree">
            <div className="pedigree-badge"><span className="dot" />NCAA Division 1 Pedigree</div>
            <div className="pedigree-text">
              <b>Coached Under</b>
              {COACH.pedigree.coachedUnder}
            </div>
          </div>
        </div>
      </header>

      <section className="sec" id="sessions">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="kicker">Choose Your Path</div>
              <h2>Session Types</h2>
            </div>
            <p>Every format is coached personally by Coach Noonan. Pick what fits your wrestler's goals and schedule.</p>
          </div>
          <div className="cards">
            {sessionTypes.map((t) => (
              <div className="card" key={t.id}>
                <div className="card-accent" style={{ background: t.color }} />
                <div className="card-cap">{t.capacity === 1 ? "Individual" : `Up to ${t.capacity} wrestlers`}</div>
                <h3>{t.name}</h3>
                <div className="card-meta">
                  <span>⏱ {fmtDuration(t.duration)}</span>
                  <span>👥 {t.capacity === 1 ? "Solo" : `${t.capacity} max`}</span>
                </div>
                <div className="card-blurb">{t.blurb}</div>
                <div className="card-foot">
                  <div className="price">${t.price}<small>{t.blurbPerPerson ? " /wrestler" : ""}</small></div>
                  <button className="card-book" onClick={() => onBook(t)}>Book →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="about">
            <div className="about-photo">
              <div className="mono">N</div>
              <div className="tagm">
                <div className="display">Coach<br />Noonan</div>
              </div>
            </div>
            <div>
              <div className="kicker" style={{ color: "var(--red)", fontWeight: 800, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>About The Coach</div>
              <h2 className="display" style={{ fontSize: 40 }}>Mat-Tested.<br />Athlete-Focused.</h2>
              <p style={{ color: "var(--fog)", marginTop: 18, lineHeight: 1.6 }}>{COACH.bio}</p>
              <ul className="accolades">
                {COACH.accolades.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
              <div className="coached-under">
                <div className="lbl">Coached Under</div>
                <div className="names">{COACH.pedigree.coachedUnder}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ============================================================================
// BOOKING FLOW
// ============================================================================
function BookingFlow({ sessionTypes, availability, preselected, onClose, onComplete }) {
  const [step, setStep] = useState(preselected ? 1 : 0);
  const [type, setType] = useState(preselected || null);
  const [slot, setSlot] = useState(null);
  const [info, setInfo] = useState({ wrestler: "", contact: "", email: "", notes: "" });
  // Partner-specific state
  const [partnerChoice, setPartnerChoice] = useState(null); // "own" | "coach"
  const [partnerInfo, setPartnerInfo] = useState({ name: "", email: "", notify: false });
  const [pay, setPay] = useState(null);
  const [done, setDone] = useState(false);
  const [booking, setBooking] = useState(null);

  const isPartnerSession = type?.isPartner;
  const totalSteps = isPartnerSession ? 5 : 4;
  const stepIndices = isPartnerSession ? [0, 1, 2, 3, 4] : [0, 1, 2, 3];

  const openSlots = availability.filter((s) => !s.booked);
  const byDate = openSlots.reduce((acc, s) => {
    (acc[s.dateISO] = acc[s.dateISO] || []).push(s);
    return acc;
  }, {});

  // Step validation
  let canContinue = false;
  if (step === 0) canContinue = !!type;
  else if (step === 1) canContinue = !!slot;
  else if (step === 2 && isPartnerSession) {
    canContinue =
      partnerChoice === "coach" ||
      (partnerChoice === "own" && partnerInfo.name.trim() && (!partnerInfo.notify || partnerInfo.email.trim()));
  } else if ((step === 2 && !isPartnerSession) || (step === 3 && isPartnerSession)) {
    canContinue = info.wrestler.trim() && info.contact.trim();
  } else if ((step === 3 && !isPartnerSession) || (step === 4 && isPartnerSession)) {
    canContinue = !!pay;
  }

  function handleConfirm() {
    // STRIPE INTEGRATION POINT --------------------------------------------------
    // If pay === "card" (currently disabled), call your backend to create a
    // Stripe Checkout Session and redirect. Same for PayPal.
    // Venmo/Cash App handled below via deep links on the success screen.
    // ---------------------------------------------------------------------------
    const newBooking = {
      id: "bk_" + Date.now(),
      typeId: type.id,
      type: type.name,
      price: type.price,
      dateISO: slot.dateISO,
      time: slot.time,
      wrestler: info.wrestler,
      contact: info.contact,
      email: info.email,
      notes: info.notes,
      payment: pay,
      isPartner: isPartnerSession,
      partnerChoice: isPartnerSession ? partnerChoice : null,
      partnerName: isPartnerSession && partnerChoice === "own" ? partnerInfo.name : null,
      partnerEmail: isPartnerSession && partnerChoice === "own" ? partnerInfo.email : null,
      createdAt: new Date().toISOString(),
    };

    // PARTNER EMAIL ------------------------------------------------------------
    // If the user wants to notify their partner, open their email client
    // pre-filled. For automatic server-sent emails, swap in Resend/SendGrid.
    // --------------------------------------------------------------------------
    if (isPartnerSession && partnerChoice === "own" && partnerInfo.notify && partnerInfo.email) {
      const subject = encodeURIComponent(`Wrestling Partner Session with ${info.wrestler} — ${fmtDate(slot.dateISO)} at ${slot.time}`);
      const body = encodeURIComponent(
`Hey ${partnerInfo.name},

${info.wrestler} booked a Partner Session with Coach Noonan and picked you as their training partner.

📅  When: ${fmtDate(slot.dateISO)} at ${slot.time}
⏱  Duration: ${fmtDuration(type.duration)}
💪  Session: ${type.name}

See you on the mat.

— MatIQ · Win the scrambles
`
      );
      window.open(`mailto:${partnerInfo.email}?subject=${subject}&body=${body}`, "_blank");
    }

    setBooking(newBooking);
    onComplete(newBooking, slot.id);
    setDone(true);
  }

  const minStepForBack = preselected ? 1 : 0;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>{done ? "You're Booked" : "Book a Session"}</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {done ? (
            <Success booking={booking} type={type} slot={slot} info={info} pay={pay} partnerNotified={isPartnerSession && partnerChoice === "own" && partnerInfo.notify} onClose={onClose} />
          ) : (
            <>
              <div className="stepper">
                {stepIndices.map((i) => <div key={i} className={`step-dot ${step >= i ? "on" : ""}`} />)}
              </div>

              {/* STEP 0: Choose session type */}
              {step === 0 && (
                <div>
                  <p style={{ color: "var(--fog)", marginBottom: 18 }}>Which session do you want to book?</p>
                  <div className="pay-opts">
                    {sessionTypes.map((t) => (
                      <div key={t.id} className={`pay-opt ${type?.id === t.id ? "sel" : ""}`} onClick={() => setType(t)}>
                        <div className="pay-radio" />
                        <div style={{ flex: 1 }}>
                          <div className="pt">{t.name} — ${t.price}{t.blurbPerPerson ? "/wrestler" : ""}</div>
                          <div className="ps">{fmtDuration(t.duration)} · {t.capacity === 1 ? "Individual" : `Up to ${t.capacity}`}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 1: Pick a time */}
              {step === 1 && (
                <div>
                  <p style={{ color: "var(--fog)", marginBottom: 18 }}>Pick an open time for your <b style={{ color: "var(--paper)" }}>{type.name}</b>.</p>
                  {Object.keys(byDate).length === 0 ? (
                    <div className="empty">No open slots right now — check back soon.</div>
                  ) : (
                    Object.entries(byDate).map(([date, slots]) => (
                      <div className="day-block" key={date}>
                        <div className="day-label">{fmtDate(date)}</div>
                        <div className="slot-grid">
                          {slots.map((s) => (
                            <div key={s.id} className={`slot ${slot?.id === s.id ? "sel" : ""}`} onClick={() => setSlot(s)}>
                              <div className="st">{s.time}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* STEP 2 (partner only): Partner choice */}
              {step === 2 && isPartnerSession && (
                <div>
                  <p style={{ color: "var(--fog)", marginBottom: 18 }}>How do you want to handle the partner?</p>
                  <div className="pchoice">
                    <div className={`pchoice-opt ${partnerChoice === "own" ? "sel" : ""}`} onClick={() => setPartnerChoice("own")}>
                      <div className="pco-icon">🤝</div>
                      <div className="pco-title">Bring My Own</div>
                      <div className="pco-sub">A teammate, friend, or sibling to train with</div>
                    </div>
                    <div className={`pchoice-opt ${partnerChoice === "coach" ? "sel" : ""}`} onClick={() => setPartnerChoice("coach")}>
                      <div className="pco-icon">🎯</div>
                      <div className="pco-title">Coach Picks</div>
                      <div className="pco-sub">Coach Noonan pairs you at your level</div>
                    </div>
                  </div>

                  {partnerChoice === "own" && (
                    <div style={{ marginTop: 8 }}>
                      <div className="field">
                        <label>Partner's Name</label>
                        <input value={partnerInfo.name} onChange={(e) => setPartnerInfo({ ...partnerInfo, name: e.target.value })} placeholder="e.g. Alex K." />
                      </div>
                      <div className="field">
                        <label>Partner's Email (optional)</label>
                        <input type="email" value={partnerInfo.email} onChange={(e) => setPartnerInfo({ ...partnerInfo, email: e.target.value })} placeholder="partner@email.com" />
                        <div className="field-hint">Needed only if you want to send them a heads-up.</div>
                      </div>
                      <div
                        className={`notify-toggle ${partnerInfo.notify ? "on" : ""}`}
                        onClick={() => setPartnerInfo({ ...partnerInfo, notify: !partnerInfo.notify })}
                      >
                        <div className="notify-check">{partnerInfo.notify ? "✓" : ""}</div>
                        <div>
                          <div className="nt-title">Email my partner the session details</div>
                          <div className="nt-sub">We'll open your email app with a ready-to-send message when you confirm.</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {partnerChoice === "coach" && (
                    <div className="info-box" style={{ marginTop: 8 }}>
                      <b>You're set.</b> Coach Noonan will pair you with a wrestler at your level and reach out before the session to confirm.
                    </div>
                  )}
                </div>
              )}

              {/* CONTACT INFO */}
              {((step === 2 && !isPartnerSession) || (step === 3 && isPartnerSession)) && (
                <div>
                  <div className="field">
                    <label>Wrestler Name</label>
                    <input value={info.wrestler} onChange={(e) => setInfo({ ...info, wrestler: e.target.value })} placeholder="e.g. Jordan M." />
                  </div>
                  <div className="field">
                    <label>Parent / Contact Phone</label>
                    <input value={info.contact} onChange={(e) => setInfo({ ...info, contact: e.target.value })} placeholder="(555) 123-4567" />
                  </div>
                  <div className="field">
                    <label>Email (for confirmation)</label>
                    <input type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} placeholder="you@email.com" />
                  </div>
                  <div className="field">
                    <label>Goals / Notes (optional)</label>
                    <textarea rows={3} value={info.notes} onChange={(e) => setInfo({ ...info, notes: e.target.value })} placeholder="Weight class, what to work on, injuries to know about…" />
                  </div>
                </div>
              )}

              {/* PAYMENT */}
              {((step === 3 && !isPartnerSession) || (step === 4 && isPartnerSession)) && (
                <div>
                  <div className="summary">
                    <div className="summary-row"><span className="lbl">Session</span><span>{type.name}</span></div>
                    <div className="summary-row"><span className="lbl">When</span><span>{fmtDate(slot.dateISO)} · {slot.time}</span></div>
                    <div className="summary-row"><span className="lbl">Wrestler</span><span>{info.wrestler}</span></div>
                    {isPartnerSession && (
                      <div className="summary-row"><span className="lbl">Partner</span><span>{partnerChoice === "own" ? (partnerInfo.name || "TBD") : "Coach will pair"}</span></div>
                    )}
                    <div className="summary-row total"><span>Total</span><span>${type.price}</span></div>
                  </div>
                  <p style={{ color: "var(--fog)", marginBottom: 14, fontSize: 14 }}>How would you like to pay?</p>
                  <div className="pay-opts">
                    <div className={`pay-opt ${pay === "venmo" ? "sel" : ""}`} onClick={() => setPay("venmo")}>
                      <div className="pay-radio" />
                      <div className="pay-icon" style={{ background: "var(--venmo)" }}>V</div>
                      <div style={{ flex: 1 }}><div className="pt">Venmo</div><div className="ps">Pay @{PAYMENT_INFO.venmo}</div></div>
                    </div>
                    <div className={`pay-opt ${pay === "cashapp" ? "sel" : ""}`} onClick={() => setPay("cashapp")}>
                      <div className="pay-radio" />
                      <div className="pay-icon" style={{ background: "var(--cashapp)", color: "#0c0d10" }}>$</div>
                      <div style={{ flex: 1 }}><div className="pt">Cash App</div><div className="ps">Pay ${PAYMENT_INFO.cashapp}</div></div>
                    </div>
                    <div className={`pay-opt ${pay === "cash" ? "sel" : ""}`} onClick={() => setPay("cash")}>
                      <div className="pay-radio" />
                      <div className="pay-icon" style={{ background: "var(--gold)", color: "#0c0d10" }}>$</div>
                      <div style={{ flex: 1 }}><div className="pt">Cash at the session</div><div className="ps">Reserve now, bring payment to the mat</div></div>
                    </div>
                    <div className="pay-opt disabled">
                      <div className="pay-radio" />
                      <div className="pay-icon" style={{ background: "var(--fog2)" }}>C</div>
                      <div style={{ flex: 1 }}><div className="pt">Credit / Debit Card <span className="soon-pill">Coming Soon</span></div><div className="ps">Secure card checkout</div></div>
                    </div>
                    <div className="pay-opt disabled">
                      <div className="pay-radio" />
                      <div className="pay-icon" style={{ background: "#003087" }}>P</div>
                      <div style={{ flex: 1 }}><div className="pt">PayPal <span className="soon-pill">Coming Soon</span></div><div className="ps">Pay with your PayPal account</div></div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                {step > minStepForBack && (
                  <button className="btn-ghost" style={{ flex: "none", padding: "14px 22px" }} onClick={() => setStep(step - 1)}>Back</button>
                )}
                {step < totalSteps - 1 ? (
                  <button className="btn-primary" style={{ flex: 1 }} disabled={!canContinue} onClick={() => canContinue && setStep(step + 1)}>Continue →</button>
                ) : (
                  <button className="btn-primary" style={{ flex: 1 }} disabled={!canContinue} onClick={handleConfirm}>Confirm Booking</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Success({ booking, type, slot, info, pay, partnerNotified, onClose }) {
  const venmoNote = encodeURIComponent(`MatIQ ${type.name} - ${info.wrestler} - ${fmtDate(slot.dateISO)} ${slot.time}`);
  const venmoLink = `https://venmo.com/${PAYMENT_INFO.venmo}?txn=pay&amount=${type.price}&note=${venmoNote}`;
  const cashappLink = `https://cash.app/$${PAYMENT_INFO.cashapp}/${type.price}`;

  function copy(text) { navigator.clipboard?.writeText(text); }

  return (
    <div className="success">
      <div className="check">✓</div>
      <h3>See You On The Mat</h3>
      <p><b style={{ color: "var(--paper)" }}>{type.name}</b></p>
      <p>{fmtDate(slot.dateISO)} · {slot.time}</p>

      {pay === "venmo" && (
        <div className="pay-action">
          <div className="pa-title">Complete Payment via Venmo</div>
          <div className="pa-amount">Send <b style={{ color: "var(--paper)" }}>${type.price}</b> to:</div>
          <div className="pa-handle">
            <span>@{PAYMENT_INFO.venmo}</span>
            <button className="copy-btn" onClick={() => copy(`@${PAYMENT_INFO.venmo}`)}>Copy</button>
          </div>
          <a className="pay-btn venmo" href={venmoLink} target="_blank" rel="noopener noreferrer">Open Venmo →</a>
        </div>
      )}

      {pay === "cashapp" && (
        <div className="pay-action">
          <div className="pa-title">Complete Payment via Cash App</div>
          <div className="pa-amount">Send <b style={{ color: "var(--paper)" }}>${type.price}</b> to:</div>
          <div className="pa-handle">
            <span>${PAYMENT_INFO.cashapp}</span>
            <button className="copy-btn" onClick={() => copy(`$${PAYMENT_INFO.cashapp}`)}>Copy</button>
          </div>
          <a className="pay-btn cashapp" href={cashappLink} target="_blank" rel="noopener noreferrer">Open Cash App →</a>
        </div>
      )}

      {pay === "cash" && (
        <p style={{ marginTop: 14 }}>Spot reserved. Bring <b style={{ color: "var(--paper)" }}>${type.price}</b> cash to your session.</p>
      )}

      {info.email && pay === "cash" && (
        <p style={{ fontSize: 13, color: "var(--fog2)" }}>A confirmation is on its way to {info.email}.</p>
      )}

      {partnerNotified && (
        <p style={{ marginTop: 14, fontSize: 14, color: "#5ba0ea", fontWeight: 700 }}>
          ✉ A pre-filled email to your partner just opened — review and send it.
        </p>
      )}

      <button className="btn-primary" style={{ marginTop: 24 }} onClick={onClose}>Done</button>
    </div>
  );
}

// ============================================================================
// LOGIN
// ============================================================================
function LoginModal({ onClose, onSuccess }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  function submit() {
    if (code === ADMIN_PASSCODE) onSuccess();
    else setErr(true);
  }
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-head"><h3>Coach Login</h3><button className="x" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <p style={{ color: "var(--fog)", marginBottom: 18, fontSize: 14 }}>Enter your passcode to manage sessions and availability.</p>
          <div className="field">
            <label>Passcode</label>
            <input ref={ref} type="password" value={code}
              onChange={(e) => { setCode(e.target.value); setErr(false); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••••••" />
          </div>
          {err && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>Incorrect passcode. (Demo code: matiq2026)</p>}
          <button className="btn-primary" style={{ width: "100%" }} onClick={submit}>Unlock Coach Mode</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ADMIN PANEL
// ============================================================================
function AdminPanel({ sessionTypes, setSessionTypes, availability, setAvailability, bookings }) {
  const [tab, setTab] = useState("sessions");
  return (
    <section className="sec" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <div className="kicker" style={{ color: "var(--gold)", fontWeight: 800, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Coach Mode</div>
        <h2 className="display" style={{ fontSize: 40, marginBottom: 6 }}>Your Dashboard</h2>
        <p style={{ color: "var(--fog)", marginBottom: 28 }}>Edit what you offer, open and close time slots, and see who's booked.</p>

        <div className="note">
          <b>Heads up:</b> This is a working prototype. Changes you make here live in the browser session only and reset on reload. A developer connects this to a database so it sticks — and to Stripe/PayPal so card payments actually process. Venmo &amp; Cash App work today via the user's mobile app.
        </div>

        <div className="admin-tabs">
          <button className={`admin-tab ${tab === "sessions" ? "on" : ""}`} onClick={() => setTab("sessions")}>Session Types</button>
          <button className={`admin-tab ${tab === "avail" ? "on" : ""}`} onClick={() => setTab("avail")}>Availability</button>
          <button className={`admin-tab ${tab === "bookings" ? "on" : ""}`} onClick={() => setTab("bookings")}>Bookings ({bookings.length})</button>
        </div>

        {tab === "sessions" && <SessionTypesAdmin sessionTypes={sessionTypes} setSessionTypes={setSessionTypes} />}
        {tab === "avail" && <AvailabilityAdmin availability={availability} setAvailability={setAvailability} />}
        {tab === "bookings" && <BookingsAdmin bookings={bookings} />}
      </div>
    </section>
  );
}

const PALETTE = ["#d4422f", "#e08a1e", "#2f7dd4", "#1e9e6a", "#9b59b6", "#e0a92e"];

function SessionTypesAdmin({ sessionTypes, setSessionTypes }) {
  const [editing, setEditing] = useState(null);
  const blank = { name: "", duration: 60, price: 50, capacity: 1, blurb: "", blurbPerPerson: false, color: PALETTE[0], isPartner: false };

  function save(form) {
    if (form.id) setSessionTypes((s) => s.map((t) => (t.id === form.id ? form : t)));
    else setSessionTypes((s) => [...s, { ...form, id: "st_" + Date.now() }]);
    setEditing(null);
  }
  function remove(id) { setSessionTypes((s) => s.filter((t) => t.id !== id)); }

  return (
    <div className="admin-section">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="mini add" onClick={() => setEditing({ ...blank })}>+ New Session Type</button>
      </div>
      {sessionTypes.map((t) => (
        <div className="row-item" key={t.id}>
          <div className="ri-main">
            <div className="ri-dot" style={{ background: t.color }} />
            <div>
              <div className="ri-name">{t.name}{t.isPartner && <span className="pill partner">Partner</span>}</div>
              <div className="ri-sub">${t.price}{t.blurbPerPerson ? "/wrestler" : ""} · {fmtDuration(t.duration)} · {t.capacity === 1 ? "Individual" : `Up to ${t.capacity}`}</div>
            </div>
          </div>
          <div className="ri-actions">
            <button className="mini" onClick={() => setEditing({ ...t })}>Edit</button>
            <button className="mini danger" onClick={() => remove(t.id)}>Delete</button>
          </div>
        </div>
      ))}
      {editing && <SessionTypeEditor initial={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function SessionTypeEditor({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial);
  const set = (k, v) => setF({ ...f, [k]: v });
  const valid = f.name.trim() && f.price >= 0 && f.duration > 0 && f.capacity > 0;
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head"><h3>{f.id ? "Edit" : "New"} Session</h3><button className="x" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="field">
            <label>Session Name</label>
            <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Takedown Intensive" />
          </div>
          <div className="field-row">
            <div className="field"><label>Price ($)</label><input type="number" value={f.price} onChange={(e) => set("price", +e.target.value)} /></div>
            <div className="field"><label>Duration (min)</label><input type="number" step="15" value={f.duration} onChange={(e) => set("duration", +e.target.value)} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Max Wrestlers</label><input type="number" value={f.capacity} onChange={(e) => set("capacity", +e.target.value)} /></div>
            <div className="field">
              <label>Price Per Wrestler?</label>
              <select value={f.blurbPerPerson ? "yes" : "no"} onChange={(e) => set("blurbPerPerson", e.target.value === "yes")}>
                <option value="no">No — flat price</option>
                <option value="yes">Yes — per wrestler</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Partner Session?</label>
            <select value={f.isPartner ? "yes" : "no"} onChange={(e) => set("isPartner", e.target.value === "yes")}>
              <option value="no">No</option>
              <option value="yes">Yes — wrestler can bring/request a partner</option>
            </select>
            <div className="field-hint">Adds a step for the wrestler to choose a partner or have Coach pair one.</div>
          </div>
          <div className="field">
            <label>Description</label>
            <textarea rows={3} value={f.blurb} onChange={(e) => set("blurb", e.target.value)} placeholder="What happens in this session and who it's for." />
          </div>
          <div className="field">
            <label>Accent Color</label>
            <div style={{ display: "flex", gap: 10 }}>
              {PALETTE.map((c) => (
                <div key={c} onClick={() => set("color", c)} style={{ width: 32, height: 32, borderRadius: 8, background: c, cursor: "pointer", border: f.color === c ? "3px solid #fff" : "3px solid transparent" }} />
              ))}
            </div>
          </div>
          <button className="btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={!valid} onClick={() => valid && onSave(f)}>
            {f.id ? "Save Changes" : "Create Session Type"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AvailabilityAdmin({ availability, setAvailability }) {
  const [adding, setAdding] = useState(false);
  const byDate = availability.reduce((acc, s) => {
    (acc[s.dateISO] = acc[s.dateISO] || []).push(s);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort();

  function removeSlot(id) { setAvailability((a) => a.filter((s) => s.id !== id)); }
  function addSlot(dateISO, time) {
    setAvailability((a) => [...a, { id: "slot_" + Date.now(), dateISO, time, booked: false }]);
    setAdding(false);
  }

  return (
    <div className="admin-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 13, color: "var(--fog)" }}>
          Default schedule: <b style={{ color: "var(--paper)" }}>Mon–Sun, 7 AM – 5 PM ET</b> · Lunch 1–3 PM blocked off.
        </div>
        <button className="mini add" onClick={() => setAdding(true)}>+ Open a New Slot</button>
      </div>
      {dates.length === 0 ? (
        <div className="empty">No availability yet. Open some slots so wrestlers can book.</div>
      ) : (
        dates.map((d) => (
          <div className="admin-avail-day" key={d}>
            <div className="aad-head"><div className="d">{fmtDate(d)}</div></div>
            <div>
              {byDate[d].map((s) => (
                <span key={s.id} className={`admin-slot ${s.booked ? "booked" : ""}`}>
                  {s.time}{s.booked ? " · booked" : ""}
                  {!s.booked && <button onClick={() => removeSlot(s.id)} title="Remove slot">×</button>}
                </span>
              ))}
            </div>
          </div>
        ))
      )}
      {adding && <AddSlotModal onAdd={addSlot} onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddSlotModal({ onAdd, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("4:00 PM");
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-head"><h3>Open a Slot</h3><button className="x" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="field"><label>Date</label><input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field">
            <label>Time</label>
            <select value={time} onChange={(e) => setTime(e.target.value)}>
              {DEFAULT_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="field-hint">Schedule respects your 1–3 PM lunch break.</div>
          </div>
          <button className="btn-primary" style={{ width: "100%" }} disabled={!date || !time.trim()} onClick={() => onAdd(date, time.trim())}>Open Slot</button>
        </div>
      </div>
    </div>
  );
}

function BookingsAdmin({ bookings }) {
  if (bookings.length === 0) {
    return <div className="empty">No bookings yet. When wrestlers book, they'll show up here with their contact info and payment status.</div>;
  }
  const payLabel = (p) => p === "venmo" ? "Venmo" : p === "cashapp" ? "Cash App" : p === "cash" ? "Cash at session" : p === "card" ? "Card" : p === "paypal" ? "PayPal" : p;
  const payClass = (p) => p === "venmo" ? "venmo" : p === "cashapp" ? "cashapp" : p === "cash" ? "cash" : "paid";
  return (
    <div className="admin-section">
      {bookings.map((b) => (
        <div className="bk-card" key={b.id}>
          <div className="bk-top">
            <span className="bk-name">{b.wrestler}{b.isPartner && <span className="pill partner">Partner Session</span>}</span>
            <span className={`pill ${payClass(b.payment)}`}>{payLabel(b.payment)}</span>
          </div>
          <div style={{ color: "var(--fog)", fontSize: 14 }}>
            {b.type} · {fmtDate(b.dateISO)} · {b.time} · ${b.price}
          </div>
          <div style={{ color: "var(--fog2)", fontSize: 13, marginTop: 6 }}>
            {b.contact}{b.email ? ` · ${b.email}` : ""}
            {b.isPartner && (
              <><br /><span style={{ color: "#5ba0ea", fontWeight: 700 }}>
                Partner: {b.partnerChoice === "own" ? `${b.partnerName}${b.partnerEmail ? ` (${b.partnerEmail})` : ""}` : "Coach to pair"}
              </span></>
            )}
            {b.notes ? <><br /><span style={{ fontStyle: "italic" }}>"{b.notes}"</span></> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// FOOTER
// ============================================================================
function Footer({ onCoachLogin, isAdmin }) {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div>
          <div className="brand-name" style={{ fontSize: 18 }}>Mat<em style={{ color: "var(--red)", fontStyle: "normal" }}>IQ</em></div>
          <div className="muted" style={{ marginTop: 4 }}>Win the scrambles · Coach Noonan</div>
        </div>
        <button className="coach-login" onClick={onCoachLogin}>{isAdmin ? "Back to Coach Mode" : "Coach Login"}</button>
      </div>
    </footer>
  );
}
