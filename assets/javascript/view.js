/**
 * Created by Hyungwu Pae on 3/6/17.
 */
var APP = (function (app) {
  const view = app.view = {};

  $(() => {
    view.nameForm = $('#name-form');
    view.startGameBtn = $('#start-game');
    view.nameInput = $('#name');
    view.waitingList = $('#waiting-players');
    view.acceptBtn = $('#accept-challenge-btn');
    view.denyBtn = $('#deny-challenge-btn');
    view.messageBox = $('#message-box');
    //render messages to user and delete(hide) in 5 secs
    view.showMessage = (msg, cssClass) => {
      view.messageBox
        .append(
          $('<div>')
          .addClass(cssClass + ' alert')
          .text(msg)
        );
      setTimeout(() => view.messageBox.empty(), 5000);
    };

    view.showChallengedMsg = (name) => {
      $('#challenger').text(name);
      $('#challenge-msg-box').show();
    };


    //waiting list rendering
    view.appendToWaitingList = (name, me) => {
      const classToAdd = me ?
        'btn btn-default disabled waiting-player' : 'btn btn-success waiting-player';
      view.waitingList.append($('<button>').addClass(classToAdd).text(name));
    };
    view.removeFromWaitingList = (name) => {
      view.waitingList.children("button").each(function (idx) {
        if($(this).text() === name) $(this).remove();
      });
    };


    //my stats rendering
    view.renderMyStat = (me) => {
      $("#win").text(me.win);
      $("#lose").text(me.lose);
      $("#game-played").text(me.gamePlayed);
    };

    view.hideChallengeMsg = () => {
      $('#challenge-msg-box').hide();
    };

    view.addToGameListView = () => {

    };

    view.destroyGameView = () => {

    }

  });







  return app;

})(APP || {});
