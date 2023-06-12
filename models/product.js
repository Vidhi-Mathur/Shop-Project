const mongoose = require('mongoose')
const schema = mongoose.Schema
//Created a new Schema by instantiating a Schema object by calling new schema using constructor here.
const product = new schema({
  title: {
    type: String,
    required: true
  }, 
  imageUrl: {
    type: String,
    required: true
  }, 
  price: {
    type: Number,
    required: true
  }, 
  description: {
    type: String,
    required: true
  },
  userId: {
    type: schema.Types.ObjectId,
    //ref takes a string to tell mongoose, which model is actually related to the data in that field.
    ref: 'User',
    required: true
  }
})

//Defining a model 'Product' for given schema, mongoose convert modelname to lowercase and plural, and use it as collection name
module.exports = mongoose.model('Product', product)