const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000/api'
).replace(/\/$/, '')

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(
    options.headers,
  )

  if (!headers.has('Content-Type')) {
    headers.set(
      'Content-Type',
      'application/json',
    )
  }

  headers.set(
    'X-Lehrway-Request',
    '1',
  )

  const response = await fetch(
    API_URL + path,
    {
      ...options,
      credentials: 'include',
      headers,
    },
  )

  const data =
    response.status === 204
      ? null
      : await response
        .json()
        .catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.message ||
      'HTTP ' + response.status,
    )
  }

  return data as T
}

export function json(
  method: string,
  data?: unknown,
): RequestInit {
  return {
    method,
    ...(
      data === undefined
        ? {}
        : {
          body: JSON.stringify(data),
        }
    ),
  }
}
