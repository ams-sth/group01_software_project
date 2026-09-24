import { addExpenseViaApi, addMemberViaApi, createGroupViaApi, registerViaApi, visitAsUser } from '../../support/testApi'

describe('notifications', () => {
  // Adding a member to the group sends its own notification too, so the
  // flatmate who was added and then charged an expense has two unread.
  it('shows an unread badge and the notification in the dropdown', () => {
    registerViaApi().then((creator) => {
      registerViaApi().then((member) => {
        createGroupViaApi(creator, 'Flat 4B').then((group) => {
          addMemberViaApi(creator, group.id, member.username).then(() => {
            addExpenseViaApi(creator, group.id, 'Weekly groceries', 40, [creator.username, member.username]).then(() => {
              visitAsUser('http://localhost:5173/home', member)

              cy.get('button[aria-label="Notifications"]').find('span').should('contain', '2')
              cy.get('button[aria-label="Notifications"]').click()
              cy.contains('Weekly groceries').should('be.visible')
            })
          })
        })
      })
    })
  })

  it('mark all read clears the unread badge', () => {
    registerViaApi().then((creator) => {
      registerViaApi().then((member) => {
        createGroupViaApi(creator, 'Flat 4B').then((group) => {
          addMemberViaApi(creator, group.id, member.username).then(() => {
            addExpenseViaApi(creator, group.id, 'Weekly groceries', 40, [creator.username, member.username]).then(() => {
              visitAsUser('http://localhost:5173/home', member)

              cy.get('button[aria-label="Notifications"]').click()
              cy.contains('button', 'Mark all read').click()
              cy.get('button[aria-label="Notifications"] span').should('not.exist')
            })
          })
        })
      })
    })
  })
})
