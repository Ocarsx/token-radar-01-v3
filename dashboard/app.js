// Token Radar dashboard — renders the board from data.js and regenerates
// each protocol's farm plan from the same tables the server used, so the
// page and board.json never disagree.
var D = TOKEN_RADAR_DATA;
var ROWS = D.rows.map(function (a) {
  return { slug: a[0], name: a[1], category: a[2], chain: a[3], tvl: a[4],
    chg: a[5], implied: a[6], rank: a[7], wl: a[8] === 1,
    ratio: a[9], growth: a[10], age: a[11] };
});
var BY_SLUG = {};
ROWS.forEach(function (r) { BY_SLUG[r.slug] = r; });

function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function fmtShort(n) {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + String(n);
}
function fillFrame(frame, vars) {
  var out = frame;
  for (var k in vars) out = out.split("{" + k + "}").join(vars[k]);
  return out;
}
function farmSteps(r, total) {
  var gas = D.gas[r.chain] || D.gas_fallback;
  var pb = D.playbooks[r.category] || D.generic_playbook;
  var vars = { name: r.name, chain: r.chain, gas: gas[0], fund: gas[1],
    rank: String(r.rank), total: String(total), implied: "$" + fmt(r.implied),
    action: pb[0], check: pb[1], cadence: pb[2] };
  return D.step_frames.map(function (f) { return fillFrame(fillFrame(f, vars), vars); });
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

var state = { q: "", cat: "", wl: false, sort: "rank", detail: null };

function filtered() {
  var q = state.q.toLowerCase();
  var list = ROWS.filter(function (r) {
    if (state.wl && !r.wl) return false;
    if (state.cat && r.category !== state.cat) return false;
    if (q && (r.name + " " + r.slug + " " + r.category).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  var k = state.sort;
  list.sort(function (a, b) {
    if (k === "implied") return b.implied - a.implied;
    if (k === "tvl") return b.tvl - a.tvl;
    if (k === "chg") return (b.chg || 0) - (a.chg || 0);
    if (k === "name") return a.name < b.name ? -1 : 1;
    return a.rank - b.rank;
  });
  return list;
}

function renderBoard() {
  var list = filtered();
  var tb = document.getElementById("rows");
  tb.innerHTML = list.map(function (r) {
    var chg = r.chg === null ? "—" : (r.chg > 0 ? "+" : "") + r.chg.toFixed(1) + "%";
    var cls = r.chg === null ? "" : r.chg < 0 ? "neg" : "pos";
    return "<tr data-slug=\"" + esc(r.slug) + "\"><td class=\"num\">" + r.rank + "</td>" +
      "<td><b>" + esc(r.name) + "</b>" + (r.wl ? "<span class=\"wl\">WATCHLIST</span>" : "") + "</td>" +
      "<td>" + esc(r.category) + "</td><td>" + esc(r.chain) + "</td>" +
      "<td class=\"num\">" + fmtShort(r.tvl) + "</td>" +
      "<td class=\"num " + cls + "\">" + chg + "</td>" +
      "<td class=\"num\"><b>$" + fmt(r.implied) + "</b></td>" +
      "<td><button data-copy=\"" + esc(r.slug) + "\">Copy farm plan</button></td></tr>";
  }).join("");
  document.getElementById("count").textContent =
    list.length + " of " + ROWS.length + " protocols" +
    (state.wl ? " (watchlist only)" : "") + (state.cat ? " in " + state.cat : "");
  tb.querySelectorAll("tr").forEach(function (tr) {
    tr.addEventListener("click", function (ev) {
      if (ev.target.tagName === "BUTTON") return;
      showDetail(tr.getAttribute("data-slug"));
    });
  });
  tb.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      copyPlan(btn.getAttribute("data-copy"), btn);
    });
  });
}

function renderChart() {
  var sums = {};
  ROWS.forEach(function (r) { sums[r.category] = (sums[r.category] || 0) + r.implied; });
  var top = Object.keys(sums).map(function (c) { return [c, sums[c]]; })
    .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
  var max = top.length ? top[0][1] : 1;
  var W = 640, H = 26 + top.length * 26;
  var svg = "<svg viewBox=\"0 0 " + W + " " + H + "\" role=\"img\" aria-label=\"Implied value by category\">";
  top.forEach(function (t, i) {
    var y = 14 + i * 26, w = Math.max(2, Math.round((t[1] / max) * 380));
    svg += "<text x=\"0\" y=\"" + (y + 4) + "\" font-size=\"12\">" + esc(t[0]) + "</text>" +
      "<rect x=\"180\" y=\"" + y + "\" width=\"" + w + "\" height=\"14\" fill=\"#0e2a3f\"/>" +
      "<text x=\"" + (186 + w) + "\" y=\"" + (y + 11) + "\" font-size=\"12\">" + fmtShort(t[1]) + "</text>";
  });
  document.getElementById("chart").innerHTML = svg + "</svg>";
}

