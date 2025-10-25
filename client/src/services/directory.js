import { apiFetch } from "../lib/api";

// Получить все жанры
export async function fetchGenres() {
  return apiFetch('/genres');
}

// Получить все платформы
export async function fetchPlatforms() {
  return apiFetch('/platforms');
}

// Добавить новый жанр
export async function addGenre(genreName) {
  return apiFetch('/genres', {
    method: 'POST',
    body: { name: genreName }
  });
}

// Добавить новую платформу
export async function addPlatform(platformName) {
  return apiFetch('/platforms', {
    method: 'POST',
    body: { name: platformName }
  });
}

// Удалить жанр
export async function removeGenre(genreId) {
  return apiFetch(`/genres/${genreId}`, { method: 'DELETE' });
}

// Удалить платформу
export async function removePlatform(platformId) {
  return apiFetch(`/platforms/${platformId}`, { method: 'DELETE' });
}