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
  const waitingListRef = database.ref("wait-list/");
  let me = {}; // object for user

  const initialize = () => {
    waitingListRef.on('child_added', waitingUserSnap => {
      //view update: add new user to waiting list
      const newUsername = waitingUserSnap.val();
      if (newUsername === me.name) view.addWaitingPlayerList(newUsername, true);
      else view.addWaitingPlayerList(newUsername);
    });
  };

  const addToWaitingList = name => {
    waitingListRef.child(name).set(name)
      .then(err => {
        if (err) console.log(err);
        //When user disconnected, delete user from waitingList
        database.ref("/wait-list/" + name).onDisconnect().remove();

        //watch user challenged by someone.
        database.ref("/users/" + name).on("value", userSnap => {
          if(userSnap.val().challengedBy) view.showChallengedMsg(userSnap.val().challengedBy);
        });
        //TODO: CANCEL ON
      });
  };

  const setChild = (ref, key, value) => {
    return ref.child(key).set(value);
  }

  const initialMe = {
    win: 0,
    lose: 0,
    gamePlayed: 0,
    challengedBy: null
  };

  const initializeMe = (name, stats = initialMe) => {
    me = stats;
    me.name = name;
  };

  //start game with name
  game.startGame = (name) => {
    database.ref("users/" + name).once('value')
      .then((userSnapshot) => {
        //This user have played before 
        if (userSnapshot.exists()) {
          view.showMessage("Welcome back " + name + ". Enjoy!", "alert-success");
          //save my info
          initializeMe(name, userSnapshot.val());
          //add user to waiting list
          addToWaitingList(name);
        } 
        //This user is new!
        else {
          //save user name in Firebase
          setChild(usersRef, name, {
              win: 0,
              lose: 0,
              gamePlayed: 0
            })
            .then(err => {
              if (err) console.log("User could not be saved. " + err);
              // save my info: name, lose, win, gameplayed
              initializeMe(name);

              //add user to waiting list
              addToWaitingList(name);
            });
        }


      });
  };

  game.challenge = (opponentName) => {
    //error handling
    if (!me.name) return view.showMessage("please set your name first.", "alert-danger");

    database.ref("/users/" + opponentName).update({challengedBy: me.name});


  };


  initialize();

  return app;

})(APP || {});