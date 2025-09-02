if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super()

        this.form = this.querySelector('form')
        this.variantIdInput.disabled = false
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this))
        this.cart =
          document.querySelector('cart-notification') ||
          document.querySelector('cart-drawer')
        this.submitButton = this.querySelector('[type="submit"]')
        this.submitButtonText = this.submitButton.querySelector('span')

        if (document.querySelector('cart-drawer'))
          this.submitButton.setAttribute('aria-haspopup', 'dialog')

        this.hideErrors = this.dataset.hideErrors === 'true'
      }

      onSubmitHandler(evt) {
        evt.preventDefault()
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return

        this.handleErrorMessage()

        // Get the product type of the item being added
        const productType = this.dataset.productType
        const isCatering = productType === 'Catering'

        console.log('productType', productType)

        // Check cart compatibility before proceeding
        fetch(`${routes.cart_url}.js?app=zapiet`)
          .then((response) => response.json())
          .then((cart) => {
            // Skip check if cart is empty
            if (cart.items.length === 0) {
              this.proceedWithSubmission(evt)
              return
            }

            // Check if there's a type mismatch
            const hasCateringItems = cart.items.some((item) => {
              // Check if line item properties contain product type
              return item.product_type === 'Catering'
            })

            if (
              (isCatering && !hasCateringItems) ||
              (!isCatering && hasCateringItems)
            ) {
              // Type mismatch - show error
              const errorMessage = isCatering
                ? 'Catering items cannot be ordered with regular products. Please complete your current order first or empty your cart.'
                : 'Regular items cannot be ordered with catering products. Please complete your current order first or empty your cart.'

              this.handleErrorMessage(errorMessage)
              return
            }

            // Types match, proceed with submission
            this.proceedWithSubmission(evt)
          })
          .catch((error) => {
            console.error('Error checking cart compatibility:', error)
            // Fall back to normal submission on error
            this.proceedWithSubmission(evt)
          })
      }

      // New helper method to contain original submission logic
      proceedWithSubmission(evt) {
        this.submitButton.setAttribute('aria-disabled', true)
        this.submitButton.classList.add('loading')
        this.querySelector('.loading__spinner').classList.remove('hidden')

        const config = fetchConfig('javascript')
        config.headers['X-Requested-With'] = 'XMLHttpRequest'
        delete config.headers['Content-Type']

        const formData = new FormData(this.form)
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          )
          formData.append('sections_url', window.location.pathname)
          this.cart.setActiveElement(document.activeElement)
        }
        config.body = formData

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message
              })
              this.handleErrorMessage(response.description)

              const soldOutMessage =
                this.submitButton.querySelector('.sold-out-message')
              if (!soldOutMessage) return
              this.submitButton.setAttribute('aria-disabled', true)
              this.submitButtonText.classList.add('hidden')
              soldOutMessage.classList.remove('hidden')
              this.error = true
              return
            } else if (!this.cart) {
              window.location = window.routes.cart_url
              return
            }

            const startMarker = CartPerformance.createStartingMarker(
              'add:wait-for-subscribers'
            )
            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response
              }).then(() => {
                CartPerformance.measureFromMarker(
                  'add:wait-for-subscribers',
                  startMarker
                )
              })
            this.error = false
            const quickAddModal = this.closest('quick-add-modal')
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    CartPerformance.measure(
                      'add:paint-updated-sections',
                      () => {
                        this.cart.renderContents(response)
                      }
                    )
                  })
                },
                { once: true }
              )
              quickAddModal.hide(true)
            } else {
              CartPerformance.measure('add:paint-updated-sections', () => {
                this.cart.renderContents(response)
              })
            }
          })
          .catch((e) => {
            console.error(e)
          })
          .finally(() => {
            this.submitButton.classList.remove('loading')
            if (this.cart && this.cart.classList.contains('is-empty'))
              this.cart.classList.remove('is-empty')
            if (!this.error) this.submitButton.removeAttribute('aria-disabled')
            this.querySelector('.loading__spinner').classList.add('hidden')

            CartPerformance.measureFromEvent('add:user-action', evt)
          })
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return

        this.errorMessageWrapper =
          this.errorMessageWrapper ||
          this.querySelector('.product-form__error-message-wrapper')
        if (!this.errorMessageWrapper) return
        this.errorMessage =
          this.errorMessage ||
          this.errorMessageWrapper.querySelector('.product-form__error-message')

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage)

        if (errorMessage) {
          // Convert "empty your cart" text to a clickable link
          const processedMessage = errorMessage.replace(
            'empty your cart',
            '<a href="#" class="empty-cart-link" style="color: inherit; text-decoration: underline;">empty your cart</a>'
          )
          this.errorMessage.innerHTML = processedMessage

          // Add event listener for the empty cart link
          const emptyCartLink =
            this.errorMessage.querySelector('.empty-cart-link')
          if (emptyCartLink) {
            emptyCartLink.addEventListener(
              'click',
              this.handleEmptyCart.bind(this)
            )
          }
        }
      }

      handleEmptyCart(evt) {
        evt.preventDefault()

        // Clear the cart by making a request to the cart clear endpoint
        const config = fetchConfig('javascript')
        config.headers['X-Requested-With'] = 'XMLHttpRequest'

        fetch(`${routes.cart_url}/clear`, {
          method: 'POST',
          headers: config.headers
        })
          .then((response) => {
            if (response.ok) {
              // Clear the error message
              this.handleErrorMessage()

              // Update the cart display if cart element exists
              if (this.cart) {
                // Trigger cart update event
                publish(PUB_SUB_EVENTS.cartUpdate, {
                  source: 'product-form',
                  cartData: { items: [], item_count: 0, total_price: 0 }
                })

                // Add empty class to cart
                this.cart.classList.add('is-empty')
              }

              // Optionally reload the page to ensure clean state
              window.location.reload()
            } else {
              console.error('Failed to clear cart')
            }
          })
          .catch((error) => {
            console.error('Error clearing cart:', error)
          })
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled')
          if (text) this.submitButtonText.textContent = text
        } else {
          this.submitButton.removeAttribute('disabled')
          this.submitButtonText.textContent = window.variantStrings.addToCart
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]')
      }
    }
  )
}
