const API_BASE = "https://api.jolpi.ca/ergast/f1";
const $ = (selector) => document.querySelector(selector);

const teamColors = {
  "McLaren": "#ff8700", "Ferrari": "#e8002d", "Red Bull": "#3671c6",
  "Mercedes": "#27f4d2", "Aston Martin": "#229971", "Alpine F1 Team": "#ff87bc",
  "Williams": "#64c4ff", "Racing Bulls": "#6692ff", "Haas F1 Team": "#b6babd",
  "Kick Sauber": "#52e252", "Audi": "#bb0000", "Cadillac": "#d6d6d6"
};
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function formatDate(dateString) {
  if (!dateString) return "날짜 미정";
  const date = new Date(dateString + "T12:00:00Z");
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}
async function getJson(path) {
  const response = await fetch(API_BASE + path, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("API 요청 실패 (" + response.status + ")");
  return response.json();
}
function setStatus(message, good = true) {
  const status = $("#connection-status");
  status.textContent = message;
  status.style.color = good ? "var(--green)" : "#ff7c88";
}
function renderSchedule(races) {
  const body = $("#schedule-body");
  if (!races.length) {
    body.innerHTML = '<tr><td colspan="4" class="loading-cell">표시할 일정이 없습니다.</td></tr>';
    return;
  }
  body.innerHTML = races.map((race) => `<tr><td>${escapeHtml(race.round)}</td><td>${escapeHtml(race.raceName)}</td><td>${escapeHtml(race.Circuit?.circuitName || "서킷 정보 없음")}</td><td>${escapeHtml(formatDate(race.date))}</td></tr>`).join("");
}
function renderDrivers(drivers) {
  const list = $("#drivers-list");
  if (!drivers.length) {
    list.innerHTML = '<div class="loading-cell">드라이버 순위가 없습니다.</div>';
    return;
  }
  list.innerHTML = drivers.slice(0, 5).map((item) => {
    const driver = item.Driver || {};
    const name = [driver.givenName, driver.familyName].filter(Boolean).join(" ");
    const team = item.Constructors?.[0]?.name || "팀 정보 없음";
    return `<div class="leader-row"><span class="rank">${escapeHtml(item.position || "—")}</span><div class="leader-name">${escapeHtml(name)}<span class="leader-team">${escapeHtml(team)}</span></div><span class="points">${escapeHtml(item.points || "0")}<small>PTS</small></span></div>`;
  }).join("");
}
function renderTeams(teams) {
  const list = $("#teams-list");
  if (!teams.length) {
    list.innerHTML = '<div class="loading-cell">팀 순위가 없습니다.</div>';
    return;
  }
  list.innerHTML = teams.map((item) => {
    const name = item.Constructor?.name || "팀";
    const color = teamColors[name] || "#ff3548";
    return `<article class="team-card" style="--team-color:${color}"><div class="team-top"><span>POS ${escapeHtml(item.position || "—")}</span><span>2026</span></div><strong>${escapeHtml(name)}</strong><div class="team-score">${escapeHtml(item.points || "0")}<span>PTS</span></div></article>`;
  }).join("");
}
async function loadDashboard() {
  const button = $("#refresh-button");
  button.disabled = true;
  button.style.opacity = ".65";
  setStatus("데이터 불러오는 중…");
  const results = await Promise.allSettled([
    getJson("/current.json?limit=100"),
    getJson("/current/driverStandings.json"),
    getJson("/current/constructorStandings.json")
  ]);
  let successCount = 0;
  const [scheduleResult, driversResult, teamsResult] = results;
  if (scheduleResult.status === "fulfilled") {
    const races = scheduleResult.value?.MRData?.RaceTable?.Races || [];
    renderSchedule(races); $("#rounds-value").textContent = races.length || "—";
    if (races.length) successCount++;
  } else { $("#schedule-body").innerHTML = '<tr><td colspan="4" class="loading-cell">일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</td></tr>'; }
  if (driversResult.status === "fulfilled") {
    const lists = driversResult.value?.MRData?.StandingsTable?.StandingsLists || [];
    const drivers = lists[0]?.DriverStandings || [];
    renderDrivers(drivers); $("#drivers-value").textContent = drivers.length || "—";
    if (drivers.length) successCount++;
  } else { $("#drivers-list").innerHTML = '<div class="loading-cell">드라이버 순위를 불러오지 못했습니다.</div>'; }
  if (teamsResult.status === "fulfilled") {
    const lists = teamsResult.value?.MRData?.StandingsTable?.StandingsLists || [];
    const teams = lists[0]?.ConstructorStandings || [];
    renderTeams(teams); $("#teams-value").textContent = teams.length || "—";
    if (teams.length) successCount++;
  } else { $("#teams-list").innerHTML = '<div class="loading-cell">팀 순위를 불러오지 못했습니다.</div>'; }
  if (successCount === 3) setStatus("API 연결 완료");
  else if (successCount > 0) setStatus("일부 데이터만 연결됨", false);
  else setStatus("API 연결 실패 · 새로고침을 눌러 주세요", false);
  button.disabled = false; button.style.opacity = "1";
}
$("#refresh-button").addEventListener("click", loadDashboard);
document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
  link.classList.add("active");
}));
loadDashboard();