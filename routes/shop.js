const express = require('express')
const path = require('path');
const router = express.Router()
const shopController = require('../controllers/shop')
const isAuth = require('../middleware/is-auth');

router.get('/', shopController.getIndex)
router.get('/products', shopController.getShop)
router.get('/products/:productID', shopController.getProduct);
router.post('/cart', isAuth, shopController.postCart);
router.get('/cart', isAuth, shopController.getCart)
router.get('/checkout', isAuth, shopController.getCheckout)
router.get('/checkout/success', isAuth, shopController.postOrder)
router.get('/checkout/cancel', isAuth, shopController.getCheckout )
router.post('/delete-item', isAuth, shopController.postDeleteItem)
router.get('/orders', isAuth, shopController.getOrders)
router.get('/orders/:orderID', isAuth, shopController.getInvoice)

module.exports = router