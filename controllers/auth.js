const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer')
const crypto = require('crypto');
const { validationResult } = require('express-validator')
const User = require('../models/user')
//Use nodemailer and then call the create transport method. In create transport, we can now pass gmail as service and execute this to return a configuration that nodemailer can use
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  auth: {
    user: 'mathurvidhi2505@gmail.com',
    pass: 'fydiqayznwehwxay'
  }
})


exports.getLogin = (req, res, next) => {
    res.render('auth/login', {
      path: '/login',
      pgTitle: 'Login',
      errorMsg: req.flash('error')[0],
      validationErrors: [],
      isAuthenticated: req.session.isLoggedIn,
      csrfToken: req.csrfToken(),
      oldInput: {email: '', password: ''}
    })
  };


exports.postLogin = (req, res, next) => {
    const extractedEmail = req.body.email;
    const extractedPassword = req.body.password;
    const errors = validationResult(req)
    if(!errors.isEmpty()){
      //Is errors exist, render the same signup page
      return res.status(422).render('auth/login', {
        path: '/login',
        pgTitle: 'Login',
        errorMsg: errors.array()[0].msg,
        validationErrors: errors.array(),
        isAuthenticated: req.session.isLoggedIn,
        csrfToken: req.csrfToken(),
        oldInput: {email: extractedEmail, password: extractedPassword}
      })
    }
//Left one for database and right for extracted value
User.findOne({ email: extractedEmail }).then(user => {
        if (!user) {
/* We don't know whether user entered an invalid e-mail or anything. Hence in the render method, we don't know if we want to include some error message. So, we store some data before we redirect which we then use in the brand new request that is triggered by the redirect using session. But we don't want to store the error message in the session permanently, instead flash it onto the session and once the error message was then used, pull it out of the session so that for subsequent requests, this error message is not part of the session anymore */
         //Email doesn't match
          return res.status(422).render('auth/login', {
            path: '/login',
            pgTitle: 'Login',
            errorMsg: 'Invalid email or password.',
            validationErrors: errors.array(),
            isAuthenticated: req.session.isLoggedIn,
            csrfToken: req.csrfToken(),
            //Could also add as [{path = 'email'}, {path = 'password'}]
            oldInput: {email: extractedEmail, password: extractedPassword}
          })
        }
         //Compare the entered password with the one in database
        bcrypt.compare(extractedPassword, user.password)
          .then(doMatch => {
             //If correct password, redirect to homepage with all routes present, so setting up a session
            if (doMatch) {
               //Reaching the session object in request
              req.session.isLoggedIn = true;
              req.session.user = user;
              //Return to avoid execution of redirection to '/login'
              return req.session.save(err => {
                console.log(err);
                res.redirect('/');
              });
            }
            //Incorrect password
            return res.status(422).render('auth/login', {
              path: '/login',
              pgTitle: 'Login',
              isAuthenticated: req.session.isLoggedIn,
              csrfToken: req.csrfToken(),
              errorMsg: 'Invalid email or password.',
              validationErrors: errors.array(),
              oldInput: {email: extractedEmail, password: extractedPassword}
            })
          })
          .catch(err => {
            console.log(err);
            res.redirect('/login');
          });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  };
  

exports.postLogout = (req, res, next) => {
  const csrfToken = req.csrfToken();
  req.headers['X-CSRF-Token'] = csrfToken;
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};


exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pgTitle: 'Signup',
    isAuthenticated: req.session.isLoggedIn,
    csrfToken: req.csrfToken(),
    errorMsg: req.flash('error')[0],
    validationErrors: [],
    //Empty values as no old data exist
    oldInput: {email: '', password: '', confirmPassword: ''},
  });
};


exports.postSignup = (req, res, next) => {
  //We need to get email and password. Also need to check is user with that email address exist to avoid duplicacy
  const extractedEmail = req.body.email;
  const extractedPassword = req.body.password;
  const confirmExtractedPassword = req.body.confirmPassword;
  //express-validator validators do not report validation errors to users automatically. Collect the all errors as a list 
  const errors = validationResult(req)
  if(!errors.isEmpty()){
    //Is errors exist, render the same signup page
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pgTitle: 'Signup',
      isAuthenticated: req.session.isLoggedIn,
      csrfToken: req.csrfToken(),
      errorMsg: errors.array()[0].msg,
      validationErrors: errors.array(),
//User input removed if wrong input is entered. So we have to send it back to render on page so it isn't lost and can be modified by the user
      oldInput: {email: extractedEmail, password: extractedPassword, confirmPassword: confirmExtractedPassword},
    })
  }
    //To encrypt password, using salt value as 12, means 12 rounds of hashing will be considered highly secured
    bcrypt.hash(extractedPassword, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: extractedEmail,
        password: hashedPassword,
        cart: { items: [] },
      });
      return user.save();
    })
    .then((result) => {
      res.redirect('/login');
      return transporter.sendMail({
        to: extractedEmail,
        from: 'mathurvidhi2505@gmail.com',
        subject: 'Signed Up Successfully',
        html: '<h1>Signup complete</h1>'
      })
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getReset = (req, res, next) => {
  res.render('auth/reset', {
    path: '/reset',
    pgTitle: 'Reset Password',
    errorMsg: req.flash('error')[0],
    isAuthenticated: req.session.isLoggedIn,
    csrfToken: req.csrfToken()
  });
}


exports.postReset = (req, res, next) => {
  //Generates a 32 random bytes
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/reset');
    }
    //Convert those random bytes to string to use as token
    const token = buffer.toString('hex');
    User.findOne({ email: req.body.email })
     //No such email existed in database
      .then(user => {
        if (!user) {
          req.flash('error', 'No account with that email found.');
          return res.redirect('/reset');
        }
        //To reset save token and its expiration to 1 hour
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then(result => {
        res.redirect('/');
        return transporter.sendMail({
          to: req.body.email,
          from: 'mathurvidhi2505@gmail.com',
          subject: 'Password reset',
          html: `
            <p>You requested a password reset</p>
            <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
          `
        });
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  //Check if found a user with that retrieved token in the database and is still valid, means its expirtation date is greater than current date
  //Params are often used in get route while body in post route
  const extractedToken = req.params.token
  User.findOne({resetToken: extractedToken, resetTokenExpiration: {$gt: Date.now()}})
  .then(user => {
    res.render('auth/new-password', {
      path: '/new-password',
      pgTitle: 'New Password',
      errorMsg: req.flash('error')[0],
      isAuthenticated: req.session.isLoggedIn,
      csrfToken: req.csrfToken(),
      //To including it in post request while updating password
      userId: user._id.toString(),
      passwordToken: extractedToken
    });
  })
}

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password
  const userId = req.body.userId
  //Otherwise people could enter random token and may change users on backend by entering random userId
  const passwordToken = req.body.passwordToken
  let resetUser;
  User.findOne({resetToken: passwordToken, resetTokenExpiration: {$gt: Date.now()}, _id: userId})
    .then(user => {
      resetUser = user
      return bcrypt.hash(newPassword, 12)
    })
    .then(hashedPassword => {
      resetUser.password = hashedPassword
      //Token and its expiration are not required anymore once password is reset
      resetUser.resetToken = undefined
      resetUser.resetTokenExpiration = undefined
      return resetUser.save()
    })
    .then(res.redirect('/login'))
}