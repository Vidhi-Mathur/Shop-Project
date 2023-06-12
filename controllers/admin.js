const csrf = require('csurf')
const csrfProtection = csrf({ cookie: true })
const { validationResult } = require('express-validator')
const Product = require('../models/product');
const fileHelp = require('../util/file')

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pgTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMsg: null,
    validationErrors: [],
    isAuthenticated: req.session.isLoggedIn,
    csrfToken: req.csrfToken()
  });
};


exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  if (!image) {
    return res.status(422).render('admin/edit-product', {
      pgTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      errorMsg: 'Attached file is not an image.',
      validationErrors: [],
      isAuthenticated: req.session.isLoggedIn,
      csrfToken: req.csrfToken(),
      product: {
        title: title,
        price: price,
        description: description
      }
    })
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render('admin/edit-product', {
      pgTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      errorMsg: errors.array()[0].msg,
      validationErrors: errors.array(),
      isAuthenticated: req.session.isLoggedIn,
      csrfToken: req.csrfToken(),
      product: {
        title: title,
        price: price,
        description: description
      }
    })
  }
  const imageUrl = image.path;
  const product = new Product({title: title, imageUrl: imageUrl, price: price, description: description, userId: req.user});
  product
    .save()
    .then(result => {
      res.redirect('/admin/adminproduct-list');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};


exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit
  if(!editMode){
    return res.redirect('/')
  }
  const prodId = req.params.productID
   Product.findById(prodId)
  .then(prod => {
    if(!prod){
      return res.redirect('/')
    }
    res.render('admin/edit-product', { 
    pgTitle: 'Edit Product',
    path: '/admin/edit-product',
    product: prod,
    editing: editMode,
    hasError: false,
    errorMsg: null,
    validationErrors: [],
    isAuthenticated: req.session.isLoggedIn,
    csrfToken: req.csrfToken()
  })
  })
  .catch(err => {
   const error = new Error(err);
   error.httpStatusCode = 500;
   return next(error);
 })
}


exports.postEditProduct = (req, res, next) => {
  const updatedproductID = req.body.productID
  const updatedTitle = req.body.title 
  const updatedImage = req.file
  const updatedPrice = req.body.price
  const updatedDescription = req.body.description
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product', { 
      pgTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      errorMsg: errors.array()[0].msg,
      validationErrors: errors.array(),
      isAuthenticated: req.session.isLoggedIn,
      csrfToken: req.csrfToken(),
      product: {
        title: updatedTitle, 
        price: updatedPrice, 
        description: updatedDescription,
        _id: updatedproductID
      }
    })
  }
  //Find product we want to edit in database through id and save product
  Product.findById(updatedproductID).then(product => {
    //Can't edit product added by others
    if(product.userId.toString() !== req.user._id.toString()){
      return res.redirect('/')
    }
    product.title = updatedTitle
    product.price = updatedPrice,
    product.description = updatedDescription
    if(updatedImage){
      //Before replacing image, remove that imageUrl, by specifing the path
      fileHelp.deleteFile(product.imageUrl)
      product.imageUrl = updatedImage.path
    }
    return product.save().then(res.redirect('/admin/adminproduct-list'))
  })
  .catch(err => {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
}


exports.getAdminProduct = (req, res, next) => {
  //Restrict the permissions by rendering to display products created by that user only, so that they couldn't edit/ delete one created by any other user. Hence, find products whose userId matches that of currently logged in user
   Product.find({userId: req.user._id})
  .then(addedProduct=> {
    res.render('admin/adminproduct-list', {
      result: addedProduct,
      pgTitle: 'Admin Products',
      path: '/admin/adminproduct-list',
      isAuthenticated: req.session.isLoggedIn,
      csrfToken: req.csrfToken()
    });
  })
  .catch(err => {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};
  

exports.deleteProduct = (req, res, next) => {
  //Changed to params from body as now not extracted from request body, but have url parameter in admin routes
  const prodId = req.params.productID
  Product.findById(prodId).then(product => {
  //No such product exist
    if(!product){
      return next(new Error('Product not found'))
    }
  //Delete the imageUrl, by specifing the path
  fileHelp.deleteFile(product.imageUrl)
  //Delete one with same productId and userId
  return Product.deleteOne({_id: prodId, userId: req.user._id})
  })
.then(() => {
  res.status(200).json({message: "Deleted Product"})
})
.catch(err => {
  res.status(500).json({message: "Deleting product Failed"})
});
} 
