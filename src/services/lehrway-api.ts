
const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  const data =
    response.status === 204
      ? null
      : await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.message || `HTTP ${response.status}: ${path}`
    )
  }

  return data as T
}

export function json(
  method: string,
  data?: unknown
): RequestInit {
  return {
    method,
    ...(data === undefined
      ? {}
      : { body: JSON.stringify(data) })
  }
}
