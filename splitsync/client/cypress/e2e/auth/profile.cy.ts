import { registerViaApi, visitAsUser } from '../../support/testApi'

describe('profile page', () => {
  it('signs out and returns to the landing page', () => {
    registerViaApi().then((auth) => {
      visitAsUser('http://localhost:5173/profile', auth)
      cy.contains(auth.username)
      cy.contains('button', 'Sign out').click()
      cy.url().should('eq', 'http://localhost:5173/')
    })
  })

  it('deletes the account and returns to the landing page', () => {
    registerViaApi().then((auth) => {
      visitAsUser('http://localhost:5173/profile', auth)
      cy.on('window:confirm', () => true)
      cy.contains('button', 'Delete account').click()
      cy.url().should('eq', 'http://localhost:5173/')
    })
  })
})
