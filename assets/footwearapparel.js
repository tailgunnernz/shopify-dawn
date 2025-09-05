// Define your custom function to run after MultiVariants adds products to cart
function afterMultivariantsAddToCartCallBack() {
  console.log('MultiVariants add to cart completed!')

  // Refresh the cart and open the drawer
  const cartDrawer = document.querySelector('cart-drawer')
  if (cartDrawer) {
    // Fetch updated cart state
    fetch(window.routes.cart_url + '.js')
      .then((response) => response.json())
      .then((cart) => {
        // Update cart sections
        const sectionsToUpdate = cartDrawer.getSectionsToRender()
        const sectionRequests = sectionsToUpdate.map((section) =>
          fetch(`${window.routes.cart_url}?section_id=${section.id}`).then(
            (response) => response.text()
          )
        )

        Promise.all(sectionRequests)
          .then((sections) => {
            const parsedState = {
              sections: {}
            }
            console.log('Fetched sections:', sections)
            sectionsToUpdate.forEach((section, index) => {
              parsedState.sections[section] = sections[index]
            })

            // Render updated cart contents and open drawer
            cartDrawer.renderContents(parsedState)
          })
          .catch((error) => {
            console.error('Error updating cart sections:', error)
            // Fallback: just open the drawer
            cartDrawer.open()
          })
      })
      .catch((error) => {
        console.error('Error fetching cart:', error)
        // Fallback: just open the drawer
        cartDrawer.open()
      })
  }
}
