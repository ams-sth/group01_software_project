import { addExpenseViaApi, addMemberViaApi, createGroupViaApi, registerViaApi, visitAsUser } from '../../support/testApi'

const ONE_PIXEL_PNG = Cypress.Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

describe('receipts', () => {
  it('attaches a photo receipt to an expense', () => {
    registerViaApi().then((creator) => {
      createGroupViaApi(creator, 'Flat 4B').then((group) => {
        addExpenseViaApi(creator, group.id, 'Coffee run', 10, [creator.username]).then(() => {
          visitAsUser(`http://localhost:5173/groups/${group.id}`, creator)
          cy.get('[role="tab"]').contains('transactions').click()

          cy.contains('button', 'Edit').click()
          cy.get('[role="dialog"]').within(() => {
            cy.get('input[type="file"]').selectFile(
              { contents: ONE_PIXEL_PNG, fileName: 'receipt.png', mimeType: 'image/png' },
              { force: true },
            )
            cy.get('img[alt="Selected receipt"]').should('be.visible')
            cy.contains('button', 'Save changes').click()
          })

          cy.contains('button', 'Receipt').should('be.visible')
        })
      })
    })
  })

  it('rejects a file that is not a photo', () => {
    registerViaApi().then((creator) => {
      createGroupViaApi(creator, 'Flat 4B').then((group) => {
        addExpenseViaApi(creator, group.id, 'Coffee run', 10, [creator.username]).then(() => {
          visitAsUser(`http://localhost:5173/groups/${group.id}`, creator)
          cy.get('[role="tab"]').contains('transactions').click()

          cy.contains('button', 'Edit').click()
          cy.get('[role="dialog"]').within(() => {
            cy.get('input[type="file"]').selectFile(
              { contents: Cypress.Buffer.from('not an image'), fileName: 'notes.txt', mimeType: 'text/plain' },
              { force: true },
            )
            cy.contains('[role="alert"]', 'Receipts must be a photo.')
          })
        })
      })
    })
  })

  it('lets a member view a receipt but not change it', () => {
    registerViaApi().then((creator) => {
      registerViaApi().then((member) => {
        createGroupViaApi(creator, 'Flat 4B').then((group) => {
          addMemberViaApi(creator, group.id, member.username).then(() => {
            addExpenseViaApi(creator, group.id, 'Coffee run', 10, [creator.username, member.username]).then(() => {
              visitAsUser(`http://localhost:5173/groups/${group.id}`, creator)
              cy.get('[role="tab"]').contains('transactions').click()
              cy.contains('button', 'Edit').click()
              cy.get('[role="dialog"]').within(() => {
                cy.get('input[type="file"]').selectFile(
                  { contents: ONE_PIXEL_PNG, fileName: 'receipt.png', mimeType: 'image/png' },
                  { force: true },
                )
                cy.contains('button', 'Save changes').click()
              })
              cy.contains('button', 'Receipt').should('be.visible')

              visitAsUser(`http://localhost:5173/groups/${group.id}`, member)
              cy.get('[role="tab"]').contains('transactions').click()
              cy.contains('button', 'Edit').should('not.exist')
              cy.contains('button', 'Receipt').click()
              cy.get('img[alt="Receipt for Coffee run"]').should('be.visible')
            })
          })
        })
      })
    })
  })

  it('lets the payer remove a receipt', () => {
    registerViaApi().then((creator) => {
      createGroupViaApi(creator, 'Flat 4B').then((group) => {
        addExpenseViaApi(creator, group.id, 'Coffee run', 10, [creator.username]).then(() => {
          visitAsUser(`http://localhost:5173/groups/${group.id}`, creator)
          cy.get('[role="tab"]').contains('transactions').click()

          cy.contains('button', 'Edit').click()
          cy.get('[role="dialog"]').within(() => {
            cy.get('input[type="file"]').selectFile(
              { contents: ONE_PIXEL_PNG, fileName: 'receipt.png', mimeType: 'image/png' },
              { force: true },
            )
            cy.contains('button', 'Save changes').click()
          })
          cy.contains('button', 'Receipt').should('be.visible')

          cy.contains('button', 'Edit').click()
          cy.get('[role="dialog"]').within(() => {
            cy.contains('Receipt attached')
            cy.contains('button', 'Remove').click()
            cy.contains('button', 'Save changes').click()
          })

          cy.contains('button', 'Receipt').should('not.exist')
        })
      })
    })
  })
})
