/**
 * Created by Hyungwu Pae on 3/14/17.
 */
var APP = (function (app) {

  const state = app.state ? app.state : app.state = {};

  let me = { //initial status of user
    win: 0,
    lose: 0,
    gamePlayed: 0
  };

  state.getMe = () => me;
  state.setMe = (newMe) => {
    me = newMe;
  };

  return app;

})(APP || {});
