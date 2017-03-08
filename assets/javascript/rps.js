/**
 * Created by Hyungwu Pae on 3/7/17.
 */
var APP = (function (app) {

  const rps = app.rps = (me, you) => {
    if (me === you) return "draw";

    else {
      if ((me === "rock" && you === "scissor") ||
        (me === "paper" && you === "rock") ||
        (me === "scissor" && you === "paper")) {
          return "win";
      }
      return "lose";
    }
  };

  return app;

})(APP || {});