const express = require('express');
const path = require('path');
const authController = require('../controllers/auth');
const router = express.Router();
const { check, body } = require('express-validator')
const User = require('../models/user')

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin)
router.post('/logout', authController.postLogout)
router.get('/signup', authController.getSignup);
router.post('/signup', 
[
//Calling the check func., which then returns a middleware, entering a field name or array of fields, like 'name' in ejs 
/*Check if 'email' field is a valid email. Customize validators using 'custom'.
normalizeEmail() converts all mails to same structure like lowercasing etc */
    check('email').isEmail().withMessage('Please enter a valid email.').normalizeEmail().custom((value, {req}) => {
    //Left one for database and right for extracted value
  return User.findOne({ email: value})
  .then((userDoc) => {
    if (userDoc) {
      return Promise.reject('E-Mail exists already, please pick a different one.');
    }
  })
}),
//Checks for name 'password' in request body while second argument is default error message, and has minimum length of 5 and is Alphanumeric.
    body('password', 'Enter a password with numbers and text with at least 5 characters').isLength({min: 5}).isAlphanumeric(),
    //Trims extra white spaces, and display message when not equals password
    body('confirmPassword', 'Passwords have to match!').not().equals('password').trim()
]
, authController.postSignup);
router.get('/reset', authController.getReset);
router.post('/reset', authController.postReset);
//token as extracted as req.params.token
router.get('/reset/:token', authController.getNewPassword);
router.post('/new-password', authController.postNewPassword)

module.exports = router;