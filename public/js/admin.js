//This is js code that will now not run on the server but  in the client, so in the browser. We'll import this js file into adminproduct-list.ejs.
const deleteProduct = (btn) => {
    //Extracting values of csrf token and productID once button is clicked
    const productID = btn.parentNode.querySelector('[name=productID]').value
    const csrfToken =  btn.parentNode.querySelector('[name=_csrf]').value
    //Returns the first (starting at element) inclusive ancestor that matches selectors, and null otherwise.
    const element = btn.closest('article')
    //fetch is also for sending data
    fetch('/admin/product/' + productID, {
        method: 'DELETE',
        headers: {
            'csrf-token': csrfToken
        }
    })
    .then(result => {
        return result.json()
    }) 
    .then(data => {
        element.remove()
    })
}