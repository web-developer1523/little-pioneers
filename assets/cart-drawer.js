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
document.addEventListener("click", async function (e) {
  if (!e.target.matches("#ApplyDiscountBtn")) return;

  const code = document.getElementById("discount_code").value.trim();
  if (!code) return;

  const error = document.getElementById("discount_error");
  error.hidden = true;

  // Apply discount to Shopify checkout session
  // await fetch(`/checkout?discount=${encodeURIComponent(code)}`, {
  //   method: "GET",
  //   credentials: "same-origin"
  // });
  await fetch(`/discount/${encodeURIComponent(code)}?redirect=/cart`, {
  method: "GET",
  credentials: "same-origin"
 });
 await new Promise(resolve => setTimeout(resolve, 300));
  // Get updated cart sections
  const res = await fetch(`${routes.cart_url}?sections=cart-drawer,cart-icon-bubble`);
  const data = await res.json();

  const drawer = document.querySelector("cart-drawer");

  if (drawer && data["cart-drawer"]) {
    drawer.renderContents({
      id: null,
      sections: {
        "cart-drawer": data["cart-drawer"],
        "cart-icon-bubble": data["cart-icon-bubble"]
      }
    });
  }

  // Validate discount
  const cartRes = await fetch("/cart.js");
  const cart = await cartRes.json();

  if (!cart.discount_codes.length) {
    error.hidden = false;
  }
});

 let isRemovingDiscount = false;

 document.addEventListener("click", async function (e) {
   const btn = e.target.closest(".remove-discount-btn");
   if (!btn || isRemovingDiscount) return;

  isRemovingDiscount = true;

   try {
     // UX: show loading
     btn.style.pointerEvents = "none";
     const originalText = btn.innerText;
     btn.innerText = "Removing...";

     // 🔥 Force remove discount
     const iframe = document.createElement("iframe");
     iframe.style.display = "none";
     iframe.src = "/checkout?discount=INVALIDCODE123";
     document.body.appendChild(iframe);
     // ✅ IMPORTANT: fixed wait (DON'T poll cart)
     await new Promise(resolve => setTimeout(resolve, 1000));

     iframe.remove();

     // 🔄 Refresh cart drawer AFTER session is updated
     const res = await fetch(`${routes.cart_url}?sections=cart-drawer,cart-icon-bubble`);
     const data = await res.json();

     const drawer = document.querySelector("cart-drawer");

     if (drawer && data["cart-drawer"]) {
       drawer.renderContents({
         id: null,
         sections: {
           "cart-drawer": data["cart-drawer"],
           "cart-icon-bubble": data["cart-icon-bubble"]
         }
       });
     }
   } catch (err) {
     console.error("Remove discount error:", err);
   } finally {
     isRemovingDiscount = false;

   // mark that we should reopen drawer after reload
   sessionStorage.setItem("openCartDrawer", "true");

   // redirect to clear discount and return back
   window.location.href = "/discount/INVALIDCODE123";
   }
 });




