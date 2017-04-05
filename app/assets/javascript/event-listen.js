/**
 * Created by Hyungwu Pae on 3/6/17.
 */
var APP = (function (app) {

  $(() => {

    app.initialize();

    //Event listen for start button click or enter key being pressed
    $('#name-form').on('submit', (e) => {
      e.preventDefault();
      const name = $('#name-input').val().trim();
      $('#name-input').val('');
      if (!name) return; //input validation
      app.setUsername(name);
      return false;
    });

    //Event listen for clicking waiting user
    $('#waiting-players').on('click', 'button', (e) => {
      app.challenge(e.target.textContent);
    });

    //Event Listen for accepting challenge (click YES)
    $('#accept-challenge-btn').on('click', app.acceptChallenge);

    //Event Listen for denying challenge (click YES)
    $('#deny-challenge-btn').on('click', app.denyChallenge);

    //Event Listen for choosing one of the RPS
    $('button.rps').on('click', (e) => {
      app.chooseOneOfRPS(e.target.textContent);
    });

    //user quit the game
    $('button#quit').on('click', app.quitGame);

    //user typed chat message
    $('#chat-form').on('submit', e => {
      e.preventDefault();
      const msg = $('#chat-message').val();
      $('#chat-message').val('');
      if (!msg) return; //input validation
      app.submitMsg(msg);
      return false;
    });
  });

})(APP);