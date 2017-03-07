/**
 * Created by Hyungwu Pae on 3/6/17.
 */
var RPS = (function (rps) {
  const view = rps.view = {};

  $(() => {
    view.startGameBtn = $("#start-game");
    view.nameInput = $("#name");
    const waitingList = $("#waiting-players");

    view.showAlreadyTakenMsg = () => $("#already-taken-msg").show();
    view.hideAlreadyTakenMsg = () => $("#already-taken-msg").hide();
    view.addWaitingPlayerList = name => waitingList.append(
      $("<button>").addClass("btn btn-success waiting-player").text(name)
    );


  });







  return rps;

})(RPS || {});

