import { apiFetch } from "../lib/api";

/**
 * Получить все жанры из справочника.
 */
export async function fetchGenres() {
  return apiFetch("/genres");
}

/**
 * Получить все платформы из справочника.
 */
export async function fetchPlatforms() {
  return apiFetch("/platforms");
}

/**
 * Добавить новый жанр.
 * @param {string} genreName - Название жанра
 */
export async function addGenre(genreName) {
  return apiFetch("/genres", {
    method: "POST",
    body: { name: genreName },
  });
}

/**
 * Добавить новую платформу.
 * @param {string} platformName - Название платформы
 */
export async function addPlatform(platformName) {
  return apiFetch("/platforms", {
    method: "POST",
    body: { name: platformName },
  });
}

/**
 * Удалить жанр по ID.
 * @param {number} genreId - ID жанра
 */
export async function removeGenre(genreId) {
  return apiFetch(`/genres/${genreId}`, { method: "DELETE" });
}

/**
 * Удалить платформу по ID.
 * @param {number} platformId - ID платформы
 */
export async function removePlatform(platformId) {
  return apiFetch(`/platforms/${platformId}`, { method: "DELETE" });
}