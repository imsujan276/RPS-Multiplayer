/**
 * Created by Hyungwu Pae on 3/6/17.
 */
var APP = (function (app) {
  const database = app.database;
  const chat = app.chat = {};
  const view = app.view;
  const chatRoomsRef = database.ref('chat-rooms');

  chat.watchChatMessage = (gameId, myName) => {

    chatRoomsRef.child(gameId).on('child_added', snap => {
      view.appendChatMsg(snap.val(), myName);
    });
  };




  return app;

})(APP || {});
