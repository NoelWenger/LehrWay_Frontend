import { ref } from 'vue'

import {
  ApiError,
  json,
  request,
} from './lehrway-api'

export interface SessionUser {
  id: number
  username: string
  email: string
}

export const currentUser =
  ref<SessionUser | null>(null)

export async function loadCurrentUser() {
  try {
    const result = await request<{
      user: SessionUser
    }>('/me')

    currentUser.value = result.user
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 401
    ) {
      throw error
    }

    currentUser.value = null
  }

  return currentUser.value
}

export async function login(
  email: string,
  password: string,
) {
  const result = await request<{
    user: SessionUser
  }>(
    '/login',
    json('POST', {
      email,
      password,
    }),
  )

  currentUser.value = result.user

  localStorage.removeItem('user')
}

export async function logout() {
  await request(
    '/logout',
    json('POST'),
  )

  currentUser.value = null

  localStorage.removeItem('user')
}
