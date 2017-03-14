/**
 * Created by Hyungwu Pae on 3/14/17.
 */
/**
 * Created by Hyungwu Pae on 3/6/17.
 */
var APP = (function (app) {
  const database = app.database;
  const view = app.view ? app.view : app.view = {};
  const game = app.game ? app.game : app.game = {};
  const state = app.state ? app.state : app.state = {};
  const usersRef = database.ref('users/');

  const user = app.user ? app.user : app.user = {};

  //This function is for watching user object change on FireBase
  user.watchMe = (myName) => {
    //watch user data in FB
    usersRef.child(myName).on('value', userSnap => {
      const oldMe = state.getMe();
      if(userSnap.val()) {
        state.setMe(userSnap.val());
      }
      const me = state.getMe();
      //when game created,
      if(!oldMe.currentGame && me && me.currentGame) {

        //1. user is currently challenged by someone.
        if(me.currentGame.role === 'challengee') {
          view.showChallengedByMsg(me.currentGame.opponent);
          console.log("USER HAS BEEN CHALLENGED BY" + me.currentGame.opponent);
        }
        // 2. user has challenged
        else if(me.currentGame.role === 'challenger') {
          view.showWaitingChallengeesMsg(me.currentGame.opponent);
          console.log("USER HAS CHALLENGED " + me.currentGame.opponent);
        }

        //start watching game
        game.watchGame(me.currentGame.id);

      }
      else {
        //update view: render user stats
        view.renderMyStat(me);
      }
    });
  };

  return app;

})(APP || {});
