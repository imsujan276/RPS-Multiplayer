/**
 * Created by Hyungwu Pae on 3/6/17.
 */
var APP = (function (app) {
  // Initialize Firebase
  firebase.initializeApp({
    apiKey: 'AIzaSyDbXYbNoD0F7VjToB1i7PNnc2acDeN4cko',
    authDomain: 'rps-monad.firebaseapp.com',
    databaseURL: 'https://rps-monad.firebaseio.com',
    storageBucket: 'rps-monad.appspot.com',
    messagingSenderId: '797189510342'
  });

  const view = app.view; //view object of RPS game
  const rpsLogic = app.rps;
  const game = app.game = {};
  const database = firebase.database();
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
    })

  };

  const setChild = (ref, key, value) => {
    return ref.child(key).set(value);
  };

  const setMe = (meFromFB) => {
    me = meFromFB;
  };

  const generateRandomGameName = (length=4) => {
    let gameName = "";
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for( let i=0; i < length; i++ )
      gameName += possible.charAt(Math.floor(Math.random() * possible.length));
    return gameName;
  };

  //start game with name
  game.startGame = (name) => {
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
            .then(err => {
              if (err) console.log('User could not be saved. ' + err);
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


  const addToWaitingList = name => {
    waitingListRef.child(name).set(name)
      .then(err => {
        if (err) console.log(err);
        console.log("USER HAS BEEN ADDED TO WAITING LIST");
        //When user disconnected, delete user from waitingList and delete user's temporary data
        database.ref('wait-list/' + name).onDisconnect().remove();
        database.ref('users/' + name).onDisconnect().update({challengedBy: null, challengedTo: null, currentGame: null})

        //start to watch FB user data and if something changes, sync with local data
        // (is it necessary to sync with local data?)
        watchUser(name);
      });
  };

  //This function is for watching user object change on FireBase
  const watchUser = name => {
    //watch user data in FB
    database.ref('users/' + name).on('value', userSnap => {
      //show user 'challenged by someone' message
      const challengedBy = userSnap.val().challengedBy;
      const currentGame = userSnap.val().currentGame;

      //if user is challenged by someone, update view and update me object.
      if(challengedBy && !currentGame) {
        console.log("USER IS CHALLENGED BY " + challengedBy);

        //view update: show challenge message to challengee
        view.showChallengedMsg(userSnap.val().challengedBy);

        //listen to challenger. If challenger cancel challenge, user go back to waiting room.
        database.ref('users/' + challengedBy).on("value", snap => {
          const challenger = snap.val();

          if(me.challengedBy && !challenger.challengedTo) {
            database.ref('users/' + me.name).update({challengedBy: null})
              .then(err => {
                if(err) console.log(err);

                console.log("CHALLENGE IS CANCELED.");

                //detach listener
                database.ref('users/' + challengedBy).off();

                //view update: hide challenge message, user is still in the waiting list
                view.hideChallengeMsg();
              })
          }
        });


      }

      //if user entered game
      else if(!me.currentGame && currentGame) {
        console.log("USER ENTERED GAME!!");
        //Because user entered game, remove user from waiting list
        waitingListRef.child(name).remove(); // don't need to clean onDisconnect queue, because user removed from wait list

        //delete game when one of player is disconnected
        database.ref('games/' + currentGame).onDisconnect().remove();

        //view update: rps game view
        view.showRpsGameUI();
        //view update: add game to game list view
        view.addToGameListView(currentGame, true);

        //watch game for future change
        watchGame(currentGame);

      }

      //If game room is destroyed //TODO what???
      if(me.currentGame && !currentGame) {

      }

      //sync local me object with firebase user data
      setMe(userSnap.val());

      //update view: render user stats
      view.renderMyStat(me)
    });
  };

  //This function is for listening changes on Game object in FireBase.
  const watchGame = gameName => {
    database.ref('games/' + gameName).on('value', gameSnap => {
      const game = gameSnap.val();
      //game destroyed
      if(!game) {
        database.ref('users/' + me.name).update({currentGame: null, challengedBy: null, challengedTo: null});
        console.log("GAME HAS TO BE DESTROYED");

        //detach value change listener for every events
        database.ref('games/' + gameName).off();

        //add user to waiting list again.
        addToWaitingList(me.name);

        //view update: hide rps game ui
        view.hideRpsGameUI();
        view.removeFromGameListView(gameName);
      } else {
        let players = [];
        Object.keys(game).forEach(name => {
          if(game[name].choice) players = [ ...players, {name, choice: game[name].choice}];
        });
        if(players.length === 2) {
          const result = rpsLogic(players[0], players[1]);

          //view update
          if(typeof result === 'object') {
            if(result.winner.name === me.name) {
              database.ref('users/' + me.name).update({win: me.win + 1, gamePlayed: me.gamePlayed + 1});
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
            database.ref('users/' + me.name).update({lose: me.lose + 1, gamePlayed: me.gamePlayed + 1});
          }

        }

      }

    });
  };


  /**
   * CHALLENGER calls following function
   */
  game.challenge = (challengeeName) => {
    //If you click yourself, do nothing;
    if (me.name === challengeeName) return;

    //If your didn't set name, show proper message. This situation rarely happens.
    if (!me.name) return view.showMessage('please set your name first.', 'alert-danger');

    //If user is in the middle of game or sent challenge to another player, user can't challenge again
    if(me.currentGame || me.challengedTo) return view.showMessage('You can\'t challenge while gaming or listening answer from challengee', 'alert-danger');

    //else
    database.ref('users/' + challengeeName).once('value')
      .then(snapshot => {
        const challengee = snapshot.val();
        //if opponent player is playing currently, user can't challenge. This situation is rare.
        if(challengee && challengee.currentGame) {
          view.showMessage('You can\'t challenge' + challengeeName + 'who is already in game', 'alert-danger');
        }
        else {
          //set challengee's challengedBy as challenger name send challenge message to opponent
          database.ref('users/' + me.name).update({challengedTo: challengeeName})
            .then(err => {
              if(err) console.log(err);

              console.log("USER HAS CHALLENGED TO " + challengeeName);
              //view update: show "waiting opponent's reponse"
              view.showWaitingMsg(challengeeName);

              database.ref('users/' + challengeeName).on('value', snap => {
                const challengee = snap.val();
                //If the user didn't response challenge due to disconnect
                if(!challengee.challengedBy && me.challengedTo) { //디스커넥트 아니더라도 이게 불릴수있다!!@#
                  // cancel the challenge and stop listening value change of challengee
                  database.ref('users/' + me.name).update({challengedTo: null})
                    .then(err => {
                      if(err) console.log(err);

                      console.log("CHALLENGE IS CANCELED.");

                      database.ref('users/' + challengeeName).off(); //detach listener

                      //view update: hide waiting message, user is still in the waiting list
                      view.hideWaitingMsg();
                    });

                }
              });

            });
          database.ref('users/' + challengeeName).update({challengedBy: me.name});
        }
      });
  };


  /**
   * CHALLENGEE calls following function.
   */
  const addUsersToCurrentGame = (challengee, challenger) => {
    const gameName = generateRandomGameName();
    const value = {};
      value[challengee] = { choice: null, role: 'challengee' };
      value[challenger] = { choice: null, role: 'challenger' };
    gamesRef.child(gameName).set(value)
      .then(err => {
        if(err) console.log(err);

        //update users with gameName.
        database.ref('users/' + challengee).update({currentGame: gameName, challengedBy: null});
        database.ref('users/' + challenger).update({currentGame: gameName, challengedTo: null});

        //view update: hide challenge message
        view.hideChallengeMsg();

      });
  };

  game.acceptChallenge = () => {
    addUsersToCurrentGame(me.name, me.challengedBy);
  };

  game.denyChallenge = () => {

    //reset user's challenge related property
    database.ref('users/' + me.challengedBy).update({challengedTo: null});
    database.ref('users/' + me.name).update({challengedBy: null});

    //view update
    view.hideChallengeMsg();
  };

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