/*
  Amanah Masjid prayer timetables.

  Each month: copy the printed sheet in, one line per day, in this order:
    Fajr  Sunrise  Dhuhr  Asr  Maghrib  Isha      (start times, as printed)
  and list the jamaat times from the day they change:
    Fajr  Dhuhr  Asr  Isha                         (Maghrib jamaat = Maghrib start)
  Write times exactly as on the sheet (4.37 or 4:37, no am/pm).
  Drop the PDF into site/timetables/ and set `pdf`.

  If a month is missing the site falls back to calculated start times
  (within about 2 minutes of the printed sheet) and hides jamaat times.
*/
window.MASJID = {
  jumuah: "1.30", // khutbah start
  // Calculation used when a month has not been entered (fitted to the Sept 2026 sheet).
  calc: { lat: 52.4671, lng: -1.8761, fajrAngle: 14.7, ishaMinutesAfterMaghrib: 80 },
};

window.TIMETABLES = {
  "2026-09": {
    pdf: "timetables/September-2026.pdf",
    days: `
      4.37 6.18 1.08 4.51 7.56 9.16
      4.40 6.20 1.08 4.50 7.54 9.14
      4.42 6.21 1.08 4.48 7.52 9.12
      4.44 6.23 1.07 4.47 7.49 9.09
      4.46 6.25 1.07 4.45 7.47 9.07
      4.48 6.26 1.07 4.44 7.45 9.05
      4.50 6.28 1.06 4.42 7.42 9.02
      4.52 6.30 1.06 4.41 7.40 9.00
      4.55 6.31 1.06 4.39 7.38 8.58
      4.57 6.33 1.05 4.37 7.35 8.55
      4.59 6.35 1.05 4.36 7.33 8.53
      5.01 6.36 1.05 4.34 7.31 8.51
      5.03 6.38 1.04 4.33 7.28 8.48
      5.05 6.40 1.04 4.31 7.26 8.46
      5.07 6.41 1.03 4.29 7.23 8.43
      5.09 6.43 1.03 4.28 7.21 8.41
      5.11 6.45 1.03 4.26 7.19 8.39
      5.13 6.46 1.02 4.24 7.16 8.36
      5.15 6.48 1.02 4.23 7.14 8.34
      5.16 6.50 1.02 4.21 7.12 8.32
      5.18 6.51 1.01 4.19 7.09 8.29
      5.20 6.53 1.01 4.18 7.07 8.27
      5.22 6.55 1.01 4.16 7.04 8.24
      5.24 6.56 1.00 4.14 7.02 8.22
      5.26 6.58 1.00 4.12 7.00 8.20
      5.28 7.00 1.00 4.11 6.57 8.17
      5.30 7.01 12.59 4.09 6.55 8.15
      5.31 7.03 12.59 4.07 6.53 8.13
      5.33 7.05 12.59 4.06 6.50 8.10
      5.35 7.07 12.58 4.04 6.48 8.08`,
    jamaat: {
      1: "5.00 1.30 5.30 9.30",
      4: "5.15 1.30 5.15 9.15",
      11: "5.30 1.30 5.00 9.00",
      18: "5.45 1.30 5.00 8.45",
      25: "6.00 1.30 4.45 8.30",
    },
  },
};
