import { addExpenseViaApi, addMemberViaApi, createGroupViaApi, registerViaApi, visitAsUser } from '../../support/testApi'

describe('settlements', () => {
  it('recording a settlement clears the balance', () => {
    registerViaApi().then((creator) => {
      registerViaApi().then((member) => {
        createGroupViaApi(creator, 'Flat 4B').then((group) => {
          addMemberViaApi(creator, group.id, member.username).then(() => {
            addExpenseViaApi(creator, group.id, 'Weekly groceries', 40, [creator.username, member.username]).then(() => {
              visitAsUser(`http://localhost:5173/groups/${group.id}`, member)

              cy.contains('You owe $20.00').should('be.visible')

              cy.get('select').first().should('have.value', creator.username)
              cy.get('select').last().select('I paid them')
              cy.get('input[placeholder="Amount"]').type('20')
              cy.contains('button', 'Record').click()

              cy.contains("You're all settled up").should('be.visible')

              cy.get('[role="tab"]').contains('transactions').click()
              cy.contains('Settlement').should('be.visible')
              cy.contains(`${member.username} paid ${creator.username}`).should('be.visible')
            })
          })
        })
      })
    })
  })
})
