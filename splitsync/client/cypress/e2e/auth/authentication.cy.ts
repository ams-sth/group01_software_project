import { registerViaApi } from '../../support/testApi'

describe('authentication page', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5173/login')
  })

  it('switches to create account mode', () => {
    cy.get('[role="tab"]').contains('Create account').click()
    cy.get('[role="tab"]').contains('Create account').should('have.attr', 'aria-selected', 'true')
    cy.get('#identifier').should('have.attr', 'type', 'email')
    cy.contains("We'll generate a username for you automatically")
  })

  it('rejects a password that is too short when creating an account', () => {
    cy.get('[role="tab"]').contains('Create account').click()
    cy.get('#identifier').type(`shortpw${Date.now()}@example.com`)
    cy.get('#password').type('short')
    cy.get('button[type="submit"]').click()

    cy.contains('[role="alert"]', /at least 8 characters/i)
    cy.url().should('include', '/login')
  })

  it('creates an account and lands on the home page', () => {
    const email = `newcomer${Date.now()}@example.com`
    cy.get('[role="tab"]').contains('Create account').click()
    cy.get('#identifier').type(email)
    cy.get('#password').type('flatmates2026')
    cy.get('button[type="submit"]').click()

    cy.url().should('include', '/home')
    cy.contains('Welcome back')
  })

  it('signs in with an existing account', () => {
    registerViaApi().then((auth) => {
      cy.get('#identifier').type(auth.email)
      cy.get('#password').type('flatmates2026')
      cy.get('button[type="submit"]').click()

      cy.url().should('include', '/home')
      cy.contains(auth.username)
    })
  })

  it('shows an error for the wrong password', () => {
    registerViaApi().then((auth) => {
      cy.get('#identifier').type(auth.email)
      cy.get('#password').type('the-wrong-password')
      cy.get('button[type="submit"]').click()

      cy.contains('[role="alert"]', /incorrect/i)
      cy.url().should('include', '/login')
    })
  })
})
