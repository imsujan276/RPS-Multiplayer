/**
 * Created by Hyungwu Pae on 3/14/17.
 */
var APP = (function (app) {

  const database = app.database;
  const rpsLogic = app.rps;
  const view = app.view;
  const chat = app.chat ? app.chat : app.chat = {};

  const state = app.state ? app.state : app.state = {};
  const waitList = app.waitList ? app.waitList : app.waitList = {};

  const usersRef = database.ref('users/');
  const chatRoomsRef = database.ref('chat-rooms');
  const gamesRef = database.ref('games/');

  const game = app.game ? app.game : app.game = {};


  const destroyGame = (gameId) => {
    const me = state.getMe();

    //detach value change listener for every events and cancel queued onDisconnect
    gamesRef.child(gameId).off();
    gamesRef.child(gameId).onDisconnect().cancel();
    chatRoomsRef.child(gameId).off();
    chatRoomsRef.child(gameId).onDisconnect().cancel();

    //set user's current game as null
    usersRef.child(me.name).update({currentGame: null});

    //add user to waiting list again.
    waitList.addToWaitingList(me.name);

    //destroy game and chat room
    gamesRef.child(gameId).remove();
    chatRoomsRef.child(gameId).remove();

  };


  game.watchAddedGame = () => {
    gamesRef.on('child_added', addedGameSnap => {
      const addedGame = addedGameSnap.val();
      addedGame.name = addedGameSnap.key;
      //Add new game to game list except user's own game.
      const me = state.getMe();
      if(me.currentGame && me.currentGame.id === addedGame.name) view.addToGameListView(addedGame.name, true);
      else view.addToGameListView(addedGame.name, false);
    });
  };


  /** /games/[gameId]
   [gameId]: {
    challenger: { name: 'monad', choice: 'ROCK' }',
    challengee: { name: 'kami', choice: 'PAPER' },
    status: 'challenge'  or 'game', 'disconnected', 'quit'
    accepted: "accepted", "denied", "waiting"
   }
   */
    //This function is for listening changes on Game object in FireBase after create game
  game.watchGame = gameId => {
      gamesRef.child(gameId).onDisconnect().update({status: 'disconnected'}); //has to be canceled when game destroyed
      gamesRef.child(gameId).on('value', gameSnap => {
        // const oldCurrentGame = currentGame;
        const currentGame = gameSnap.val();
        const me = state.getMe();
        //game destroyed
        if(!currentGame) {
          console.log('GAME WAS DESTROYED, BUT THIS LINE IS NEVER REACHED. IMPLEMENTED THIS JUST FOR CHECKING FIREBASE off() function works.');
        }
        // game is alive
        else {
          if(currentGame.status === 'disconnected') {
            //case 1. if one user is disconnected while challenging
            if(currentGame.accepted === 'waiting') {
              destroyGame(gameId);
              console.log('OPPONENT IS DISCONNECTED WHILE CHALLENGING');
              //view update
              view.showMessage('Opponent is disconnected while challenging', 'alert-danger');
              view.hideWaitingChallengeesMsg();
              view.hideChallengedByMsg();

            }
            //case 2. one user is disconnected while playing rps
            else {
              destroyGame(gameId);
              console.log('OPPONENT IS DISCONNECTED WHILE PLAYING RPS');
              //view update: hide rps game ui
              view.showMessage('Opponent is disconnected while playing rps', 'alert-danger');
              view.hideRpsGameUI();
              view.updateGameMsg("");
              view.removeFromGameListView(gameId);
            }
          }
          else if(currentGame.status === 'challenge') {
            // case 3. one user denied challenge
            if(currentGame.accepted === 'denied') {
              destroyGame(gameId);
              console.log('ONE PLAYER DENIED CHALLENGE!');
              //view update
              view.showMessage('Challenge denied!', 'alert-warning');
              view.hideWaitingChallengeesMsg();
              view.hideChallengedByMsg();
            }
          }
          //case 4. one user quit game
          else if(currentGame.status === 'quit') {
            destroyGame(gameId);
            //view update: hide game ui
            view.showMessage('One of players has quit the game', 'alert-warning');
            view.hideRpsGameUI();
            view.updateGameMsg("");
            view.removeFromGameListView(gameId);
          }
          // Game in progress: currentGame.status === 'game'
          else {
            //case 5. one user accept challenge and game start
            if(currentGame.accepted === 'accepted') { //game start
              //remove user from waiting list of FireBase
              waitList.removeFromWaitingList(me.name);

              //watch chat messages
              chat.watchChatMessage(gameId, me.name);

              //view update
              view.showMessage('Challenge accepted! Game started!', 'alert-info');
              console.log('CHALLENGE ACCEPTED! GAME STARTED!');
              view.hideChallengedByMsg();
              view.hideWaitingChallengeesMsg();
              view.showRpsGameUI();

            }

            //case 6. user pick one of rock..scissor.
            else {
              let players = [];
              if(currentGame.challenger.name === me.name) { // me === challenger
                if(currentGame.challenger.choice) players.push(currentGame.challenger);
                if(currentGame.challengee.choice) players.push(currentGame.challengee);
              } else { // me === challengee
                if(currentGame.challengee.choice) players.push(currentGame.challengee);
                if(currentGame.challenger.choice) players.push(currentGame.challenger);
              }

              if(players.length === 0) {
                view.updateGameMsg("Choose one of choices!");
              }
              //only I(user) chose and waiting opponent's choice
              if(players.length === 1 && players[0].name && players[0].name === me.name) {
                //view update
                view.updateGameMsg("Waiting Opponent's choice");
              }
              //Both players picked their choice
              else if(players.length === 2) {
                const result = rpsLogic(players[0], players[1]);

                //view update
                view.updateGameMsg("");
                if(typeof result === 'object') {
                  if(result.winner.name === me.name) {
                    //number of win is negative number, so we can grab most wins player with firebase default ascending order
                    database.ref('users/' + me.name).update({win: me.win - 1, gamePlayed: me.gamePlayed + 1});
                    view.showResultMessage('win', me.name);
                    view.showOpponentChoice(result.loser.choice);
                  } else {
                    view.showResultMessage('lose');
                    view.showOpponentChoice(result.winner.choice);
                    database.ref('users/' + me.name).update({lose: me.lose + 1, gamePlayed: me.gamePlayed + 1});
                  }
                } else {
                  //draw
                  view.showResultMessage('draw');
                  view.showOpponentChoice(result);
                  database.ref('users/' + me.name).update({gamePlayed: me.gamePlayed + 1});
                }

                //After 3 secs, rps again!
                let i = 3;
                const interval = setInterval(() => {
                  if(i > 0) {
                    view.showTimeFrom(i--);
                  } else {
                    clearInterval(interval);
                    view.showTimeFrom("");

                    // new rps start
                    gamesRef.child(me.currentGame.id).transaction(currentGame => {
                      currentGame.challenger.choice = null;
                      currentGame.challengee.choice = null;
                      return currentGame;
                    });

                    //view update
                    view.hideResultMessage();
                    view.hideUserChoice();
                    view.hideOpponentChoice();

                  }
                }, 1000);
              }
            }
          }
        }
      });
    };


  return app;

})(APP || {});
