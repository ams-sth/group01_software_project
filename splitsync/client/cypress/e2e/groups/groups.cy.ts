import { addMemberViaApi, createGroupViaApi, registerViaApi, visitAsUser } from '../../support/testApi'

describe('groups', () => {
  it('creates a group from the groups page', () => {
    registerViaApi().then((auth) => {
      visitAsUser('http://localhost:5173/groups', auth)
      cy.get('input[placeholder="e.g. Flat 4B"]').type('Flat 4B')
      cy.contains('button', 'Create').click()
      cy.contains('a', 'Flat 4B').should('be.visible')
    })
  })

  it('joins a group by pasting its ID', () => {
    registerViaApi().then((creator) => {
      createGroupViaApi(creator, 'Bali Trip 2026').then((group) => {
        registerViaApi().then((joiner) => {
          visitAsUser('http://localhost:5173/groups', joiner)
          cy.get('input[placeholder="Paste a group ID"]').type(group.id)
          cy.contains('button', 'Join').click()
          cy.contains('a', 'Bali Trip 2026').should('be.visible')
        })
      })
    })
  })

  it('lets the creator rename the group', () => {
    registerViaApi().then((auth) => {
      createGroupViaApi(auth, 'Flat 4B').then((group) => {
        visitAsUser(`http://localhost:5173/groups/${group.id}`, auth)
        cy.get('[role="tab"]').contains('members').click()
        cy.contains('button', 'Rename group').click()
        cy.get('input[type="text"]').first().clear().type('The Attic')
        cy.contains('button', 'Save').click()
        cy.contains('h1', 'The Attic').should('be.visible')
      })
    })
  })

  it('lets the creator delete the group', () => {
    registerViaApi().then((auth) => {
      createGroupViaApi(auth, 'Flat 4B').then((group) => {
        visitAsUser(`http://localhost:5173/groups/${group.id}`, auth)
        cy.get('[role="tab"]').contains('members').click()
        cy.on('window:confirm', () => true)
        cy.contains('button', 'Delete group').click()
        cy.url().should('include', '/groups')
        cy.url().should('not.include', group.id)
      })
    })
  })

  it('lets a member leave the group', () => {
    registerViaApi().then((creator) => {
      createGroupViaApi(creator, 'Flat 4B').then((group) => {
        registerViaApi().then((member) => {
          addMemberViaApi(creator, group.id, member.username).then(() => {
            visitAsUser(`http://localhost:5173/groups/${group.id}`, member)
            cy.get('[role="tab"]').contains('members').click()
            cy.on('window:confirm', () => true)
            cy.contains('button', 'Leave group').click()
            cy.url().should('include', '/groups')
          })
        })
      })
    })
  })

  it('lets the creator add and remove a member', () => {
    registerViaApi().then((creator) => {
      createGroupViaApi(creator, 'Flat 4B').then((group) => {
        registerViaApi().then((newMember) => {
          visitAsUser(`http://localhost:5173/groups/${group.id}`, creator)
          cy.get('[role="tab"]').contains('members').click()
          cy.get('input[placeholder="Add member by username"]').type(newMember.username)
          cy.contains('button', 'Add').click()
          cy.contains('li', newMember.username).should('be.visible')

          cy.on('window:confirm', () => true)
          cy.get(`button[aria-label="Remove ${newMember.username}"]`).click()
          cy.contains('li', newMember.username).should('not.exist')
        })
      })
    })
  })
})
