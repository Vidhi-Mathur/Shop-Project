const mongoose = require('mongoose')
const schema = mongoose.Schema
const user = new schema({
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  resetToken: String,
  resetTokenExpiration: Date,
      cart: {
        //Cart contains an items[], consisting of productId (ObjectId) and quantity (number)
        items: [{productId: {type: schema.Types.ObjectId, ref: 'Product', required: true}, quantity: {type: Number, required: true}}]
      }
})

//methods key is and object that allows us to add our own methods. It has to be a function to use 'this' with correct reference to schema
user.methods.addToCart = function(product){
    const cartProductIndex = this.cart.items.findIndex((cp) => {
    return cp.productId.toString() === product._id.toString();
    });
         let newQuantity = 1;
        const updatedCartItems = [...this.cart.items];
        if (cartProductIndex >= 0) {
              newQuantity = this.cart.items[cartProductIndex].quantity + 1;
              updatedCartItems[cartProductIndex].quantity = newQuantity;
        } 
        else {
               updatedCartItems.push({
               productId: product._id,
               quantity: newQuantity,
              });
        }
        const updatedCart = {
            items: updatedCartItems,
        }
        this.cart = updatedCart
        return this.save()
}

user.methods.deleteItemFromCart = function(prodId){
        //Add items from cart that meet the condition specified, except one we want to delete
        const updatedCartItems = this.cart.items.filter((item) => {
          return item.productId.toString() !== prodId;
        });
        //Update  cart items and save
        this.cart.items = updatedCartItems
        return this.save()
      }

user.methods.clearCart = function(){
  this.cart = {items: []}
  return this.save()
}

module.exports = mongoose.model('User', user)