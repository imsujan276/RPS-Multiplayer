/**
 * Created by Hyungwu Pae on 3/6/17.
 */
var APP = (function (app) {
  
  const game = app.game;
  const view = app.view;

  $(() => {
    //Event listen for start button click or enter key being pressed
    view.nameForm.on("submit", (e) => {
      e.preventDefault();
      const name = view.nameInput.val().trim();
      if (!name) return; //input validation check
      game.startGame(name);
      return false;
    });

    //Event listen for clicking waiting user
    view.waitingList.on("click", (e) => {
      game.challenge(e.target.textContent);
    });

    //Event Listen for accept challenge (click YES)
    view.acceptBtn.on("click", (e) => {
      game.acceptChallenge();
    });

  });




})(APP || {});