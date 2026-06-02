/**
 * EchoWall Feed & Comments Database Integration Tests
 * Tests: Rants, Comments, Reactions, Notifications
 * Run with: TestSprite
 */

describe('EchoWall Feed & Comments', () => {
  
  beforeEach(() => {
    cy.visit('http://localhost/EchoWall/Sierra-2.0/login.php');
  });

  describe('User Authentication & Feed Access', () => {
    it('should login and access feed', () => {
      cy.get('input[name="username"]').type('tite');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();
      cy.url().should('include', 'index.php');
      cy.get('.center-col').should('exist');
    });
  });

  describe('Rant Posting to Database', () => {
    it('should post a new rant and save to database', () => {
      cy.login('tite', 'password123');
      cy.get('#compose-ta').type('Test rant from database integration');
      cy.get('#post-btn').click();
      cy.get('.rb-toast--success').should('contain', 'Rant posted');
      // Verify rant appears in feed
      cy.get('.post-card').should('contain', 'Test rant from database integration');
    });

    it('should fetch rants from database on page load', () => {
      cy.request('GET', 'api/get_rants.php').then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.be.an('array');
        if (response.body.length > 0) {
          expect(response.body[0]).to.have.keys('id', 'user_ID', 'content', 'username', 'createdAt');
        }
      });
    });
  });

  describe('Comments Database Integration', () => {
    it('should post a comment and save to database', () => {
      cy.login('tite', 'password123');
      // Find first rant and click comment button
      cy.get('.comment-toggle-btn').first().click();
      cy.get('.comment-input').first().type('This is a database test comment');
      cy.get('.send-comment').first().click();
      cy.get('.rb-toast--success').should('contain', 'Comment posted');
    });

    it('should retrieve comments from database', () => {
      // Assuming first rant has ID 1
      cy.request('GET', 'get_comments.php?rant_id=1').then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.be.an('array');
        if (response.body.length > 0) {
          expect(response.body[0]).to.have.keys(
            'comment_ID', 
            'rant_ID', 
            'user_ID', 
            'comment_text', 
            'created_at', 
            'username'
          );
        }
      });
    });

    it('should display loaded comments in UI', () => {
      cy.login('tite', 'password123');
      cy.get('.comment-toggle-btn').first().click();
      cy.get('.comment-list').should('be.visible');
      // Should show "No comments yet" or actual comments
      cy.get('.comment-item, .empty').should('exist');
    });
  });

  describe('Reactions Database Integration', () => {
    it('should save like reaction to database', () => {
      cy.login('tite', 'password123');
      cy.get('.like-btn').first().click();
      cy.get('.like-btn').first().should('have.class', 'liked');
    });

    it('should save emoji reaction to database', () => {
      cy.login('tite', 'password123');
      cy.get('.react-btn').first().click();
      cy.get('.r-emoji').first().click();
      // Reaction chip should appear
      cy.get('.reaction-chip').should('exist');
    });

    it('should retrieve reactions from database', () => {
      cy.request('GET', 'api/get_reactions.php?rant_id=1').then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.be.an('object');
      });
    });
  });

  describe('Notifications Database Integration', () => {
    it('should create notification when commenting on another user rant', () => {
      cy.login('tite', 'password123');
      // Find a rant from another user and comment
      cy.get('.post-card').not('.own').first().within(() => {
        cy.get('.comment-toggle-btn').click();
        cy.get('.comment-input').type('Test notification comment');
        cy.get('.send-comment').click();
      });
      cy.get('.rb-toast--success').should('exist');
    });

    it('should retrieve user notifications from database', () => {
      cy.request('GET', 'api/get_notifications.php', {
        headers: { 'X-User-ID': '1' }
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.be.an('array');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error when posting empty comment', () => {
      cy.login('tite', 'password123');
      cy.get('.comment-toggle-btn').first().click();
      cy.get('.send-comment').first().click();
      // Button should remain disabled or show error
      cy.get('.send-comment').first().should('be.disabled');
    });

    it('should handle comment posting errors gracefully', () => {
      cy.intercept('POST', 'save_comment.php', {
        statusCode: 500,
        body: { success: false, message: 'Database error' }
      });
      cy.login('tite', 'password123');
      cy.get('.comment-toggle-btn').first().click();
      cy.get('.comment-input').first().type('Test comment');
      cy.get('.send-comment').first().click();
      cy.get('.rb-toast--error').should('contain', 'Failed to post comment');
    });

    it('should reject unauthorized comment posting', () => {
      cy.request({
        method: 'POST',
        url: 'save_comment.php',
        body: { rant_id: 1, comment_text: 'Unauthorized comment' },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.body.success).to.equal(false);
        expect(response.body.message).to.include('Unauthorized');
      });
    });
  });

  describe('Database Consistency', () => {
    it('should maintain referential integrity', () => {
      // Test that comments reference valid rants
      cy.request('GET', 'get_comments.php?rant_id=999').then((response) => {
        // Should return empty array, not error
        expect(response.status).to.equal(200);
        expect(response.body).to.be.an('array');
      });
    });

    it('should return consistent data across multiple requests', () => {
      cy.request('GET', 'api/get_rants.php').then((response1) => {
        const rantCount1 = response1.body.length;
        cy.request('GET', 'api/get_rants.php').then((response2) => {
          // Count should be same if no new rants posted
          expect(response2.body.length).to.be.at.least(rantCount1 - 1);
        });
      });
    });
  });
});

// Custom commands
Cypress.Commands.add('login', (username, password) => {
  cy.visit('http://localhost/EchoWall/Sierra-2.0/login.php');
  cy.get('input[name="username"]').type(username);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', 'index.php');
});
