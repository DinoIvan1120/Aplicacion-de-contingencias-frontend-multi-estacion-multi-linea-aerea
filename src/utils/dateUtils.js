// utils/dateUtils.js
export function hoyEnLima() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  // "en-CA" produce formato YYYY-MM-DD que es lo que el backend espera
}
