/**
 * Created by Hyungwu Pae on 3/14/17.
 */
var APP = (function (app) {

  const database = app.database;
  const state = app.state;
  const view = app.view;

  const waitingListRef = database.ref('wait-list/');

  const waitList = app.waitList ? app.waitList : app.waitList = {};

  waitList.watchAddedPlayer = () => {
    waitingListRef.on('child_added', waitingUserSnap => {
      //view update: add new user to waiting list
      const user = waitingUserSnap.val();
      if (user === state.getMe().name) view.appendToWaitingList(user, true);
      else view.appendToWaitingList(user);
    });
  };

  waitList.watchRemovedPlayer = () => {
    waitingListRef.on('child_removed', oldWaitingUserSnap => {
      const name = oldWaitingUserSnap.val();
      view.removeFromWaitingList(name);
    });
  };

  //add user to waiting list
  waitList.addToWaitingList = myName => {
    waitingListRef.child(myName).onDisconnect().remove();
    waitingListRef.child(myName).set(myName)
      .then(() => {
        console.log('USER HAS BEEN ADDED TO WAITING LIST');
        //view update: hide form
        view.hideNameForm();
      });
  };

  //remove user from waiting list
  waitList.removeFromWaitingList = name => {
    waitingListRef.child(name).remove();
  };

  return app;

})(APP || {});
