/**
 * Created by Hyungwu Pae on 3/6/17.
 */
var APP = (function (app) {

  const view = app.view; //view object of RPS game
  const rpsLogic = app.rps;
  const ranker = app.ranker;
  const game = app.game = {};
  const database = app.database;

  const usersRef = database.ref('users/');
  const gamesRef = database.ref('games/');
  const waitingListRef = database.ref('wait-list/');
  let me = { //local status of user
    win: 0,
    lose: 0,
    gamePlayed: 0
  };

  const initialize = () => {
    //When User type name, user is added to waiting list. Following is to watch an added new user
    waitingListRef.on('child_added', waitingUserSnap => {
      //view update: add new user to waiting list
      const user = waitingUserSnap.val();
      if (user === me.name) view.appendToWaitingList(user, true);
      else view.appendToWaitingList(user);
    });

    waitingListRef.on('child_removed', oldWaitingUserSnap => {
      view.removeFromWaitingList(oldWaitingUserSnap.val());
    });

    gamesRef.on('child_added', addedGameSnap => {
      const game = addedGameSnap.val();
      game.name = addedGameSnap.key;
      //Add new game to game list except user's own game.
        //I used setTimeout function because the delay to show other games are not critical to user
        if(me.currentGame && me.currentGame.id === game.name) view.addToGameListView(game.name, true);
        else view.addToGameListView(game.name, false);
    });

    //get most wins list
    ranker.initialize();
  };

  const generateRandomGameName = (length=4) => {
    let gameName = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for( let i=0; i < length; i++ )
      gameName += possible.charAt(Math.floor(Math.random() * possible.length));
    return gameName;
  };

  //start game with name
  game.setUsername = (name) => {
    //if user has name, this is mistake. This situation is rare, because we hided name form.
    if(me.name) return view.showMessage('You already have name!', 'alert-danger');
    //else
    usersRef.child(name).onDisconnect().update({currentGame: null});
    usersRef.child(name).once('value')
      .then((userSnapshot) => {
        //This user have played before 
        if (userSnapshot.exists()) {
          view.showMessage('Welcome back ' + name + '. Enjoy!', 'alert-success');
          //save my info
          me = userSnapshot.val();
          //add user to waiting list
          addToWaitingList(name);
        }
        //This user is new!
        else {
          //save user name in Firebase
          usersRef.child(name).set({
            name: name, win: 0, lose: 0, gamePlayed: 0
          })
            .then(() => {
              // save my info: name, lose, win, gameplayed
              me = ({
                name: name, win: 0, lose: 0, gamePlayed: 0
              });

              //add user to waiting list
              addToWaitingList(name);
            });
        }
      });

    //start watching user
    watchMe(name);
  };

  //add user to waiting list
  const addToWaitingList = myName => {
    waitingListRef.child(myName).onDisconnect().remove();
    waitingListRef.child(myName).set(myName)
      .then(() => {
        console.log('USER HAS BEEN ADDED TO WAITING LIST');
        //view update: hide form
        view.hideNameForm();
      });
  };

  //This function is for watching user object change on FireBase
  const watchMe = myName => {
    //watch user data in FB
    usersRef.child(myName).on('value', userSnap => {
      const oldMe = me;
      if(userSnap.val()) {
        me = userSnap.val();
      }

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
        watchGame(me.currentGame.id);

      }
      else {
        //update view: render user stats
        view.renderMyStat(me);
      }
    });
  };


  const destroyGame = (gameId) => {
    //detach value change listener for every events and cancel queued onDisconnect
    gamesRef.child(gameId).off();
    gamesRef.child(gameId).onDisconnect().cancel();
    //set user's current game as null
    usersRef.child(me.name).update({currentGame: null});

    //add user to waiting list again.
    addToWaitingList(me.name);

    //destroy game
    gamesRef.child(gameId).remove();

  };

  /** /games/[gameId]
   [gameId]: {
    challenger: { name: 'monad', choice: 'ROCK' }',
    challengee: { name: 'kami', choice: 'PAPER' },
    status: 'challenge', 'game', 'opponent left', 'disconnected'
    accepted: "accepted", "denied", "waiting"
   }
   */
  //This function is for listening changes on Game object in FireBase after create game
  const watchGame = gameId => {
    gamesRef.child(gameId).onDisconnect().update({status: 'disconnected'}); //has to be canceled when game destroyed
    gamesRef.child(gameId).on('value', gameSnap => {
      // const oldCurrentGame = currentGame;
      const currentGame = gameSnap.val();
      //game destroyed
      if(!currentGame) {
        console.log('GAME WAS DESTROYED, BUT THIS LINE IS NEVER REACHED. CHECKING off() function works.');
      }
      // game is alive
      else {
        if(currentGame.status === 'disconnected') {
          //case 1. if one user is disconnected while challenging
          if(currentGame.accepted === 'waiting') {
            destroyGame(gameId);
            console.log('OPPONENT IS DISCONNECTED WHILE CHALLENGING');
            //view update
            view.hideWaitingChallengeesMsg();
            view.hideChallengedByMsg();

          }
          //case 2. one user is disconnected while playing rps
          else {
            destroyGame(gameId);
            console.log('OPPONENT IS DISCONNECTED WHILE PLAYING RPS');
            //view update: hide rps game ui
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
            view.hideWaitingChallengeesMsg();
            view.hideChallengedByMsg();
          }
        }
        // Game in progress: currentGame.status === 'game'
        else {
          //case 4. one user accept challenge and game start
          if(currentGame.accepted === 'accepted') { //game start
            //view update
            view.hideChallengedByMsg();
            view.hideWaitingChallengeesMsg();
            view.showRpsGameUI();
          }
          //case 5. user pick one of rock..scissor.
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

  /**
   * CHALLENGER calls following function
   */
  game.challenge = challengeeName => {
    //If you click yourself, do nothing;
    if(me.name === challengeeName) return;

    //else if your didn't set name, show proper message. This situation rarely happens.
    if (!me.name) return view.showMessage('please set your name first.', 'alert-danger');

    //else if user is in the middle of game or sent challenge to another player, user can't challenge again
    if(me.currentGame) return view.showMessage('You can\'t challenge while gaming or challenging', 'alert-danger');

    const gameId = generateRandomGameName();
    const challenger = {name: me.name, choice: null};
    const challengee = {name: challengeeName, choice: null};

    //make game =>  status: 'challenge'
    gamesRef.child(gameId).set({challenger, challengee, status: 'challenge', accepted: 'waiting'})
      .then(() => {
        usersRef.child(me.name).update({currentGame: {id: gameId, role: 'challenger', opponent: challengeeName}})
        usersRef.child(challengeeName).update({currentGame: {id: gameId, role: 'challengee', opponent: me.name}});
      });
  };


  /**
   * CHALLENGEE calls following functions: accept, deny.
   */
  game.acceptChallenge = () => {
    const gameId = me.currentGame.id;
    gamesRef.child(gameId).update({status: 'game', accepted: 'accepted'});
  };

  game.denyChallenge = () => {
    const gameId = me.currentGame.id;
    gamesRef.child(gameId).update({status: 'challenge', accepted: 'denied'});
  };


  /**
   * Function for Both Challenger and Challengee
   */
  game.chooseOneOfRPS = rps => {
    // //update user choice
    let update = { };
    update[me.currentGame.role + '/choice'] = rps;
    update.accepted = null;
    database.ref('games/' + me.currentGame.id).update(update);

    //WHICH ONE IS PROPER WAY?
    // //update user choice using transaction.
    // database.ref('games/' + me.currentGame).transaction(currentVal => {
    //   const role = currentVal[me.name].role;
    //   update[me.name] = { choice: rps, role: role };
    //   return Object.assign(currentVal, update)
    // });

    //view update: show user's choice
    view.showUserChoice(rps);
  };

  //initialize game.
  initialize();

  return app;

})(APP || {});