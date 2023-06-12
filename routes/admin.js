const express = require('express')
const path = require('path');
const router = express.Router()
const adminController = require('../controllers/admin')
const isAuth = require('../middleware/is-auth');
const {body} = require('express-validator')

router.get('/add-product', isAuth, adminController.getAddProduct)
router.post('/add-product', 
[body('title', 'Title length must be minimum 3 characters').isString().isLength({min: 3}).trim(),
body('price', 'Invalid Price').isFloat(),
body('description', 'Description length must be minimum 3 and maximum 400 characters').isLength({min: 3, max: 400}).trim()
],
isAuth, adminController.postAddProduct)
router.get('/adminproduct-list', isAuth, adminController.getAdminProduct)
router.get('/edit-product/:productID', isAuth, adminController.getEditProduct)
router.post('/edit-product', 
[body('title', 'Title length must be minimum 3 characters').isString().isLength({min: 3}).trim(),
body('price', 'Invalid Price').isCurrency().isFloat(),
body('description', 'Description length must be minimum 3 and maximum 400 characters').isLength({min: 3, max: 400}).trim()
],
isAuth, adminController.postEditProduct)
router.delete('/product/:productID', isAuth, adminController.deleteProduct)

module.exports = router;
