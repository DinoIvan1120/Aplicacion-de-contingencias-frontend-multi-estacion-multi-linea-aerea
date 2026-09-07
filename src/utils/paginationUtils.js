/**
 * Desenvuelve la respuesta paginada de Spring Boot:
 * { success, data: { content, totalElements, totalPages, number } }
 */
export function unwrapPage(response) {
  const page = response?.data?.data ?? response?.data ?? {}
  return {
    content: page.content ?? [],
    totalElements: page.totalElements ?? 0,
    totalPages: page.totalPages ?? 0,
    currentPage: page.number ?? 0,
  }
}

export function buildPageParams(page = 0, size = 10) {
  return { page, size }
}
