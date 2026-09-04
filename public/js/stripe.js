/* eslint-disable */
(() => {
  const hideAlert = () => {
    const el = document.querySelector('.alert');
    if (el && el.parentElement) el.parentElement.removeChild(el);
  };

  const showAlert = (type, msg) => {
    hideAlert();
    const markup = `<div class="alert alert--${type}">${msg}</div>`;
    document.body.insertAdjacentHTML('afterbegin', markup);
    window.setTimeout(hideAlert, 5000);
  };

  // Note: Replace with your actual Stripe Publishable Key from your Stripe Dashboard
  const stripe =
    typeof Stripe !== 'undefined' ? Stripe("pk_test_51U3RayH38REiBGS1xTrK78a7grR9hxfEjpES0CP8Z8fxoHgAgtGkpYQUPBZwikH90hpqItKztJNVGq4TmQpAZ1gO00SVFzdbJx") : null;

  const bookTour = async (tourId) => {
    const bookBtn = document.getElementById('book-tour');
    try {
      // 1) Get checkout session from API endpoint
      const res = await fetch(`/api/v1/bookings/checkout-session/${tourId}`);
      const data = await res.json();

      if (!res.ok || (data.status !== 'Success' && data.status !== 'success')) {
        throw new Error(data.message || 'Failed to create checkout session.');
      }

      // 2) Redirect to Stripe Checkout (supports session.url and redirectToCheckout)
      if (data.session && data.session.url) {
        window.location.assign(data.session.url);
      } else if (stripe && data.session) {
        await stripe.redirectToCheckout({
          sessionId: data.session.id,
        });
      }
    } catch (err) {
      showAlert(
        'error',
        err.message || 'Payment processing failed. Please try again.',
      );
      if (bookBtn) bookBtn.textContent = 'Book tour now!';
    }
  };

  const initStripe = () => {
    const bookBtn = document.getElementById('book-tour');
    if (bookBtn) {
      bookBtn.addEventListener('click', (e) => {
        e.target.textContent = 'Processing...';
        const { tourId } = e.target.dataset;
        bookTour(tourId);
      });
    }
  };

  document.addEventListener('tourRendered', initStripe);
})();
