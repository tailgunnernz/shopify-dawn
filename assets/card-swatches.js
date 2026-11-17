/*
 * Colour swatches under product cards. Markup: snippets/card-swatches.liquid
 *
 * Mouse: hovering a swatch swaps the card photo to that colour; clicking opens
 * the product with that colour selected.
 * Touch: tapping a swatch swaps the photo and stays on the page; tapping the
 * photo then opens the product with that colour selected.
 * Keyboard: focusing a swatch swaps the photo; Enter opens it.
 *
 * Listeners are delegated from the document, so cards that arrive later
 * (filters, infinite scroll, product recommendations) work without re-binding.
 */
(() => {
  if (window.cardSwatchesReady) return;
  window.cardSwatchesReady = true;

  let lastPointerType = 'mouse';

  const preload = (list) => {
    if (list.dataset.preloaded) return;
    list.dataset.preloaded = 'true';
    list.querySelectorAll('.card-swatch[data-src]').forEach((swatch) => {
      const img = new Image();
      img.sizes = '(min-width: 990px) 25vw, 50vw';
      img.srcset = swatch.dataset.srcset;
      img.src = swatch.dataset.src;
    });
  };

  const show = (swatch) => {
    const wrapper = swatch.closest('.card-wrapper');
    const list = swatch.closest('.card-swatches');
    if (!wrapper || !list || swatch.classList.contains('is-active')) return;

    list.querySelectorAll('.card-swatch.is-active').forEach((el) => el.classList.remove('is-active'));
    swatch.classList.add('is-active');

    // Point the card at this colour, so opening the product keeps it selected.
    const href = swatch.getAttribute('href');
    wrapper.querySelectorAll('a.full-unstyled-link').forEach((link) => link.setAttribute('href', href));

    if (!swatch.dataset.src) return;
    const img = wrapper.querySelector('.card__media .media > img');
    if (!img) return;
    img.removeAttribute('loading');
    img.srcset = swatch.dataset.srcset;
    img.src = swatch.dataset.src;
    wrapper.classList.add('card-wrapper--swatched');
  };

  document.addEventListener(
    'pointerdown',
    (event) => {
      lastPointerType = event.pointerType || 'mouse';
    },
    { capture: true, passive: true }
  );

  document.addEventListener('pointerover', (event) => {
    const list = event.target.closest && event.target.closest('.card-swatches');
    if (!list) return;
    preload(list);
    if (event.pointerType === 'touch') return;
    const swatch = event.target.closest('.card-swatch');
    if (swatch) show(swatch);
  });

  document.addEventListener('focusin', (event) => {
    const swatch = event.target.closest && event.target.closest('.card-swatch');
    if (swatch) show(swatch);
  });

  document.addEventListener('click', (event) => {
    const swatch = event.target.closest && event.target.closest('.card-swatch');
    if (!swatch || lastPointerType !== 'touch') return;
    event.preventDefault();
    preload(swatch.closest('.card-swatches'));
    show(swatch);
  });
})();
