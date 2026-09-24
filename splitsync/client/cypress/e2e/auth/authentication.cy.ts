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

  
  it('blocks submit when password is too short', () => {
    cy.get('#identifier').type('user@example.com')
    cy.get('#password').type('short')
    cy.get('#password').then(($input) => {
      expect(($input[0] as HTMLInputElement).checkValidity()).to.be.false
    })
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