function renderComparables() {
  document.getElementById("comp-rows").innerHTML = D.comparables.map(function (c) {
    return "<tr><td><b>" + esc(c[0]) + "</b></td><td>" + esc(c[1]) + "</td>" +
      "<td class=\"num\">" + fmtShort(c[2]) + "</td><td class=\"num\">" + fmtShort(c[3]) + "</td>" +
      "<td class=\"num\">" + (c[3] / c[2]).toFixed(3) + "</td></tr>";
  }).join("");
}

function showDetail(slug) {
  var r = BY_SLUG[slug];
  if (!r) return;
  state.detail = slug;
  var steps = farmSteps(r, ROWS.length);
  document.getElementById("detail-title").textContent =
    r.name + " — #" + r.rank + " of " + ROWS.length;
  document.getElementById("detail").innerHTML =
    "<div class=\"factors\">" +
    "<div><b>$" + fmt(r.implied) + "</b><span>Implied value</span></div>" +
    "<div><b>" + fmtShort(r.tvl) + "</b><span>TVL on " + esc(r.chain) + "</span></div>" +
    "<div><b>" + r.ratio.toFixed(3) + "</b><span>Category ratio (mcap/TVL)</span></div>" +
    "<div><b>" + r.growth.toFixed(3) + "</b><span>Growth factor (7d " + (r.chg === null ? "n/a" : r.chg.toFixed(1) + "%") + ")</span></div>" +
    "<div><b>" + r.age.toFixed(3) + "</b><span>Age factor</span></div>" +
    "<div><b>" + esc(r.category) + "</b><span>Category" + (r.wl ? " · on the watchlist" : "") + "</span></div>" +
    "</div>" +
    "<ol>" + steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" +
    "<button id=\"copy-detail\">Copy farm plan</button>";
  document.getElementById("detail-wrap").hidden = false;
  document.getElementById("copy-detail").addEventListener("click", function (ev) {
    copyPlan(slug, ev.target);
  });
  if (location.hash !== "#protocol=" + slug) history.replaceState(null, "", "#protocol=" + slug);
  document.getElementById("detail-wrap").scrollIntoView();
}

function copyPlan(slug, btn) {
  var r = BY_SLUG[slug];
  if (!r) return;
  var text = r.name + " — farm plan (Token Radar, rank #" + r.rank + ", implied $" + fmt(r.implied) + ")\n" +
    farmSteps(r, ROWS.length).map(function (s, i) { return (i + 1) + ". " + s; }).join("\n");
  function done() { btn.textContent = "Copied!"; setTimeout(function () { btn.textContent = "Copy farm plan"; }, 1500); }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
  } else { fallbackCopy(text); done(); }
}
function fallbackCopy(text) {
  var ta = document.createElement("textarea");
  ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); } catch (e) { /* clipboard unavailable */ }
  document.body.removeChild(ta);
}

function readHash() {
  var h = location.hash.slice(1);
  var parts = h.split("&");
  parts.forEach(function (p) {
    var kv = p.split("=");
    var k = decodeURIComponent(kv[0] || ""), v = decodeURIComponent(kv[1] || "");
    if (k === "protocol" && BY_SLUG[v]) state.detail = v;
    if (k === "q") { state.q = v; document.getElementById("q").value = v; }
    if (k === "category") { state.cat = v; document.getElementById("cat").value = v; }
  });
}

function init() {
  var top = ROWS[0];
  document.getElementById("stats").textContent =
    ROWS.length + " pre-token protocols · " + ROWS.filter(function (r) { return r.wl; }).length +
    " on the watchlist · top implied value $" + fmt(top.implied) + " (" + top.name + ")";
  document.getElementById("asof").textContent = D.as_of;
  var cats = [];
  ROWS.forEach(function (r) { if (cats.indexOf(r.category) < 0) cats.push(r.category); });
  cats.sort();
  document.getElementById("cat").innerHTML = "<option value=\"\">All categories</option>" +
    cats.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("");
  renderChart();
  renderComparables();
  readHash();
  renderBoard();
  if (state.detail) showDetail(state.detail);
  document.getElementById("q").addEventListener("input", function (ev) {
    state.q = ev.target.value; renderBoard();
  });
  document.getElementById("cat").addEventListener("change", function (ev) {
    state.cat = ev.target.value; renderBoard();
  });
  document.getElementById("wl").addEventListener("change", function (ev) {
    state.wl = ev.target.checked; renderBoard();
  });
  document.getElementById("sort").addEventListener("change", function (ev) {
    state.sort = ev.target.value; renderBoard();
  });
  document.querySelectorAll("#board th[data-k]").forEach(function (th) {
    th.addEventListener("click", function () {
      var k = th.getAttribute("data-k");
      if (["rank", "name", "tvl", "chg", "implied"].indexOf(k) < 0) return;
      state.sort = k;
      document.getElementById("sort").value = state.sort;
      renderBoard();
    });
  });
  window.addEventListener("hashchange", function () {
    readHash(); renderBoard();
    if (state.detail) showDetail(state.detail);
  });
}

if (typeof document !== "undefined") init();
if (typeof module !== "undefined" && module.exports) {
  module.exports = { farmSteps: farmSteps, fmt: fmt, fmtShort: fmtShort, fillFrame: fillFrame };
}
