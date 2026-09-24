import { getToken } from './session'

// VITE_API_URL is a bare host (e.g. "splitsync-api-9v5f.onrender.com", see render.yaml), not a full URL.
const API_BASE = import.meta.env.VITE_API_URL ? `https://${import.meta.env.VITE_API_URL}/api` : '/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function send(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      // FormData bodies need the browser to set its own multipart Content-Type (with the boundary).
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = body?.message ?? body?.errors?.[0] ?? 'Something went wrong. Please try again.'
    throw new ApiError(message, response.status)
  }

  return response
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await send(path, options)

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export interface AuthResponse {
  token: string
  username: string
  email: string
}

export function register(email: string, password: string) {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function login(identifier: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  })
}

export function deleteAccount() {
  return request<void>('/auth/me', {
    method: 'DELETE',
  })
}

export interface GroupResponse {
  id: string
  name: string
  creatorUsername: string
  memberUsernames: string[]
}

export function listGroups() {
  return request<GroupResponse[]>('/groups')
}

export function createGroup(name: string) {
  return request<GroupResponse>('/groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function addMember(groupId: string, username: string) {
  return request<GroupResponse>(`/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  })
}

export function searchMemberCandidates(groupId: string, query: string) {
  return request<string[]>(`/groups/${groupId}/member-candidates?q=${encodeURIComponent(query)}`)
}

export function joinGroup(groupId: string) {
  return request<GroupResponse>(`/groups/${groupId}/join`, {
    method: 'POST',
  })
}

export function renameGroup(groupId: string, name: string) {
  return request<GroupResponse>(`/groups/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export function deleteGroup(groupId: string) {
  return request<void>(`/groups/${groupId}`, {
    method: 'DELETE',
  })
}

export function removeMember(groupId: string, username: string) {
  return request<GroupResponse>(`/groups/${groupId}/members/${encodeURIComponent(username)}`, {
    method: 'DELETE',
  })
}

export function leaveGroup(groupId: string) {
  return request<void>(`/groups/${groupId}/leave`, {
    method: 'POST',
  })
}

export interface ExpenseShareResponse {
  username: string
  amount: number
}

export type SplitMethod = 'equal' | 'unequal' | 'percentage'

export interface ExpenseResponse {
  id: string
  description: string
  amount: number
  paidByUsername: string
  splitMethod: SplitMethod
  createdAt: string
  shares: ExpenseShareResponse[]
  hasReceipt: boolean
}

export interface ExpenseSplitInput {
  username: string
  amount?: number
  percentage?: number
}

export function listExpenses(groupId: string) {
  return request<ExpenseResponse[]>(`/groups/${groupId}/expenses`)
}

export function addExpense(
  groupId: string,
  description: string,
  amount: number,
  splitMethod: SplitMethod,
  splits: ExpenseSplitInput[]
) {
  return request<ExpenseResponse>(`/groups/${groupId}/expenses`, {
    method: 'POST',
    body: JSON.stringify({ description, amount, splitMethod, splits }),
  })
}

export function updateExpense(
  groupId: string,
  expenseId: string,
  description: string,
  amount: number,
  splitMethod: SplitMethod,
  splits: ExpenseSplitInput[]
) {
  return request<ExpenseResponse>(`/groups/${groupId}/expenses/${expenseId}`, {
    method: 'PATCH',
    body: JSON.stringify({ description, amount, splitMethod, splits }),
  })
}

export function deleteExpense(groupId: string, expenseId: string) {
  return request<void>(`/groups/${groupId}/expenses/${expenseId}`, { method: 'DELETE' })
}

export function uploadReceipt(groupId: string, expenseId: string, photo: Blob) {
  const form = new FormData()
  form.append('file', photo, 'receipt')
  return request<ExpenseResponse>(`/groups/${groupId}/expenses/${expenseId}/receipt`, {
    method: 'PUT',
    body: form,
  })
}

export function deleteReceipt(groupId: string, expenseId: string) {
  return request<ExpenseResponse>(`/groups/${groupId}/expenses/${expenseId}/receipt`, { method: 'DELETE' })
}

// Fetched as a blob (rather than pointing an <img> at the URL) because the
// endpoint needs the Authorization header, which an <img> request can't send.
export async function getReceipt(groupId: string, expenseId: string) {
  const response = await send(`/groups/${groupId}/expenses/${expenseId}/receipt`)
  return response.blob()
}

export interface MemberBalance {
  username: string
  netAmount: number
}

export interface GroupBalancesResponse {
  youAreOwedTotal: number
  youOweTotal: number
  balances: MemberBalance[]
}

export function getBalances(groupId: string) {
  return request<GroupBalancesResponse>(`/groups/${groupId}/balances`)
}

export interface SettlementResponse {
  id: string
  fromUsername: string
  toUsername: string
  amount: number
  createdAt: string
}

export function listSettlements(groupId: string) {
  return request<SettlementResponse[]>(`/groups/${groupId}/settlements`)
}

export function recordSettlement(groupId: string, username: string, amount: number, iPaid: boolean) {
  return request<SettlementResponse>(`/groups/${groupId}/settlements`, {
    method: 'POST',
    body: JSON.stringify({ username, amount, iPaid }),
  })
}

export interface NotificationResponse {
  id: string
  message: string
  groupId: string | null
  isRead: boolean
  createdAt: string
}

export function listNotifications() {
  return request<NotificationResponse[]>('/notifications')
}

export function getUnreadNotificationCount() {
  return request<{ count: number }>('/notifications/unread-count')
}

export function markNotificationRead(id: string) {
  return request<void>(`/notifications/${id}/read`, { method: 'POST' })
}

export function markAllNotificationsRead() {
  return request<void>('/notifications/read-all', { method: 'POST' })
}
