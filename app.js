(() => {
  "use strict";
  const TZ = "Europe/London";
  const PRAYERS = [
    { key: "fajr", en: "Fajr", ar: "الفجر" },
    { key: "sunrise", en: "Sunrise", ar: "الشروق", notPrayer: true },
    { key: "dhuhr", en: "Dhuhr", ar: "الظهر" },
    { key: "asr", en: "Asr", ar: "العصر" },
    { key: "maghrib", en: "Maghrib", ar: "المغرب" },
    { key: "isha", en: "Isha", ar: "العشاء" },
  ];
  const DAY_MS = 864e5;
  const $ = (s, el = document) => el.querySelector(s);

  // ---------- time helpers (all times are minutes after midnight, London) ----------
  // Sheet times have no am/pm: Fajr and Sunrise are morning, Dhuhr is around noon, the rest are afternoon/evening.
  function parseSheet(str, idx) {
    const [h, m] = str.split(/[.:]/).map(Number);
    const pm = idx === 2 ? h < 11 : idx > 2 && h < 12;
    return (pm ? h + 12 : h) * 60 + m;
  }
  const fmt = (min) => {
    const h = Math.floor(min / 60), m = String(min % 60).padStart(2, "0");
    return `${((h + 11) % 12) + 1}:${m}`;
  };
  const ampm = (min) => (min < 720 ? "am" : "pm");

  function londonParts(date) {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
        .formatToParts(date).map((x) => [x.type, x.value]));
    return { y: +p.year, m: +p.month, d: +p.day, min: +p.hour * 60 + +p.minute, sec: +p.second };
  }

  // ?date=2026-09-18&time=16:40 pins the clock (for checking the page against a printed sheet).
  function now() {
    const q = new URLSearchParams(location.search);
    const real = londonParts(new Date());
    const date = q.get("date"), time = q.get("time");
    if (!date) return real;
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = (time || "12:00").split(":").map(Number);
    return { y, m, d, min: hh * 60 + mm, sec: 0 };
  }

  const ymKey = (y, m) => `${y}-${String(m).padStart(2, "0")}`;
  const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weekday = (y, m, d, style = "short") => new Intl.DateTimeFormat("en-GB", { weekday: style, timeZone: "UTC" }).format(Date.UTC(y, m - 1, d));
  function addDays({ y, m, d }, n) {
    const t = new Date(Date.UTC(y, m - 1, d) + n * DAY_MS);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }

  // ---------- timetable ----------
  const parsedMonths = {};
  function sheetMonth(y, m) {
    const key = ymKey(y, m), raw = (window.TIMETABLES || {})[key];
    if (!raw) return null;
    if (parsedMonths[key]) return parsedMonths[key];
    const rows = raw.days.trim().split("\n").map((l) => l.trim().split(/\s+/).map(parseSheet));
    const changes = Object.entries(raw.jamaat || {}).map(([d, v]) => [+d, v.trim().split(/\s+/)]).sort((a, b) => a[0] - b[0]);
    const days = rows.map((start, i) => {
      const day = i + 1;
      const j = changes.filter(([d]) => d <= day).pop();
      if (!j) return { start, jamaat: null };
      const [f, dh, a, is] = j[1];
      return { start, jamaat: [parseSheet(f, 0), null, parseSheet(dh, 2), parseSheet(a, 3), start[4], parseSheet(is, 5)] };
    });
    return (parsedMonths[key] = { pdf: raw.pdf, days });
  }

  function calcDay(y, m, d) {
    const A = window.adhan, c = window.MASJID.calc;
    if (!A) return null;
    const p = A.CalculationMethod.Other();
    p.fajrAngle = c.fajrAngle;
    p.ishaInterval = c.ishaMinutesAfterMaghrib;
    p.highLatitudeRule = A.HighLatitudeRule.TwilightAngle;
    const t = new A.PrayerTimes(new A.Coordinates(c.lat, c.lng), new Date(y, m - 1, d, 12), p);
    const start = [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map((x) => londonParts(x).min);
    return { start, jamaat: null };
  }

  function getDay(y, m, d) {
    const month = sheetMonth(y, m);
    if (month && month.days[d - 1]) return { ...month.days[d - 1], source: "sheet" };
    const c = calcDay(y, m, d);
    return c && { ...c, source: "calc" };
  }

  // ---------- today card ----------
  function nextPrayer(t) {
    const today = getDay(t.y, t.m, t.d);
    for (let i = 0; i < PRAYERS.length; i++) {
      if (PRAYERS[i].notPrayer) continue;
      const at = today.jamaat ? today.jamaat[i] : today.start[i];
      if (at > t.min) return { i, at, inMin: at - t.min, tomorrow: false };
    }
    const tm = addDays(t, 1), next = getDay(tm.y, tm.m, tm.d);
    const at = next.jamaat ? next.jamaat[0] : next.start[0];
    return { i: 0, at, inMin: at + 1440 - t.min, tomorrow: true, hasJamaat: !!next.jamaat };
  }

  function renderToday() {
    const t = now();
    const day = getDay(t.y, t.m, t.d);
    if (!day) return;
    const isFri = weekday(t.y, t.m, t.d) === "Fri";
    const nx = nextPrayer(t);
    const rows = PRAYERS.map((p, i) => {
      const name = i === 2 && isFri ? "Jumu‘ah" : p.en;
      const jm = day.jamaat && day.jamaat[i] != null ? day.jamaat[i] : null;
      const jumuah = i === 2 && isFri ? parseSheet(window.MASJID.jumuah, 2) : null;
      const isNext = !nx.tomorrow && nx.i === i;
      const cls = [p.notPrayer && "is-muted", isNext && "is-next", !isNext && (jm ?? day.start[i]) <= t.min && "is-past"].filter(Boolean).join(" ");
      return `<tr class="${cls}">
        <th scope="row"><span class="pn">${name}</span><span class="ar" lang="ar">${i === 2 && isFri ? "الجمعة" : p.ar}</span></th>
        <td>${fmt(day.start[i])}<small>${ampm(day.start[i])}</small></td>
        <td>${jumuah != null ? `${fmt(jumuah)}<small>khutbah</small>` : jm != null ? `${fmt(jm)}<small>${ampm(jm)}</small>` : p.notPrayer ? "" : "<span class='dash' aria-label='not published'>–</span>"}</td>
      </tr>`;
    }).join("");
    $("#today-rows").innerHTML = rows;

    const date = new Date(Date.UTC(t.y, t.m - 1, t.d, 12));
    $("#today-date").textContent = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(date);
    try {
      $("#today-hijri").textContent = new Intl.DateTimeFormat("en-GB-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
    } catch { $("#today-hijri").textContent = ""; }

    const what = nx.tomorrow ? (nx.hasJamaat ? "Fajr jamaat tomorrow" : "Fajr tomorrow") : `${PRAYERS[nx.i].en}${day.jamaat ? " jamaat" : ""}`;
    const h = Math.floor(nx.inMin / 60), mm = nx.inMin % 60;
    $("#next-name").textContent = what;
    $("#next-in").textContent = h ? `in ${h} h ${mm} min` : `in ${mm} min`;
    $("#next-at").textContent = `${fmt(nx.at % 1440)} ${ampm(nx.at % 1440)}`;

    const src = $("#today-source");
    if (day.source === "sheet") {
      const pdf = sheetMonth(t.y, t.m).pdf;
      src.innerHTML = `From the ${monthName(t.y, t.m)} timetable.${pdf ? ` <a href="${pdf}" download>Download PDF</a>` : ""}`;
    } else {
      src.textContent = `Calculated start times. The ${monthName(t.y, t.m)} sheet with jamaat times is on the notice board.`;
    }
  }

  const monthName = (y, m) => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, 1));

  // ---------- month table ----------
  let view = null, showAll = false;
  function renderMonth() {
    const t = now();
    if (!view) view = { y: t.y, m: t.m };
    const { y, m } = view;
    const month = sheetMonth(y, m);
    $("#month-title").textContent = monthName(y, m);
    $("#month-note").textContent = month
      ? "Jamaat times are shown under each start time."
      : "This month’s sheet has not been added yet. Showing calculated start times only.";
    const pdf = $("#month-pdf");
    pdf.hidden = !(month && month.pdf);
    if (month && month.pdf) pdf.href = month.pdf;

    let html = "";
    for (let d = 1; d <= daysIn(y, m); d++) {
      const day = getDay(y, m, d);
      if (!day) continue;
      const wd = weekday(y, m, d);
      const isToday = y === t.y && m === t.m && d === t.d;
      const inWeek = y === t.y && m === t.m && d >= t.d && d < t.d + 7;
      const cells = PRAYERS.map((p, i) => {
        const jm = day.jamaat && day.jamaat[i] != null && i !== 4 ? `<small>${fmt(day.jamaat[i])}</small>` : "";
        return `<td>${fmt(day.start[i])}${jm}</td>`;
      }).join("");
      html += `<tr class="${wd === "Fri" ? "is-fri" : ""} ${isToday ? "is-today" : ""} ${inWeek ? "in-week" : ""}"${isToday ? ' aria-current="date"' : ""}><th scope="row">${d}</th><td class="wd">${wd}</td>${cells}</tr>`;
    }
    $("#month-rows").innerHTML = html;
    // Current month opens on the next seven days; other months show in full.
    const isCurrent = y === t.y && m === t.m && t.d <= daysIn(y, m) - 6;
    $(".month").classList.toggle("is-week", isCurrent && !showAll);
    const more = $("#month-more");
    more.hidden = !isCurrent;
    more.textContent = showAll ? "Show the next 7 days" : `Show all ${daysIn(y, m)} days`;
    more.setAttribute("aria-expanded", String(showAll));
  }

  function shiftMonth(n) {
    const t = new Date(Date.UTC(view.y, view.m - 1 + n, 1));
    view = { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1 };
    renderMonth();
  }

  // ---------- map (Leaflet loaded only when the section comes into view) ----------
  function initMap() {
    const el = $("#map");
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.append(css);
      const js = document.createElement("script");
      js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      js.onload = () => {
        const { lat, lng } = window.MASJID.calc;
        const map = L.map(el, { scrollWheelZoom: false }).setView([lat, lng], 16);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
        const icon = L.divIcon({ className: "pin", html: "<span></span>", iconSize: [28, 28], iconAnchor: [14, 28] });
        L.marker([lat, lng], { icon, title: "Amanah Masjid" }).addTo(map).bindPopup("<b>Amanah Masjid</b><br>29–33 Henley Street, B11 1JB");
      };
      js.onerror = () => el.classList.add("map-failed");
      document.body.append(js);
    }, { rootMargin: "300px" });
    io.observe(el);
  }

  // ---------- contact form: opens the visitor's email app, no server needed ----------
  function initForm() {
    const f = $("#contact-form");
    if (!f) return;
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!f.reportValidity()) return;
      const v = Object.fromEntries(new FormData(f));
      const body = `${v.message}\n\n${v.name}${v.phone ? `\n${v.phone}` : ""}\n${v.email}`;
      location.href = `mailto:amanahmasjid@muathtrust.org?subject=${encodeURIComponent(`${v.topic}: ${v.name}`)}&body=${encodeURIComponent(body)}`;
      $("#form-status").textContent = "Your email app should now open with the message ready to send. If it doesn’t, email amanahmasjid@muathtrust.org or call 0121 772 7370.";
    });
  }

  // ---------- boot ----------
  function tick() {
    try { renderToday(); } catch (err) { console.error("Prayer times failed", err); $("#today-source").textContent = "Prayer times could not load. Please call 0121 772 7370."; }
  }
  tick();
  setInterval(tick, 30_000);
  renderMonth();
  $("#month-prev").addEventListener("click", () => shiftMonth(-1));
  $("#month-next").addEventListener("click", () => shiftMonth(1));
  $("#month-print").addEventListener("click", () => {
    $(".month").classList.remove("is-week");
    window.print();
    renderMonth();
  });
  $("#month-more").addEventListener("click", () => { showAll = !showAll; renderMonth(); });
  initMap();
  initForm();
  $("#year").textContent = new Date().getFullYear();
})();
