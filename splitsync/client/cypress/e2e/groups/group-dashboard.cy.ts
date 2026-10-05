import { addExpenseViaApi, addMemberViaApi, createGroupViaApi, registerViaApi, visitAsUser } from '../../support/testApi'

describe('group dashboard', () => {
  it('shows a new group with no balances or transactions yet', () => {
    registerViaApi().then((auth) => {
      createGroupViaApi(auth, 'Flat 4B').then((group) => {
        visitAsUser(`http://localhost:5173/groups/${group.id}`, auth)

        cy.contains('h1', 'Flat 4B').should('be.visible')
        cy.contains('No balances yet.').should('be.visible')
        cy.contains('button', '+ Add expense').should('be.visible')
        cy.get('[role="tab"]').contains('transactions').click()
        cy.contains('No transactions yet.').should('be.visible')
      })
    })
  })

  it('switches between overview, transactions and members', () => {
    registerViaApi().then((auth) => {
      createGroupViaApi(auth, 'Flat 4B').then((group) => {
        visitAsUser(`http://localhost:5173/groups/${group.id}`, auth)

        cy.get('[role="tab"][aria-selected="true"]').should('contain.text', 'overview')
        cy.get('[role="tab"]').contains('transactions').click()
        cy.get('[role="tab"][aria-selected="true"]').should('contain.text', 'transactions')
        cy.get('[role="tab"]').contains('members').click()
        cy.get('[role="tab"][aria-selected="true"]').should('contain.text', 'members')
        cy.contains('Group ID (share to invite):').should('be.visible')
      })
    })
  })

  it('shows what a member owes on the overview', () => {
    registerViaApi().then((creator) => {
      registerViaApi().then((member) => {
        createGroupViaApi(creator, 'Flat 4B').then((group) => {
          addMemberViaApi(creator, group.id, member.username).then(() => {
            addExpenseViaApi(creator, group.id, 'Weekly groceries', 40, [creator.username, member.username]).then(() => {
              visitAsUser(`http://localhost:5173/groups/${group.id}`, member)

              cy.contains('You owe $20.00').should('be.visible')
              cy.contains('li', creator.username).should('contain.text', 'You owe $20.00')
            })
          })
        })
      })
    })
  })

  it('shows a not found message for an unknown group', () => {
    registerViaApi().then((auth) => {
      visitAsUser('http://localhost:5173/groups/00000000-0000-0000-0000-000000000000', auth)

      cy.contains('Group not found.').should('be.visible')
      cy.contains('a', 'Back to groups').should('be.visible')
    })
  })

  it('hides creator-only controls from a member', () => {
    registerViaApi().then((creator) => {
      registerViaApi().then((member) => {
        createGroupViaApi(creator, 'Flat 4B').then((group) => {
          addMemberViaApi(creator, group.id, member.username).then(() => {
            visitAsUser(`http://localhost:5173/groups/${group.id}`, member)
            cy.get('[role="tab"]').contains('members').click()

            cy.contains('button', 'Leave group').should('be.visible')
            cy.contains('button', 'Rename group').should('not.exist')
            cy.contains('button', 'Delete group').should('not.exist')
            cy.get('input[placeholder="Add member by username"]').should('not.exist')
          })
        })
      })
    })
  })
})
