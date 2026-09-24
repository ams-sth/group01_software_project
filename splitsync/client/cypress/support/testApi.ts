const API_URL = 'http://localhost:5085/api'

const NAMES = ['priya', 'devi', 'shanti', 'Amsh', 'aisha', 'noor', 'callum', 'leo']
let nameIndex = 0

export interface AuthResult {
  token: string
  username: string
  email: string
}

export interface GroupResult {
  id: string
  name: string
  creatorUsername: string
  memberUsernames: string[]
}

export function registerViaApi(password = 'flatmates2026'): Cypress.Chainable<AuthResult> {
  nameIndex += 1
  const email = `${NAMES[nameIndex % NAMES.length]}${nameIndex}@example.com`
  return cy.request('POST', `${API_URL}/auth/register`, { email, password }).then((response) => response.body as AuthResult)
}

export function visitAsUser(url: string, auth: AuthResult) {
  cy.visit(url, {
    onBeforeLoad(win) {
      win.localStorage.setItem('splitsync.token', auth.token)
      win.localStorage.setItem('splitsync.username', auth.username)
      win.localStorage.setItem('splitsync.email', auth.email)
    },
  })
}

export function createGroupViaApi(auth: AuthResult, name: string): Cypress.Chainable<GroupResult> {
  return cy
    .request({
      method: 'POST',
      url: `${API_URL}/groups`,
      headers: { Authorization: `Bearer ${auth.token}` },
      body: { name },
    })
    .then((response) => response.body as GroupResult)
}

export function addMemberViaApi(auth: AuthResult, groupId: string, username: string): Cypress.Chainable<GroupResult> {
  return cy
    .request({
      method: 'POST',
      url: `${API_URL}/groups/${groupId}/members`,
      headers: { Authorization: `Bearer ${auth.token}` },
      body: { username },
    })
    .then((response) => response.body as GroupResult)
}

export function addExpenseViaApi(auth: AuthResult, groupId: string, description: string, amount: number, splitUsernames: string[]) {
  return cy.request({
    method: 'POST',
    url: `${API_URL}/groups/${groupId}/expenses`,
    headers: { Authorization: `Bearer ${auth.token}` },
    body: {
      description,
      amount,
      splitMethod: 'equal',
      splits: splitUsernames.map((username) => ({ username })),
    },
  })
}
