// Define your custom function to run after MultiVariants adds products to cart
function afterMultivariantsAddToCartCallBack() {
  console.log('MultiVariants add to cart completed!')

  // Refresh the cart and open the drawer
  const cartDrawer = document.querySelector('cart-drawer')
  if (cartDrawer) {
    fetch(`${routes.cart_url}?section_id=cart-drawer`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html')
        const selectors = ['cart-drawer-items', '.cart-drawer__footer']
        for (const selector of selectors) {
          const targetElement = document.querySelector(selector)
          const sourceElement = html.querySelector(selector)
          console.log('Updating element:', selector, {
            targetElement,
            sourceElement
          })
          if (targetElement && sourceElement) {
            targetElement.replaceWith(sourceElement)
          }
        }
        cartDrawer.open()
      })
      .catch((e) => {
        console.error(e)
        cartDrawer.open()
      })
    // // Fetch updated cart state
    // fetch(window.routes.cart_url + '.js')
    //   .then((response) => response.json())
    //   .then((cart) => {
    //     // Update cart sections
    //     const sectionsToUpdate = cartDrawer.getSectionsToRender()
    //     const sectionRequests = sectionsToUpdate.map((section) =>
    //       fetch(`${window.routes.cart_url}?section_id=${section.id}`).then(
    //         (response) => response.text()
    //       )
    //     )

    //     Promise.all(sectionRequests)
    //       .then((sections) => {
    //         const parsedState = {
    //           sections: {}
    //         }
    //         console.log('Fetched sections:', sections)
    //         sectionsToUpdate.forEach((section, index) => {
    //           parsedState.sections[section.id] = sections[index]
    //         })

    //         // Render updated cart contents and open drawer
    //         cartDrawer.renderContents(parsedState)
    //       })
    //       .catch((error) => {
    //         console.error('Error updating cart sections:', error)
    //         // Fallback: just open the drawer
    //         cartDrawer.open()
    //       })
    //   })
    //   .catch((error) => {
    //     console.error('Error fetching cart:', error)
    //     // Fallback: just open the drawer
    //     cartDrawer.open()
    //   })
  }
}
