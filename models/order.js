const mongoose = require('mongoose')
const schema = mongoose.Schema
//Created a new Schema by instantiating a Schema object by calling new schema using constructor here.
const order = new schema({
 //Products will be an [], containing product data and quantity, user and userId
  products: [{
      product: { type: Object, required: true},
      quantity: {type: Number, required: true}
  }],
  user: {
    email: {
        type: String,
        required: true
        },
    userId: {
        type: schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
    }
})

module.exports = mongoose.model('Order', order)


