/**
 * Created by Hyungwu Pae on 3/7/17.
 */
var APP = (function (app) {



  app.rps = (player1, player2) => {
    const choice1 = player1.choice;
    const choice2 = player2.choice;
    if (choice1 === choice2) return choice1;

    else {
      if ((choice1 === 'ROCK' && choice2 === 'SCISSOR') ||
        (choice1 === 'PAPER' && choice2 === 'ROCK') ||
        (choice1 === 'SCISSOR' && choice2 === 'PAPER')) {
        return {winner: player1, loser: player2};
      }
      return {winner: player2, loser: player1};
    }
  };
  
  return app;

})(APP || {});