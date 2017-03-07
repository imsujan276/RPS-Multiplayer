/**
 * Created by Hyungwu Pae on 3/6/17.
 */
var RPS = (function (rps) {
  // Initialize Firebase
  firebase.initializeApp({
    apiKey: "AIzaSyDbXYbNoD0F7VjToB1i7PNnc2acDeN4cko",
    authDomain: "rps-monad.firebaseapp.com",
    databaseURL: "https://rps-monad.firebaseio.com",
    storageBucket: "rps-monad.appspot.com",
    messagingSenderId: "797189510342"
  });
  const database = firebase.database();
  const usersRef = database.ref("users/");
  const startGame = (name) => {
    database.ref("users/" + name).once('value').then((userSnapshot) => {
      //show already taken name message
      if(userSnapshot.exists()) {
        view.showAlreadyTakenMsg();
        return;
      }

      // hide alreadyTaken message and add user to Firebase
      view.hideAlreadyTakenMsg();
      usersRef.child(name)
        .set({
          win: 0,
          lose: 0,
          gamePlayed: 0
        })
        .then(err => {
          if(err) console.log("User could not be saved. " + err);
          view.addWaitingPlayerList(name);


        });
    });



  };

  const view = rps.view;
  console.log(rps);

  $(() => {
    //When enter key pressed, startGame prevent for submit with enter key
    $("#name-form").on("submit", (e) => {
      e.preventDefault;
      startGame(view.nameInput.val().trim());
      return false;
    });
    // view.startGameBtn.on("click", (ev) => startGame(view.nameInput.val().trim()));


  });




})(RPS || {});
