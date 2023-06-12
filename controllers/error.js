exports.get404 = (req, res, next) => {
    res.status(404).render('404', {
    pgTitle: 'Error', 
    path: '/404',
    isAuthenticated: req.session.isLoggedIn,
    csrfToken: req.csrfToken()
    })
}


exports.get500 = (req, res, next) => {
    res.status(500).render('500', {
      pgTitle: 'Error!',
      path: '/500',
      isAuthenticated: req.session.isLoggedIn,
      csrfToken: req.csrfToken(),
    });
  };
  
