document.addEventListener('DOMContentLoaded', async function() {
  setupFaQuote();

  // Select the target node
  const cartDrawer = document.querySelector('cart-drawer');

  if (cartDrawer) {
    // Create a callback function to run when mutations occur
    const callback = function(mutationsList, observer) {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList' || mutation.type === 'subtree') {
          // Your custom function here
          console.log('Cart drawer content changed!');
          setupFaQuote();
        }
      }
    };

    // Create an observer instance
    const observer = new MutationObserver(callback);

    // Start observing
    observer.observe(cartDrawer, {
      childList: true, // observe direct children
      subtree: true,   // observe all descendants
    });
  }

})

function setupFaQuote(){
  var quoteButton = document.getElementById('fa_quote_btn');
  var quoteDialog = document.getElementById('fa_quote_modal');
  var quoteDialogClose = document.getElementById(
    'fa_quote_modal_close'
  );
  var quoteDialogForm = document.getElementById('fa_quote_form');

  // open dialog on button click
  quoteButton.addEventListener('click', function (e) {
    e.preventDefault();
    quoteDialog.showModal();
  });

  // close dialog on close button click
  quoteDialogClose.addEventListener('click', function (e) {
    e.preventDefault();
    quoteDialog.close();
  });

  // handle form submission
  quoteDialogForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    // disable the submit input
    var submitInput = document.getElementById('fa_quote_submit');
    submitInput.disabled = true;

    // clear any previous messages
    var message = document.getElementById('fa_quote_message');
    message.innerHTML = '';

    // show the loading spinner
    var loadingSpinner = document.getElementById('fa_quote_loading');
    loadingSpinner.style.display = 'inline-block';

    var messageReturn = '';
    try {
      // 1. fetch nonce from api
      const nonce = await fetchNonce();
    
      // 2. fetch cart info from shopify
      const cart = await fetchCart();
    
      // 3. send cart info to api with nonce
      const email = document.getElementById('fa_quote_email').value
      const res = await requestQuote({cart, nonce, email});

      // check error
      if('error' in res){
        throw new Error(res.error)
      }

      // update message
      messageReturn = `<div class="success">Quote sent successfully</div>`;
    } catch (error) {
      console.error('Fetch error:', error);
      messageReturn = `<div class="error">Something went wrong. Please try again.</div>`;
    }

    // hide the loading spinner
    loadingSpinner.style.display = 'none';
    // show the message
    message.innerHTML = messageReturn;
    // enable the submit input
    submitInput.disabled = false;
  });
}

async function fetchNonce() {
  const res = await fetch('https://quote.footwearandapparel.co.nz/nonce',{
      method: 'GET',
      credentials: 'include' // Send cookies
    })
    const data = await res.json()
    const nonce = data.nonce
    return nonce
}

async function fetchCart() {
  const res = await fetch(window.location.origin + '/cart.json')
    const data = await res.json()
    const cart = data
    return cart
}

async function requestQuote({cart, nonce, email}) {
  const body = {
      cart,
      nonce,
      email
    }
    const res = await fetch('https://quote.footwearandapparel.co.nz/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      credentials: 'include' // Send cookies
    })
    const data = await res.json()
    return data
}