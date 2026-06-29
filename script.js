// TrafficJam smart dashboard script

let rows = [];
let headers = [];
let filteredRows = [];

const $ = (id) => document.getElementById(id);

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function formatNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString() : "—";
}

function safeDate(value) {
  if (!value) return null;
  const d = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeRows(data) {
  return (data || [])
    .filter((r) => r && Object.keys(r).length)
    .map((r) => {
      const date = safeDate(r.DateTime);
      return {
        ...r,
        DateTime: String(r.DateTime ?? ""),
        Junction: String(r.Junction ?? "").trim(),
        Vehicles: Number(r.Vehicles ?? 0),
        ID: String(r.ID ?? ""),
        _date: date,
        _hour: date ? date.getHours() : null
      };
    })
    .filter((r) => r.Junction && Number.isFinite(r.Vehicles));
}

function parseCSVText(text) {
  const lines = text.trim().split(/\r?\n/);
  const cols = lines.shift().split(",").map((h) => h.trim());
  return lines.map((line) => {
    const parts = line.split(",");
    const row = {};
    cols.forEach((h, i) => row[h] = parts[i]);
    return row;
  });
}

function loadTrafficData() {
  const statusIds = ["info", "homeDataStatus", "aiDataStatus"];
  statusIds.forEach((id) => setText(id, "Loading traffic.csv..."));

  const handleData = (data) => {
    rows = normalizeRows(data);
    headers = ["DateTime", "Junction", "Vehicles", "ID"];
    filteredRows = rows.slice();

    if (!rows.length) {
      statusIds.forEach((id) => setText(id, "No traffic records found."));
      return;
    }

    statusIds.forEach((id) => setText(id, `Loaded ${rows.length.toLocaleString()} traffic records.`));

    populateJunctionFilters();
    populateHourSelect();
    updateAllViews();
  };

  const handleError = () => {
    statusIds.forEach((id) => setText(id, "Could not auto-load traffic.csv. Use Live Server or upload the CSV."));
  };

  if (window.Papa) {
    Papa.parse("traffic.csv", {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => handleData(results.data),
      error: handleError
    });
  } else {
    fetch("traffic.csv")
      .then((res) => res.ok ? res.text() : Promise.reject())
      .then((text) => handleData(parseCSVText(text)))
      .catch(handleError);
  }
}

function populateJunctionFilters() {
  const junctions = [...new Set(rows.map((r) => r.Junction))].sort((a, b) => Number(a) - Number(b));
  ["junctionFilter", "aiJunction"].forEach((id) => {
    const select = $(id);
    if (!select) return;
    const current = select.value || "all";
    select.innerHTML = `<option value="all">All Junctions</option>` +
      junctions.map((j) => `<option value="${j}">Junction ${j}</option>`).join("");
    select.value = junctions.includes(current) ? current : "all";
  });
}

function populateHourSelect() {
  const select = $("aiHour");
  if (!select) return;
  select.innerHTML = Array.from({ length: 24 }, (_, h) => {
    const label = `${String(h).padStart(2, "0")}:00`;
    return `<option value="${h}">${label}</option>`;
  }).join("");
  select.value = "8";
}

function getTimeWindow(hour) {
  if (hour >= 6 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 16) return "afternoon";
  if (hour >= 17 && hour <= 21) return "evening";
  return "night";
}

function applyFilters() {
  const search = ($("search")?.value || "").toLowerCase().trim();
  const junction = $("junctionFilter")?.value || "all";
  const time = $("timeFilter")?.value || "all";
  const sort = $("sortBy")?.value || "date-desc";

  filteredRows = rows.filter((r) => {
    const matchesSearch = !search || Object.values({
      DateTime: r.DateTime,
      Junction: r.Junction,
      Vehicles: r.Vehicles,
      ID: r.ID
    }).some((v) => String(v).toLowerCase().includes(search));

    const matchesJunction = junction === "all" || r.Junction === junction;
    const matchesTime = time === "all" || getTimeWindow(r._hour) === time;
    return matchesSearch && matchesJunction && matchesTime;
  });

  filteredRows.sort((a, b) => {
    if (sort === "vehicles-desc") return b.Vehicles - a.Vehicles;
    if (sort === "vehicles-asc") return a.Vehicles - b.Vehicles;
    if (sort === "date-asc") return (a._date?.getTime() || 0) - (b._date?.getTime() || 0);
    return (b._date?.getTime() || 0) - (a._date?.getTime() || 0);
  });

  updateAllViews();
}

function summarize(data) {
  if (!data.length) {
    return {
      total: 0,
      junctions: 0,
      peak: 0,
      avg: 0,
      range: "—",
      busiestJunction: "—",
      busiestHour: "—",
      bestHour: "—"
    };
  }

  const junctions = [...new Set(data.map((r) => r.Junction))];
  const vehicles = data.map((r) => r.Vehicles);
  const peak = Math.max(...vehicles);
  const avg = vehicles.reduce((a, b) => a + b, 0) / vehicles.length;

  const dates = data.map((r) => r._date).filter(Boolean).map((d) => d.getTime());
  const range = dates.length
    ? `${new Date(Math.min(...dates)).toISOString().slice(0, 10)} → ${new Date(Math.max(...dates)).toISOString().slice(0, 10)}`
    : "—";

  const byJunction = groupAverage(data, "Junction");
  const byHour = groupAverage(data, "_hour");
  const busiestJunction = byJunction.length ? `Junction ${byJunction[0].label}` : "—";
  const busiestHour = byHour.length ? `${String(byHour[0].label).padStart(2, "0")}:00` : "—";
  const bestHour = byHour.length ? `${String(byHour[byHour.length - 1].label).padStart(2, "0")}:00` : "—";

  return {
    total: data.length,
    junctions: junctions.length,
    peak,
    avg,
    range,
    busiestJunction,
    busiestHour,
    bestHour
  };
}

function groupAverage(data, key) {
  const map = new Map();

  data.forEach((r) => {
    const label = r[key];
    if (label === null || label === undefined || label === "") return;
    if (!map.has(label)) map.set(label, { total: 0, count: 0 });
    const item = map.get(label);
    item.total += r.Vehicles;
    item.count += 1;
  });

  return [...map.entries()]
    .map(([label, item]) => ({ label, value: item.total / item.count, count: item.count }))
    .sort((a, b) => b.value - a.value);
}

function updateStats(data) {
  const summary = summarize(data);
  setText("statRows", formatNumber(summary.total));
  setText("statJunctions", formatNumber(summary.junctions));
  setText("statPeak", formatNumber(summary.peak));
  setText("statAverage", Math.round(summary.avg).toLocaleString());
  setText("statRange", summary.range);
  setText("statBusiest", summary.busiestJunction);
  setText("statBusiestHour", summary.busiestHour);
  setText("statFiltered", formatNumber(data.length));

  setText("homeRows", formatNumber(rows.length));
  setText("homeJunction", summarize(rows).busiestJunction);
  setText("homePeak", formatNumber(summarize(rows).peak));
  setText("homeBestHour", summarize(rows).bestHour);
}

function updateInsights(data) {
  const byHour = groupAverage(data, "_hour");
  const byJunction = groupAverage(data, "Junction");

  if (!data.length || !byHour.length) {
    setText("highestRisk", "No data");
    setText("bestWindow", "No data");
    setText("smartTip", "Load traffic data to generate recommendations.");
    return;
  }

  const worst = byHour[0];
  const best = byHour[byHour.length - 1];
  const busiestJ = byJunction[0];

  setText("highestRisk", `${String(worst.label).padStart(2, "0")}:00 • Avg ${Math.round(worst.value)} vehicles`);
  setText("bestWindow", `${String(best.label).padStart(2, "0")}:00 • Avg ${Math.round(best.value)} vehicles`);
  setText(
    "smartTip",
    `Prioritize signal optimization near Junction ${busiestJ.label}; it has the highest average flow in this view.`
  );
}

function renderTable(data) {
  const tableEl = $("table");
  if (!tableEl) return;

  const limit = Number($("limitRows")?.value || 50);
  const page = data.slice(0, limit);

  if (!page.length) {
    tableEl.innerHTML = `<tr><td>No matching traffic records.</td></tr>`;
    return;
  }

  const headerHtml = `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
  const bodyHtml = page.map((row) => {
    return `<tr>${headers.map((h) => `<td>${row[h] ?? ""}</td>`).join("")}</tr>`;
  }).join("");

  tableEl.innerHTML = headerHtml + bodyHtml;

  const info = $("info");
  if (info) {
    info.textContent = `Loaded ${rows.length.toLocaleString()} rows. Found ${data.length.toLocaleString()}. Showing first ${page.length}.`;
  }
}

function drawBarChart(canvasId, series, options = {}) {
  const canvas = $(canvasId);
  if (!canvas || !series?.length) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = { left: 48, right: 22, top: 28, bottom: 46 };

  ctx.clearRect(0, 0, width, height);

  const values = series.map((d) => d.value);
  const max = Math.max(...values, 1);
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const barW = innerW / series.length * 0.62;
  const gap = innerW / series.length;

  // Grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (innerH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  series.forEach((d, i) => {
    const x = padding.left + i * gap + (gap - barW) / 2;
    const barH = (d.value / max) * innerH;
    const y = padding.top + innerH - barH;

    const gradient = ctx.createLinearGradient(0, y, 0, height);
    gradient.addColorStop(0, options.colorTop || "#2dff9a");
    gradient.addColorStop(1, options.colorBottom || "#00b7ff");

    ctx.fillStyle = gradient;
    roundRect(ctx, x, y, barW, barH, 8);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.76)";
    ctx.font = "12px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(d.label).padStart(2, "0"), x + barW / 2, height - 18);
  });

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "12px Poppins, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(options.label || "Average vehicles", padding.left, 18);
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function updateCharts(data) {
  const junctionSeries = groupAverage(data, "Junction").slice(0, 8);
  const hourSeries = groupAverage(data, "_hour")
    .sort((a, b) => Number(a.label) - Number(b.label));

  drawBarChart("junctionChart", junctionSeries, { label: "Avg vehicles by junction" });
  drawBarChart("hourChart", hourSeries, { label: "Avg vehicles by hour", colorTop: "#ffd84d", colorBottom: "#ff4d6d" });

  const homeSeries = groupAverage(rows, "Junction").slice(0, 8);
  drawBarChart("homeJunctionChart", homeSeries, { label: "Busiest junctions" });
  drawBarChart("aiHourChart", hourSeries, { label: "Best / worst hours" });
}

function updateAllViews() {
  const dataForPage = $("table") || $("junctionChart") ? filteredRows : rows;
  updateStats(dataForPage);
  updateInsights(dataForPage);
  renderTable(dataForPage);
  updateCharts(dataForPage);
  updateAIText();
}

function riskCategory(score) {
  if (score >= 85) return ["Severe congestion", "danger"];
  if (score >= 65) return ["High congestion", "warning"];
  if (score >= 40) return ["Moderate congestion", "medium"];
  return ["Low congestion", "success"];
}

function calculateAIRisk() {
  const junction = $("aiJunction")?.value || "all";
  const hour = Number($("aiHour")?.value || 8);
  const demand = $("aiDemand")?.value || "normal";
  const weather = $("aiWeather")?.value || "clear";
  const incident = $("aiIncident")?.value || "none";

  const baseData = rows.filter((r) => (junction === "all" || r.Junction === junction) && r._hour === hour);
  const fallbackData = rows.filter((r) => junction === "all" || r.Junction === junction);
  const selected = baseData.length ? baseData : fallbackData;

  const avg = selected.length
    ? selected.reduce((sum, r) => sum + r.Vehicles, 0) / selected.length
    : 25;

  const maxAvg = Math.max(...groupAverage(rows, "_hour").map((d) => d.value), 50);
  let score = (avg / maxAvg) * 70;

  const demandBoost = { normal: 0, school: 10, event: 18, emergency: 8 };
  const weatherBoost = { clear: 0, rain: 10, fog: 14 };
  const incidentBoost = { none: 0, minor: 12, major: 25 };

  score += demandBoost[demand] + weatherBoost[weather] + incidentBoost[incident];
  score = Math.max(5, Math.min(99, Math.round(score)));

  return { score, avg, junction, hour, demand, weather, incident };
}

function generateRecommendations(result) {
  const actions = [];
  const hourLabel = `${String(result.hour).padStart(2, "0")}:00`;

  if (result.score >= 85) {
    actions.push("Activate emergency signal timing and prioritize clearing the selected junction.");
    actions.push("Redirect non-essential traffic to alternative routes before the peak window.");
    actions.push("Send driver alerts at least 30 minutes before the expected congestion period.");
  } else if (result.score >= 65) {
    actions.push("Increase green-light duration for the highest-flow direction.");
    actions.push("Recommend staggered departures and avoid unnecessary trips around " + hourLabel + ".");
    actions.push("Monitor the junction closely because traffic is above the normal average.");
  } else if (result.score >= 40) {
    actions.push("Keep normal signal timing but prepare a backup diversion plan.");
    actions.push("Use dashboard monitoring to detect sudden increases in vehicle count.");
    actions.push("Encourage drivers to use the lowest-traffic hour shown in the dataset panel.");
  } else {
    actions.push("Traffic is currently suitable for normal routing.");
    actions.push("This is a good time window for maintenance or planned road work.");
    actions.push("Keep monitoring live changes, especially if weather or incidents change.");
  }

  if (result.weather !== "clear") actions.push("Add extra safety buffer because weather can reduce road capacity.");
  if (result.incident !== "none") actions.push("Assign response resources near the affected area until flow returns to normal.");

  return actions;
}

function updateAIText(event) {
  if (event) event.preventDefault();
  if (!$("riskScore")) return;

  const result = calculateAIRisk();
  const [title, className] = riskCategory(result.score);

  setText("riskScore", `${result.score}%`);
  setText("riskTitle", title);
  setText("riskSummary", `At ${String(result.hour).padStart(2, "0")}:00, the selected conditions show an estimated average of ${Math.round(result.avg)} vehicles based on the dataset.`);

  const ring = $("riskRing");
  if (ring) {
    ring.className = `risk-ring ${className}`;
    ring.style.setProperty("--risk", `${result.score * 3.6}deg`);
  }

  const recList = $("recommendations");
  if (recList) {
    recList.innerHTML = generateRecommendations(result).map((item) => `<li>${item}</li>`).join("");
  }

  const junction = $("aiJunction")?.value || "all";
  const data = rows.filter((r) => junction === "all" || r.Junction === junction);
  const hours = groupAverage(data, "_hour").sort((a, b) => a.value - b.value).slice(0, 3);

  if (hours.length) {
    setText(
      "bestHoursText",
      `Lowest average traffic windows: ${hours.map((h) => `${String(h.label).padStart(2, "0")}:00`).join(", ")}.`
    );
  }
}

function downloadFilteredCSV() {
  if (!filteredRows.length) return;

  const csv = [
    headers.join(","),
    ...filteredRows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replaceAll('"', '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "filtered_traffic_data.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function attachEvents() {
  ["search", "junctionFilter", "timeFilter", "sortBy", "limitRows"].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("input", applyFilters);
    if (el) el.addEventListener("change", applyFilters);
  });

  const resetBtn = $("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      ["search"].forEach((id) => { if ($(id)) $(id).value = ""; });
      ["junctionFilter", "timeFilter"].forEach((id) => { if ($(id)) $(id).value = "all"; });
      if ($("sortBy")) $("sortBy").value = "date-desc";
      if ($("limitRows")) $("limitRows").value = "50";
      applyFilters();
    });
  }

  const downloadBtn = $("downloadFiltered");
  if (downloadBtn) downloadBtn.addEventListener("click", downloadFilteredCSV);

  const fileInput = $("csvFile");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        const parsed = window.Papa
          ? Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true }).data
          : parseCSVText(text);
        rows = normalizeRows(parsed);
        headers = ["DateTime", "Junction", "Vehicles", "ID"];
        filteredRows = rows.slice();
        setText("info", `Uploaded ${rows.length.toLocaleString()} traffic records.`);
        populateJunctionFilters();
        updateAllViews();
      };
      reader.readAsText(file);
    });
  }

  ["aiJunction", "aiHour", "aiDemand", "aiWeather", "aiIncident"].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("change", updateAIText);
  });

  const form = $("aiForm");
  if (form) form.addEventListener("submit", updateAIText);
}

document.addEventListener("DOMContentLoaded", () => {
  attachEvents();
  loadTrafficData();
});
