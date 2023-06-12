const Product = require('../models/product'); 
const Order = require('../models/order')
const fs = require('fs')
const path = require('path')
require('dotenv').config();
const PDFDocument = require('pdfkit');
//Use secret key here
const stripe = require('stripe')(process.env.SECRET_KEY)
const items_per_pg = 2

exports.getShop = (req, res, next) => {
    //We need to retrieve the information in which page we are in, so to get what data to be displayed
    //page as named that query parameter in index.ejs
    //+ added as pg is a string not a number, so otherwise would concatenate 2 numbers instead of adding. If query is undefined, display the starting page, basically to encounter NaN(not a number) issue
    const pg = +req.query.page || 1
    let totalItems;
    Product.find().countDocuments().then(numProducts => {
    totalItems = numProducts
//Skips first 'x' items/ documents. So if we are on pg2, we want to skip 1*3 items and display 4th item as pg1 contains first 3 items. Along with that, also want to fetch products to be displayed on current page, for that we use limit() to fetch only required items
  return Product.find().skip((pg - 1) * items_per_pg).limit(items_per_pg)
    })
    .then(rows => {
        res.render('shop/shopproduct-list', {
            result: rows,
            pgTitle: 'All Products', 
            path: '/products', 
            isAuthenticated: req.session.isLoggedIn,
            csrfToken: req.csrfToken(),
            currentPage: pg,
            //Next page exist only if products remains to display
            hasNextPage: pg * items_per_pg < totalItems,
            hasPreviousPage: pg > 1,
            nextPage: pg + 1,
            previousPage: pg - 1,
            //Last page that can be displayed
            lastPage: Math.ceil(totalItems/items_per_pg)
    })
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
}


exports.getProduct = (req, res, next) => {
    const id = req.params.productID;
    Product.findById(id)
    .then((product) => {
        res.render('shop/product-detail', {
            product: product,
            pgTitle: product.title,
            path: '/products',
            isAuthenticated: req.session.isLoggedIn,
            csrfToken: req.csrfToken()
        })
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      }); 
}; 


exports.getIndex = (req, res, next) => {
    const pg = +req.query.page || 1
    let totalItems;
    Product.find().countDocuments().then(numProducts => {
    totalItems = numProducts
  return Product.find().skip((pg - 1) * items_per_pg).limit(items_per_pg)
    })
    .then(rows => {
        res.render('shop/index', {
            result: rows,
            pgTitle: 'My Shop', 
            path: '/index', 
            isAuthenticated: req.session.isLoggedIn,
            csrfToken: req.csrfToken(),
            currentPage: pg,
            hasNextPage: pg * items_per_pg < totalItems,
            hasPreviousPage: pg > 1,
            nextPage: pg + 1,
            previousPage: pg - 1,
            lastPage: Math.ceil(totalItems/items_per_pg)
    })
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
}


exports.getCart = (req, res, next) => {
//Fetch data for path cart.items.productId, means fetching all products in a user's cart. populate() returns related data to what mentioned in ''
  req.user.populate('cart.items.productId')
    .then(user => {
      const cartProduct = user.cart.items;
      res.render('shop/cart', {
        pgTitle: 'My cart',
        path: '/cart',
        cartProd: cartProduct,
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

exports.postCart = (req, res, next) => {
  const id = req.body.productID;
  Product.findById(id)
    //Use request user which now is our full user model and call add to cart, which isn't a static method in 'user' model
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  let cartProduct;
  let totalAmount = 0;
  req.user.populate('cart.items.productId')
  .then(user => {
  cartProduct = user.cart.items
  //Loop through cartProduct[], find price for each product and its total at the end
  cartProduct.forEach(product => {
    totalAmount += product.quantity * product.productId.price
  })
  //To create a session key required in template
  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: cartProduct.map(p => {
      return {
        price_data: {
          currency: 'INR',
          product_data: {
            name: p.productId.title,
            description: p.productId.description,
          },
          unit_amount: p.productId.price * 100,
        },
        quantity: p.quantity,
      };
    }),
    mode: 'payment',
    //http/ https + :// + localhost:3000
    success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
    cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
  })
})
  .then(session => {
  //Fetch cart products to checkout and order, along with session 
  res.render('shop/checkout', {
    pgTitle: 'Checkout',
    path: '/checkout',
    cartProd: cartProduct,
    totalAmount: totalAmount,
    sessionId: session.id,
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

exports.postOrder = (req, res, next) => {
    req.user
      .populate('cart.items.productId')
      .then(user => {
        const cartProduct = user.cart.items.map(i => {
          return { quantity: i.quantity, product: { ...i.productId._doc } };
        });
        const order = new Order({
          user: {
            email: req.user.email,
            userId: req.user
          },
          products: cartProduct
        });
        return order.save();
      })
      .then(result => {
        return req.user.clearCart();
      })
      .then(() => {
        res.redirect('/orders');
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
}


exports.getOrders = (req, res, next) => {
    //Get all previous orders
    Order.find({'user.userId': req.user._id})
    .then(orders => {
        res.render('shop/orders', {
            pgTitle: 'My Orders',
            path: '/orders',
            prevOrders: orders,
            isAuthenticated: req.session.isLoggedIn,
            csrfToken: req.csrfToken()
        })
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
}


exports.getInvoice = (req, res, next) => {
    //What is specified in shop routes
    const orderId = req.params.orderID
    //Find order existing with requested orderId, done so that someone else can't copy url and open that
    Order.findById(orderId).then(order => {
        //No order existed
        if(!order){
            return next(new Error('No order found'))
        }
        //Order is not from the currently logged in user
        if(order.user.userId.toString() !== req.user._id.toString()){
            return next(new Error('Unauthorized User'))
        }
        const invoiceName = 'invoice' + orderId + '.pdf'
    //This is constructed path for required invoice file
    const invoicePath = path.join('data', 'invoices', invoiceName)
    //To create pdf on the fly
    const pdfDoc = new PDFDocument()
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="'+ invoiceName + '"') 
    //This is also a readable stream, so we can pipe this to a writable file stream
    pdfDoc.pipe(fs.createWriteStream(invoicePath))
    //pipe that output to response
    pdfDoc.pipe(res)
    //Allows to write a single text line to document
    pdfDoc.fontSize(26).text('Invoice', {
        underline: true
    })
    pdfDoc.text('------------------------------------------------------')
    let totalPrice = 0
    //Loop through products[] in orders to append them to invoice
    order.products.forEach(prod => {
        //products contains quantity key and product object, containing title, price etc
        totalPrice += prod.quantity*prod.product.price
        pdfDoc.fontSize(14).text(prod.product.title + ' - ' + prod.quantity + ' x ' + 'INR ' + prod.product.price)
    })
    pdfDoc.text('--------------------------')
    pdfDoc.fontSize(18).text('Total Price: INR ' + totalPrice)
    //Done writing with stream
    pdfDoc.end()
    })
    
}


exports.postDeleteItem = (req, res, next) => {
    const id = req.body.productID;
    req.user.deleteItemFromCart(id)
    res.redirect('/cart')
}


