/**
 * Created by Hyungwu Pae on 3/9/17.
 */
var APP = (function (app) {
  const ranker = app.ranker = {};
  const view = app.view;

  const database = app.database;

  ranker.initialize = () => {
    database.ref('users').orderByChild('win').limitToFirst(10).on('value', usersSnap => {
      let rankers = []; //has to be reversed for descending order
      usersSnap.forEach(userSnap => {
        rankers = [...rankers, { name: userSnap.key, win: userSnap.val().win }];
      });

      view.updateRanking(rankers);

    });
  };

  return app;

})(APP || {});
