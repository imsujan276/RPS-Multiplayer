/**
 * Created by Hyungwu Pae on 3/6/17.
 */
var APP = (function (app) {
  // Initialize Firebase
  firebase.initializeApp({
    apiKey: "AIzaSyDbXYbNoD0F7VjToB1i7PNnc2acDeN4cko",
    authDomain: "rps-monad.firebaseapp.com",
    databaseURL: "https://rps-monad.firebaseio.com",
    storageBucket: "rps-monad.appspot.com",
    messagingSenderId: "797189510342"
  });

  const view = app.view; //view object of RPS game
  const game = app.game = {};
  const database = firebase.database();
  const usersRef = database.ref("users/");
  const gamesRef = database.ref("games/");
  const waitingListRef = database.ref("wait-list/");
  let me = { //local status of user
    win: 0,
    lose: 0,
    gamePlayed: 0,
    challengedBy: null
  };

  const initialize = () => {
    waitingListRef.on('child_added', waitingUserSnap => {
      //view update: add new user to waiting list
      const newUsername = waitingUserSnap.val();
      if (newUsername === me.name) view.appendToWaitingList(newUsername, true);
      else view.appendToWaitingList(newUsername);
    });

    waitingListRef.on('child_removed', oldWaitingUserSnap => {
      view.removeFromWaitingList(oldWaitingUserSnap.val());
    })
  };

  const setChild = (ref, key, value) => {
    return ref.child(key).set(value);
  };

  const updateMe = (meFromDB) => {
    me = meFromDB;
  };

  const generateRandomGameName = (length=4) => {
    let gameName = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( let i=0; i < length; i++ )
      gameName += possible.charAt(Math.floor(Math.random() * possible.length));
    return gameName;
  };

  //start game with name
  game.startGame = (name) => {
    database.ref("users/" + name).once('value')
      .then((userSnapshot) => {
        //This user have played before 
        if (userSnapshot.exists()) {
          view.showMessage("Welcome back " + name + ". Enjoy!", "alert-success");
          //save my info
          updateMe(userSnapshot.val());
          //add user to waiting list
          addToWaitingList(name);
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
              if (err) console.log("User could not be saved. " + err);
              // save my info: name, lose, win, gameplayed
              updateMe({
                name: name,
                win: 0,
                lose: 0,
                gamePlayed: 0
              });

              //add user to waiting list
              addToWaitingList(name);
            });
        }


      });
  };


  const addToWaitingList = name => {
    waitingListRef.child(name).set(name)
      .then(err => {
        if (err) console.log(err);
        //When user disconnected, delete user from waitingList and delete user's temporary data
        database.ref("wait-list/" + name).onDisconnect().remove();
        database.ref("users/" + name).onDisconnect().update({challengedBy: null, challengeTo: null, currentGame: null})

        //start to watch FB user data and if something changes, sync with local data
        // (is it necessary to sync with local data?)
        watchUser(name);
      });
  };

  const watchUser = name => {
    //watch user data in FB
    database.ref("users/" + name).on("value", userSnap => {
      //show user "challenged by someone" message
      const challengedBy = userSnap.val().challengedBy;
      const currentGame = userSnap.val().currentGame;

      //if user is challenged by someone, update view and update me object.
      if(challengedBy) {
        view.showChallengedMsg(userSnap.val().challengedBy);
      }

      //if user entered game
      if(currentGame) {
        //Because user entered game, remove user from waiting list and remove challengeTo, challengedBy property
        waitingListRef.child(name).remove(); // don't need to clean onDisconnect queue, because user removed from wait list
        database.ref("users/" + name).onDisconnect().cancel(); // need to cancel onDisconnect
        database.ref("users/" + name).update({challengedBy: null, challengedTo: null});

        //delete game when one of player is disconnected
        //TODO: onDisconnect off????? when users end current game and enter waiting list
        database.ref("games/" + currentGame).onDisconnect().remove();

        //watch game
        watchGame(currentGame);
      }

      //sync local me object with firebase user data
      updateMe(userSnap.val());

      //update view: render user stats
      view.renderMyStat(me)
    });
  };

  const watchGame = gameName => {
    database.ref("games/" + gameName).on("value", gameSnap => {
      console.log("WOW DESTROYED GAME");
      console.log(gameSnap.val());
      if(!gameSnap.val()) {
        database.ref("users/" + me.name).update({currentGame: null});
        view.destroyGameView();
      }
    })
  };


  /**
   * CHALLENGER calls following function
   */
  game.challenge = (challengeeName) => {
    //error handling
    if (!me.name) return view.showMessage("please set your name first.", "alert-danger");

    //set challengee's challengedBy as challenger name send challenge message to opponent
    database.ref("users/" + challengeeName).update({challengedBy: me.name});
    database.ref("users/" + me.name).update({challengedTo: challengeeName});
  };


  /**
   * CHALLENGEE calls following function.
   */
  const addUsersToCurrentGame = (challengee, challenger) => {
    const gameName = generateRandomGameName();
    const players = { challengee, challenger};
    gamesRef.child(gameName).set(players)
      .then(err => {
        if(err) console.log(err);

        //update users with game name.
        database.ref("users/" + challengee).update({currentGame: gameName});
        database.ref("users/" + challenger).update({currentGame: gameName});

        //view update: hide challenge message
        if(me.name === challengee) view.hideChallengeMsg();
      });
  };

  game.acceptChallenge = () => {
    addUsersToCurrentGame(me.name, me.challengedBy);
  };


  //initialize game.
  initialize();

  return app;

})(APP || {});