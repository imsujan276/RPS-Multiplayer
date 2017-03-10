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
    gamePlayed: 0,
    challengedBy: null
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
      setTimeout(() => {
        //There may be another way to check if this game is user's own game or not,
        //I used setTimeout function because the delay to show other games are not critical to user.
        if(me.currentGame !== game.name) view.addToGameListView(game.name, false);
      }, 2000);
    });

    ranker.initialize();



  };

  const setChild = (ref, key, value) => {
    return ref.child(key).set(value);
  };

  const setMe = (meFromFB) => {
    me = meFromFB;
    console.log('Me updated');
    console.log(me);
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
    database.ref('users/' + name).once('value')
      .then((userSnapshot) => {
        //This user have played before 
        if (userSnapshot.exists()) {
          view.showMessage('Welcome back ' + name + '. Enjoy!', 'alert-success');
          //save my info
          setMe(userSnapshot.val());
          //add user to waiting list
          addToWaitingList(name);

          //view update: hide form
          view.hideNameForm();

        }
        //This user is new!
        else {
          //save user name in Firebase
          setChild(usersRef, name, {
            name: name, //same as key, looks redundant but need to simplify syncing between local and Firebase
            win: 0,
            lose: 0,
            gamePlayed: 0
          })
            .then(() => {
              // save my info: name, lose, win, gameplayed
              setMe({
                name: name,
                win: 0,
                lose: 0,
                gamePlayed: 0
              });

              //add user to waiting list
              addToWaitingList(name);

              //view update: hide form
              view.hideNameForm();
            });
        }


      });
  };

  // FOR BOTH CHALLENGEE AND CHALLENGER
  const addToWaitingList = myName => {
    waitingListRef.child(myName).set(myName)
      .then(() => {
        console.log('USER HAS BEEN ADDED TO WAITING LIST');
        //change offline to false;
        database.ref('users/' + myName).update({offline: false});

        //on disconnect update user object
        database.ref('users/' + myName).onDisconnect().update({challengedBy: null, challengedTo: null, currentGame: null, offline: true})


        //When user disconnected, delete user from waitingList and delete user's temporary data
        database.ref('wait-list/' + myName).onDisconnect().remove();

        //start to watch FB user data and if something changes, sync with local data
        // (is it necessary to sync with local data?)
        watchUser(myName);
      });
  };


  //This function is for watching user object change on FireBase
  const watchUser = myName => {
    //watch user data in FB
    database.ref('users/' + myName).on('value', userSnap => {
      //show user 'challenged by someone' message
      const challengedBy = userSnap.val().challengedBy;
      const currentGame = userSnap.val().currentGame;

      //if user is challenged by someone, update view and update me object.
      if(challengedBy && !currentGame) {
        console.log('USER IS CHALLENGED BY ' + challengedBy);

        //view update: show challenge message to challengee
        view.showChallengedByMsg(userSnap.val().challengedBy);

        //listen to challenger. If challenger cancel challenge, user go back to waiting room.
        database.ref('users/' + challengedBy).on('value', snap => {
          const challenger = snap.val();

          if(me.challengedBy && !challenger.challengedTo) {
            database.ref('users/' + me.name).update({challengedBy: null})
              .then(() => {

                console.log('CHALLENGE IS CANCELED.');

                //detach listener
                database.ref('users/' + challengedBy).off();

                //view update: hide challenge message, user is still in the waiting list
                view.hideChallengedByMsg();
                view.showMessage('Opponent has left the game!', 'alert-danger');
              })
          }
        });


      }

      //When user just entered game
      else if(!me.currentGame && currentGame) {
        console.log('USER ENTERED GAME!!');

        //view update
        view.hideChallengedByMsg();
        view.hideWaitingChallengeesMsg();

        //Because user entered game, remove user from waiting list
        waitingListRef.child(myName).remove(); // don't need to clean onDisconnect queue, because user removed from wait list

        //delete game when one of player is disconnected
        database.ref('games/' + currentGame).onDisconnect().remove();

        //view update: rps game view
        view.showRpsGameUI();
        //view update: add game to game list view
        view.addToGameListView(currentGame, true);

        //watch game for future change
        watchGame(currentGame);

      }

      //sync local me object with firebase user data
      setMe(userSnap.val());

      //update view: render user stats
      view.renderMyStat(me)
    });
  };

  //This function is for listening changes on Game object in FireBase after create game
  const watchGame = gameName => {
    database.ref('games/' + gameName).on('value', gameSnap => {
      const game = gameSnap.val();
      //game destroyed
      if(!game) {
        database.ref('users/' + me.name).update({currentGame: null, challengedBy: null, challengedTo: null});
        console.log('GAME HAS TO BE DESTROYED');

        //detach value change listener for every events
        database.ref('games/' + gameName).off();

        //add user to waiting list again.
        addToWaitingList(me.name);

        //view update: hide rps game ui
        view.hideRpsGameUI();
        view.removeFromGameListView(gameName);
      }
      else {
        let players = [];
        Object.keys(game).forEach(name => {
          if(game[name].choice) players = [ ...players, {name, choice: game[name].choice}];
        });
        if(players.length === 0) {
          console.log("HERE");
         view.updateGameMsg("Choose one of choices!");
        }
        //only I(user) chose and waiting opponent's choice
        if(players.length === 1 && players[0].name && players[0].name === me.name) {
          console.log(me.name);
          console.log(players[0].name);
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
              database.ref('games/' + me.currentGame).transaction(currentVal => {
                Object.keys(currentVal).forEach(name => {
                  currentVal[name].choice = null;
                });
                return currentVal;
              });

              //view update
              view.hideResultMessage();
              view.hideUserChoice();
              view.hideOpponentChoice();

            }
          }, 1000);
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
    if(me.currentGame || me.challengedTo) return view.showMessage('You can\'t challenge while gaming or listening answer from challengee', 'alert-danger');

    //else
    database.ref('users/' + challengeeName).update({challengedBy: me.name});
    database.ref('users/' + me.name).update({challengedTo: me.name});
    view.showWaitingChallengeesMsg(challengeeName);
    console.log('USER HAS CHALLENGED TO ' + challengeeName);

    //If a challengee went offline, cancel challenge
    database.ref('users/' + challengeeName).on('value', snap => {
      if(snap.val() && snap.val().offline) {
        database.ref('users/' + me.name).update({challengedTo: null})
          .then(() => {
            console.log('CHALLENGE IS CANCELED.');

            //view update: hide waiting message, user is still in the waiting list
            view.hideWaitingChallengeesMsg();

            //we don't have to listen to change of challengee any more. Just listen to game object change
            database.ref('users/' + challengeeName).off(); //detach listener
          });
      }
    });



  };


  /**
   * CHALLENGEE calls following functions: accept, deny.
   */
  game.acceptChallenge = () => {
    const challenger = me.challengedBy;
    const gameName = generateRandomGameName();

    const value = {};
    value[me.name] = { choice: null, role: 'challengee' };
    value[challenger] = { choice: null, role: 'challenger' };

    gamesRef.child(gameName).set(value)
      .then(() => {

        //update users with gameName.
        database.ref('users/' + me.name).update({currentGame: gameName, challengedBy: null});
        database.ref('users/' + challenger).update({currentGame: gameName, challengedTo: null});
      });
  };

  //TODO: DENY NOT WORK VIEW
  game.denyChallenge = () => {

    //reset user's challenge related property
    database.ref('users/' + me.challengedBy).update({challengedTo: null});
    database.ref('users/' + me.name).update({challengedBy: null});

    //view update
    view.hideChallengedByMsg();
  };


  /**
   * Function for Both Challenger and Challengee
   */
  game.chooseOneOfRPS = rps => {
    // //update user choice
    let update = { };
    update[me.name + '/choice'] = rps;
    database.ref('games/' + me.currentGame).update(update);

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