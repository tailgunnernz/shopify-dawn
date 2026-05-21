class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    if (!cartLink) return;

    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(cartLink);
    });
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner').classList.contains('is-empty') &&
      this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (!sectionElement) return;
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);


/**
 * Disable specific days in Zapiet pickup datepicker based on product tags in cart
 * e.g. "No Pickup Sat", "No Pickup Sun"
 */
document.addEventListener('DOMContentLoaded', function () {
  function productHasTag(product, tag) {
    const tags = product.tags
    let days = new Set()
    for (var i = 0; i < tags.length; i++) {
      if (tags[i].includes(tag)) {
        const day = tags[i].replace(tag, '').trim() 
        days.add(day)
      }
    }
    return days.size > 0 ? days : false
  }

  function cartHasTag(tag) {
    // grab products in cart from cart drawer
    // assumes cart drawer is present in DOM
    // and products have data-product-tags attribute
    // with comma separated list of product tags
    if (!document.querySelector('cart-drawer')) return false
    if (document.querySelectorAll('cart-drawer .cart-item').length === 0) return false
    const products = Array.from(document.querySelectorAll('cart-drawer .cart-item')).map(item => {
      return {
        tags: item.dataset.productTags.split(',')
      }
    })
    // merge all the sets of days from each product
    const days = new Set()
    for (let i = 0; i < products.length; i++) {
      const productDays = productHasTag(products[i], tag)
      if (productDays) {
        productDays.forEach(day => days.add(day))
      }
    }

    return days.size > 0 ? Array.from(days) : false
  }

  window.ZapietEvent.listen('pickup.datepicker.rendered', function () {
    // get the days to disable based on product tags in cart
    // e.g. "No Pickup Sat", "No Pickup Sun"
    const disableDays = cartHasTag('No Pickup');
    if (!disableDays) return

    let selectAllQuery = ''
    disableDays.forEach(day => {
      selectAllQuery += `.picker__day[aria-label*="${day}"], `
    })
    selectAllQuery = selectAllQuery.slice(0, -2)
    
    // disable the days
    document.querySelectorAll(selectAllQuery).forEach(function (element) {
      element.classList.add('picker__day--disabled')
    })
  })

  window.ZapietEvent.listen('selected_method', function(checkout_method) {    
    let terms = document.querySelector('.cart-drawer__terms-label')
    let submit = document.querySelector('#CartDrawer-Checkout')

    if(checkout_method !== 'shipping') {
      if(terms){
        terms.remove();
      }
      return;
    };
    console.log(ZapietCart)
    
    if(!terms){
      // prepend the terms and conditions checkbox to the checkout button
      terms = document.createElement('div');
      let accepted = ZapietCart.attributes?.delivery_terms_accepted === 'Yes';
      terms.innerHTML = `<label class="cart-drawer__terms-label">
        <input type="checkbox" id="CartDrawer-TermsCheckbox" name="cart_terms_accepted" ${accepted ? 'checked' : ''}>
        <span>I acknowledge that delivery timeframes are estimates only and that all courier deliveries are sent with Authority to Leave. Once delivery has been recorded by the courier, responsibility for the parcel transfers to me.</span>
      </label>`;
      submit.parentNode.insertBefore(terms, submit); 
      submit.disabled = !ZapietCart.attributes?.delivery_terms_accepted;
    }
    

  });

  window.addEventListener('change', async function(event) {
    if(event.target.id === 'CartDrawer-TermsCheckbox') {
      let submit = document.querySelector('#CartDrawer-Checkout')
      await updateCartTermsAccepted(event.target.checked);
      submit.disabled = !event.target.checked; 
    }
  })

  async function updateCartTermsAccepted(accepted) {
    await fetch('/cart/update.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        attributes: {
          delivery_terms_accepted: accepted ? 'Yes' : ''
        }
      })
    });
  }
})
