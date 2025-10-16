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


document.addEventListener('DOMContentLoaded', function () {
  function productHasTag(product, tag) {
    const tags = product.tags
    let days = new Set()
    for (var i = 0; i < tags.length; i++) {
      const lowerTag = tags[i].toLowerCase()
      if (lowerTag.includes(tag)) {
        const day = lowerTag.replace(tag, '').trim() 
        days.add(day)
      }
    }
    return days.size > 0 ? days : false
  }

  function cartHasTag(tag) {
    // var products = ZapietWidgetConfig.products
    const products = Array.from(document.querySelectorAll('cart-drawer .cart-item')).map(item => {
      return {
        tags: item.dataset.productTags.split(',')
      }
    })
    console.log('zapiet products', products)

    const days = new Set()
    for (let i = 0; i < products.length; i++) {
      const productDays = productHasTag(products[i], tag)
      if (productDays) {
        productDays.forEach(day => days.add(day))
      }
    }

    // const dayMap = {
    //   sun: 1,
    //   sunday: 1,
    //   mon: 2,
    //   monday: 2,
    //   tue: 3,
    //   tuesday: 3,
    //   wed: 4,
    //   wednesday: 4,
    //   thu: 5,
    //   thursday: 5,
    //   fri: 6,
    //   friday: 6,
    //   sat: 7,
    //   saturday: 7
    // }
    // const mappedDays = Array.from(days).map(day => dayMap[day])
    // days.clear()

    return days.size > 0 ? Array.from(days) : false
  }

  window.ZapietEvent.listen('pickup.datepicker.rendered', function () {
    // document
    //   .querySelectorAll(
    //     '.picker__day[aria-label*="Mon"], .picker__day[aria-label*="Tue"]'
    //   )
    //   .forEach(function (element) {
    //     element.classList.add('picker__day--disabled')
    //   })
    console.log('datepicker rendered')
    const disableDays = cartHasTag('No Pickup');
    console.log('disableDays', disableDays)
    if (!disableDays) return
    console.log('disabling days', disableDays)

    let selectAllQuery = ''
    disableDays.forEach(day => {
      selectAllQuery += `.picker__day[aria-label*="${day}"], `
    })
    selectAllQuery = selectAllQuery.slice(0, -2) // remove last comma and space
    console.log('selectAllQuery', selectAllQuery)
    document.querySelectorAll(selectAllQuery).forEach(function (element) {
      element.classList.add('picker__day--disabled')
    })
  })
})
