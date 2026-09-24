import { addExpenseViaApi, addMemberViaApi, createGroupViaApi, registerViaApi, visitAsUser } from '../../support/testApi'

describe('expenses', () => {
  it('adds an equal-split expense and reflects it in the balance', () => {
    registerViaApi().then((creator) => {
      registerViaApi().then((member) => {
        createGroupViaApi(creator, 'Flat 4B').then((group) => {
          addMemberViaApi(creator, group.id, member.username).then(() => {
            visitAsUser(`http://localhost:5173/groups/${group.id}`, creator)

            cy.contains('button', '+ Add expense').click()
            cy.get('[role="dialog"]').within(() => {
              cy.get('input[placeholder="What was it for?"]').type('Weekly groceries')
              cy.get('input[placeholder="Amount"]').type('40')
              cy.contains('button', 'Add expense').click()
            })

            cy.contains('You are owed $20.00').should('be.visible')

            cy.get('[role="tab"]').contains('transactions').click()
            cy.contains('Weekly groceries').should('be.visible')
            cy.contains(`Paid by ${creator.username}`).should('be.visible')
          })
        })
      })
    })
  })

  it("blocks submitting an unequal split that doesn't add up", () => {
    registerViaApi().then((creator) => {
      registerViaApi().then((member) => {
        createGroupViaApi(creator, 'Flat 4B').then((group) => {
          addMemberViaApi(creator, group.id, member.username).then(() => {
            visitAsUser(`http://localhost:5173/groups/${group.id}`, creator)

            cy.contains('button', '+ Add expense').click()
            cy.get('[role="dialog"]').within(() => {
              cy.get('input[placeholder="What was it for?"]').type('Internet bill')
              cy.get('input[placeholder="Amount"]').type('64.99')
              cy.get('[role="tab"]').contains('unequal').click()
              cy.get('input[placeholder="$"]').first().type('30')
              cy.get('input[placeholder="$"]').last().type('30')

              cy.contains('button', 'Add expense').should('be.disabled')
            })
          })
        })
      })
    })
  })

  it('lets the payer edit an expense', () => {
    registerViaApi().then((creator) => {
      createGroupViaApi(creator, 'Flat 4B').then((group) => {
        addExpenseViaApi(creator, group.id, 'Coffee run', 10, [creator.username]).then(() => {
          visitAsUser(`http://localhost:5173/groups/${group.id}`, creator)
          cy.get('[role="tab"]').contains('transactions').click()

          cy.contains('button', 'Edit').click()
          cy.get('[role="dialog"]').within(() => {
            cy.get('input[placeholder="What was it for?"]').clear().type('Pizza night')
            cy.contains('button', 'Save changes').click()
          })

          cy.contains('Pizza night').should('be.visible')
        })
      })
    })
  })

  it('lets the payer delete an expense', () => {
    registerViaApi().then((creator) => {
      createGroupViaApi(creator, 'Flat 4B').then((group) => {
        addExpenseViaApi(creator, group.id, 'Coffee run', 10, [creator.username]).then(() => {
          visitAsUser(`http://localhost:5173/groups/${group.id}`, creator)
          cy.get('[role="tab"]').contains('transactions').click()

          cy.on('window:confirm', () => true)
          cy.contains('button', 'Delete').click()

          cy.contains('Coffee run').should('not.exist')
        })
      })
    })
  })
})
