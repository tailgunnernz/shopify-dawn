// Define your custom function to run after MultiVariants adds products to cart
function afterMultivariantsAddToCartCallBack() {

  // Refresh the cart and open the drawer
  const cartDrawer = document.querySelector('cart-drawer')
  const cartDrawerItems = document.querySelector('cart-drawer-items')
  if (cartDrawer && cartDrawerItems) {
    // Fetch updated cart state
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
        sectionsToUpdate.forEach((section, index) => {
          parsedState.sections[section.id] = sections[index]
        })

        // Render updated cart contents and open drawer
        cartDrawer.classList.remove('is-empty')
        cartDrawer.renderContents(parsedState)
        if (typeof setupFaQuote === 'function') {
            setupFaQuote()
          }
      })
      .catch((error) => {
        console.error('Error updating cart sections:', error)
        // Fallback: just open the drawer
        cartDrawer.open()
      })
  }
}
