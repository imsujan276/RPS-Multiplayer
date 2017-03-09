/**
 * Created by Hyungwu Pae on 3/6/17.
 */
var APP = (function (app) {

  const game = app.game;

  $(() => {
    //Event listen for start button click or enter key being pressed
    $('#name-form').on('submit', (e) => {
      e.preventDefault();
      const name = $('#name-input').val().trim();
      $('#name-input').val('');
      if (!name) return; //input validation
      game.startGame(name);
      return false;
    });

    //Event listen for clicking waiting user
    $('#waiting-players').on('click', 'button', (e) => {
      game.challenge(e.target.textContent);
    });

    //Event Listen for accepting challenge (click YES)
    $('#accept-challenge-btn').on('click', game.acceptChallenge);

    //Event Listen for denying challenge (click YES)
    $('#deny-challenge-btn').on('click', game.denyChallenge);

    //Event Listen for choosing one of the RPS
    $('button.rps').on('click', (e) => {
      game.chooseOneOfRPS(e.target.textContent);
    });

  });




})(APP || {});