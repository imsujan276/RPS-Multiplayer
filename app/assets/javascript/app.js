/**
 * Created by Hyungwu Pae on 3/6/17.
 */
var APP = (function (app) {

  const view = app.view; //view object of RPS game
  const ranker = app.ranker;
  const user = app.user;
  const chat = app.chat;
  const state = app.state;
  const waitList = app.waitList;
  const game = app.game;

  const database = app.database;

  const usersRef = database.ref('users/');
  const gamesRef = database.ref('games/');
  const waitingListRef = database.ref('wait-list/');
  const chatRoomsRef = database.ref('chat-rooms');

  const initialize = () => {
    //When User type name, user is added to waiting list => view update
    waitList.watchAddedPlayer();

    //watch a player removed from waiting list => view update
    waitList.watchRemovedPlayer();

    //watch addedGame
    game.watchAddedGame();

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
  const setUsername = (name) => {
    const me = state.getMe();
    //if user has name, this is mistake. This situation is rare, because we hided name form.
    if(me.name) return view.showMessage('You already have name!', 'alert-danger');

    //else
    usersRef.child(name).onDisconnect().update({currentGame: null});

    Promise.all([usersRef.child(name).once('value'), waitingListRef.child(name).once('value')])
      .then(([userSnap, waitingSnap]) => {
      if(userSnap.exists()) { //existing user, don't need password.
        if(waitingSnap.exists()) {
          view.showMessage('You are already online, check another tab of your browser.', 'alert-danger');
        } else {
          view.showMessage('Welcome back ' + name + '. Enjoy!', 'alert-success');
          //save my info
          state.setMe(userSnapshot.val());
          //start watching user
          user.watchMe(name);
          //add user to waiting list
          waitList.addToWaitingList(name);
        }
      } else { //This user is new!
        //save user name in Firebase
        usersRef.child(name).set({
          name: name, win: 0, lose: 0, gamePlayed: 0
        })
          .then(() => {
            // save my info: name, lose, win, gameplayed
            state.setMe({
              name: name, win: 0, lose: 0, gamePlayed: 0
            });
            //start watching user
            user.watchMe(name);

            //add user to waiting list
            waitList.addToWaitingList(name);
          });
      }
    });
  };





  /**
   * CHALLENGER calls challenge function
   */
  const challenge = challengeeName => {
    const me = state.getMe();

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
        usersRef.child(me.name).update({currentGame: {id: gameId, role: 'challenger', opponent: challengeeName}});
        usersRef.child(challengeeName).update({currentGame: {id: gameId, role: 'challengee', opponent: me.name}});
      });
  };


  /**
   * CHALLENGEE calls following functions: accept, deny.
   */
  const acceptChallenge = () => {
    const me = state.getMe();
    console.log(me);
    const gameId = me.currentGame.id;
    gamesRef.child(gameId).update({status: 'game', accepted: 'accepted'});

    //create chat room for this game
    chatRoomsRef.child(gameId).set({});
    chatRoomsRef.child(gameId).onDisconnect().remove();

  };

  const denyChallenge = () => {
    const gameId = me.currentGame.id;
    gamesRef.child(gameId).update({status: 'challenge', accepted: 'denied'});
  };

  //user chose one of ROCK, PAPER, SCISSOR.
  const chooseOneOfRPS = rps => {
    const me = state.getMe();

    //update user choice
    let update = { };
    update[me.currentGame.role + '/choice'] = rps;
    update.accepted = null;
    database.ref('games/' + me.currentGame.id).update(update);

    //view update: show user's choice
    view.showUserChoice(rps);
  };

  //user quit the game
  const quitGame = () => {
    const gameId = state.getMe().currentGame.id;
    gamesRef.child(gameId).update({status: 'quit'});
  };

  const submitMsg = msg => {
    const me = state.getMe();
    const newMsgRef = chatRoomsRef.child(me.currentGame.id).push();
    newMsgRef.set({
      name: me.name,
      message: msg,
      timestamp: +Date.now()
    })
  };

  //initialize app
  initialize();

  //Overwrite existing app object and Expose API
  return {
    setUsername,
    challenge,
    acceptChallenge,
    denyChallenge,
    chooseOneOfRPS,
    quitGame,
    submitMsg
  };

})(APP);