const express = require("express");
const app = express();
const csrf = require('csurf');
const bodyParser = require("body-parser");
const fs = require('fs')
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const errorController = require('./controllers/error');
const User = require('./models/user');
const cookieParser = require("cookie-parser");
const flash = require('connect-flash')
const multer = require('multer')
// const helmet = require('helmet')
const compression = require('compression')
const morgan = require('morgan')
const https = require('https')
require('dotenv').config().parsed;

const MONGODB_URI = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0.mjodwc6.mongodb.net/${process.env.MONGO_DB}`
//Configures for local storage system, specified 2 functions now handles files for every incoming request
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
      //If null, means no error so can tell multer to store it into 'images' folder
          cb(null, 'images')
  },
  filename: (req, file, cb) => {
  /*To ensure not to overwrite 2 files with same name, we combine the unique hash value of file with 'filename' and original file name*/
  //Can also use snapshot of time to ensure uniqueness
  cb(null, new Date().getTime() + '-' + file.originalname);
}
})

//If image type is png/jpg/jpeg store it. Otherwise, no need to store
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' ||file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const mongoStore = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions'
});

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: true }));
//multer is a middleware which we execute on every incoming request and it simply looks at that request is a multipart form data. If yes, tries to extract files
//We expect a single file with input 'name' as image used in ejs file. An also set filters for incoming file
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'))
app.use(express.static(path.join(__dirname, 'public')));
//Statically serving a folder means that requests to files in that folder will be handled automatically and the files will be returned, so all the heavy lifting is done behind the scenes by express. Express assumes that files in images folder are served as if they were in root folder. So we add '/images' to tell middleware to serve file statically if we have a request that goes through '/images' 
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(cookieParser())
app.use(session({
    secret: 'MySecret',
    resave: false,
    saveUninitialized: false,
    store: mongoStore
}))
const csrfProtection = csrf({ cookie: true });

// const privateKey = fs.readFileSync('server.key')
// const certificate = fs.readFileSync('server.cert')

app.use(flash())

// Registering a middleware to store user as a request if found id 
app.use((req, res, next) => {
    if (!req.session.user) {
      return next();
    }
    User.findById(req.session.user._id)
      .then(user => {
        if (!user) {
          return next();
        }
        req.user = user;
        next();
      })
      .catch(err => {
        next(new Error(err));
      });
  });

// app.use(
//     helmet.contentSecurityPolicy({
//       directives: {
//             'default-src': ["'self'"],
//             'script-src': ["'self'", "'unsafe-inline'", 'js.stripe.com'],
//             'style-src': ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
//             'frame-src': ["'self'", 'js.stripe.com'],
//             'font-src': ["'self'", 'fonts.googleapis.com', 'fonts.gstatic.com']
//       },
//     })
// )
//Helpful when have a lot of css/js code as lot of files are saved. Images are not compressed as takes longer to load
app.use(compression())

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {
  //New content appended at end, not overwritten
  flags: 'a'
})
//Allows to log request data into files to let us know what's gonin on the server
app.use(morgan('combined', {stream: accessLogStream}))

app.use('/admin', csrfProtection, adminRoutes);
app.use(csrfProtection, shopRoutes);
app.use(csrfProtection, authRoutes);
  
app.get('/500', errorController.get500);
app.use(errorController.get404);
app.use((error, req, res, next) => {
  console.log(error)
  res.status(500).render('500', {
    pgTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn,
    csrfToken: req.csrfToken()
  });
});


mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
    .then(result => {
    //First argument configures the server and points it at private key and certificate and second being our request handler, which is our app here
        // https.createServer({key: privateKey, cert: certificate}, app).listen(3000);
        app.listen(process.env.PORT || 3000);
    })
    .catch(err => {
        console.log(err);
    });

