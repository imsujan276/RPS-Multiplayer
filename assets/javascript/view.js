/**
 * Created by Hyungwu Pae on 3/6/17.
 */
var APP = (function (app) {
  const view = app.view = {};

  $(() => {
    const nameForm = $('#name-form');
    // const startGameBtn = $('#start-game');
    // const nameInput = $('#name-input');
    const waitingList = $('#waiting-players');
    // const acceptBtn = $('#accept-challenge-btn');
    // const denyBtn = $('#deny-challenge-btn');
    const messageBox = $('#message-box');
    const gameBox = $('#game-box');
    const topRankers = $('#top-rankers');

    //render messages to user and delete(hide) in 5 secs
    view.showMessage = (msg, cssClass) => {
      const message = $('<div>').addClass(cssClass + ' alert').text(msg);
      messageBox
        .append(message);
      setTimeout(() => message.remove(), 5000);
    };


    //my stats rendering
    view.renderMyStat = (me) => {
      $('#name').text(me.name);
      $('#win').text(me.win);
      $('#lose').text(me.lose);
      $('#game-played').text(me.gamePlayed);
    };


    //add player to waiting list
    view.appendToWaitingList = (name, isThatYou) => {
      const classToAdd = isThatYou ?
        'btn btn-default disabled waiting-player' : 'btn btn-success waiting-player';
      // const classToAdd = isThatYou ?
      //   'list-group-item disabled waiting-player' : 'list-group-item list-group-item-success waiting-player';
      waitingList.append($('<button>').addClass(classToAdd).text(name));
    };
    //delete player from waiting list
    view.removeFromWaitingList = (name) => {
      waitingList.children('button').each(function (idx) {
        if($(this).text() === name) $(this).remove();
      });
    };


    view.showChallengedByMsg = name => {
      $('#challenger').text(name);
      $('#challenge-msg-box').show();
    };
    view.hideChallengedByMsg = () => $('#challenge-msg-box').hide();


    view.showWaitingMsg = name => {
      $('#opponent').text(name);
      $('#waiting-msg-box').show();
    };
    view.hideWaitingMsg = () => $('#waiting-msg-box').hide();


    view.showNameForm = () => nameForm.show();
    view.hideNameForm = () => nameForm.hide();


    view.addToGameListView = (gameName, isUsersOwnGame=false) => {
      const add = isUsersOwnGame ? $().prepend : $().append;
      const desc = isUsersOwnGame ? 'My Game#: ' : 'Game#: ';
      add.call(
        $('#current-games'),
        $('<li>').addClass('list-group-item').text(desc + gameName).data('name', gameName)
      );
    };
    view.removeFromGameListView = gameName => {
      $('#current-games').children('li').each(function (idx) {
        if($(this).data('name') === gameName) $(this).remove();
      });
    };

    view.showRpsGameUI = () => gameBox.show('slow');
    view.hideRpsGameUI = () => gameBox.hide('slow');

    view.showUserChoice = choice => {
      $('#my-rps-choices').children().hide();
      $('#my-choice').append($('<img>').attr('src', 'assets/images/' + choice + '.png')).show('slow');
    };
    view.showOpponentChoice = choice => {
      $('#opponent-choice').attr('src', 'assets/images/' + choice + '.png')
    };

    view.showResultMessage = result => {
      if(result === 'draw') $('#result-message').text("Draw!");
      else $('#result-message').text("You " + result + "!");
    };


    view.updateRanking = reversedRankers => {
      topRankers.empty();
      const num =  reversedRankers.length;
      reversedRankers.forEach((ranker, idx) => {
        const rank = num - idx;
        topRankers.prepend(
          $('<li>').addClass('list-group-item').text(rank + ". " + ranker.name + ": " + ranker.win)
        )
      });

    };


  });







  return app;

})(APP || {});
