/**
 * Created by Hyungwu Pae on 3/9/17.
 */
var APP = (function (app) {

  // Initialize Firebase
  firebase.initializeApp({
    apiKey: 'AIzaSyDbXYbNoD0F7VjToB1i7PNnc2acDeN4cko',
    authDomain: 'rps-monad.firebaseapp.com',
    databaseURL: 'https://rps-monad.firebaseio.com',
    storageBucket: 'rps-monad.appspot.com',
    messagingSenderId: '797189510342'
  });

  const database = app.database = firebase.database();

  return app;

})({});

