/* eslint-disable */
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('tour-container');
  if (!container) return;

  const slug = container.dataset.slug;
  if (!slug) return;

  try {
    // 1. Fetch Tour
    const resTour = await fetch(`/api/v1/tours?slug=${slug}`);
    const tourData = await resTour.json();
    
    if (!resTour.ok || !tourData.data?.document?.length) {
      throw new Error('Tour not found!');
    }
    const tour = tourData.data.document[0];

    // 2. Fetch Reviews for this Tour
    const resReviews = await fetch(`/api/v1/reviews?tour=${tour.id}`);
    const reviewsData = await resReviews.json();
    const reviews = resReviews.ok ? (reviewsData.data?.document || []) : [];
    window.currentTourReviews = reviews;
    document.dispatchEvent(
      new CustomEvent('reviewsLoaded', {
        detail: { reviews, tourId: tour.id },
      }),
    );

    // Helper functions
    const formatDate = (dateString) => {
      if (!dateString) return 'TBD';
      return new Date(dateString).toLocaleString('en-us', { month: 'long', year: 'numeric' });
    };

    const buildOverviewBox = (label, text, icon) => `
      <div class="overview-box__detail">
        <svg class="overview-box__icon">
          <use href="/img/icons.svg#icon-${icon}"></use>
        </svg>
        <span class="overview-box__label">${label}</span>
        <span class="overview-box__text">${text}</span>
      </div>
    `;

    // -- HERO SECTION --
    const heroHtml = `
      <section class="section-header">
        <div class="header-hero">
          <div class="header-hero__bg" style="background-image: linear-gradient(to right bottom, rgba(11, 19, 32, 0.7), rgba(0, 0, 0, 0.8)), url('/img/tours/${tour.imageCover}')"></div>
          <div class="header-hero__text-box">
            <h1 class="heading-primary">
              <span>${tour.name}</span>
            </h1>
            <div class="header-hero__meta">
              <div class="header-hero__meta-item">
                <svg class="header-hero__icon">
                  <use href="/img/icons.svg#icon-clock"></use>
                </svg>
                <span class="header-hero__text">${tour.duration} days</span>
              </div>
              <div class="header-hero__meta-item">
                <svg class="header-hero__icon">
                  <use href="/img/icons.svg#icon-map-pin"></use>
                </svg>
                <span class="header-hero__text">${tour.startLocation?.description || 'Location TBD'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;

    // -- DESCRIPTION SECTION --
    const date = tour.startDates && tour.startDates[0] ? formatDate(tour.startDates[0]) : 'TBD';
    const rating = Math.round(tour.ratingsAverage * 10) / 10;
    const ratingHtml = (!tour.ratingsQuantity || tour.ratingsQuantity === 0) ? '★ New' : `${rating} / 5`;
    const priceHtml = tour.priceDiscount 
      ? `<span style="text-decoration: line-through; opacity: 0.7; margin-right: 0.5rem; font-weight: normal;">$${tour.price}</span><span style="color: #ff6b35;">$${tour.price - tour.priceDiscount}</span>` 
      : `$${tour.price}`;

    let guidesHtml = '';
    if (tour.guides && tour.guides.length) {
      tour.guides.forEach(guide => {
        let roleText = '';
        if (guide.role === 'lead-guide') roleText = '<span class="overview-box__role">Lead guide</span>';
        if (guide.role === 'guide') roleText = '<span class="overview-box__role">Tour guide</span>';
        
        guidesHtml += `
          <div class="overview-box__guide">
            <img class="overview-box__guide-img" src="/img/users/${guide.photo || 'default.jpg'}" alt="${guide.name}">
            ${roleText}
            <span class="overview-box__name">${guide.name}</span>
          </div>
        `;
      });
    }

    const paragraphs = tour.description ? tour.description.split('\\n') : [];
    let paragraphsHtml = '';
    paragraphs.forEach(p => {
      paragraphsHtml += `<p class="description-box__text">${p}</p>`;
    });

    const descriptionHtml = `
      <section class="section-description">
        <div class="overview-box">
          <div>
            <div class="overview-box__group">
              <h2 class="heading-secondary">Quick facts</h2>
              ${buildOverviewBox('Next date', date, 'calendar')}
              ${buildOverviewBox('Difficulty', tour.difficulty, 'trending-up')}
              ${buildOverviewBox('Participants', `${tour.maxGroupSize} people`, 'user')}
              ${buildOverviewBox('Rating', ratingHtml, 'star')}
              ${buildOverviewBox('Price', priceHtml, 'dollar-sign')}
            </div>
            <div class="overview-box__group">
              <h2 class="heading-secondary">Your tour guides</h2>
              <div class="overview-box__guides">
                ${guidesHtml}
              </div>
            </div>
          </div>
        </div>
        <div class="description-box">
          <h2 class="heading-secondary">About ${tour.name}</h2>
          ${paragraphsHtml}
        </div>
      </section>
    `;

    // -- PICTURES SECTION --
    let picturesHtml = '';
    if (tour.images) {
      tour.images.forEach((img, i) => {
        picturesHtml += `
          <div class="picture-box">
            <img class="picture-box__img picture-box__img--${i + 1}" src="/img/tours/${img}" alt="${tour.name} ${i + 1}">
          </div>
        `;
      });
    }
    const sectionPicturesHtml = `<section class="section-pictures">${picturesHtml}</section>`;

    // -- MAP SECTION --
    const locationsString = JSON.stringify(tour.locations).replace(/"/g, '&quot;');
    const mapHtml = `
      <section class="section-map">
        <div id="map" data-locations="${locationsString}"></div>
      </section>
    `;

    // -- REVIEWS SECTION --
    const currentUserId = container.dataset.userId;
    let reviewsListHtml = '';
    if (reviews.length) {
      reviews.forEach(review => {
        const photo = review.user && review.user.photo ? review.user.photo : 'default.jpg';
        const name = review.user && review.user.name ? review.user.name : 'Anonymous';
        const isMyReview =
          currentUserId &&
          review.user &&
          ((review.user._id && review.user._id.toString() === currentUserId) ||
            (review.user.id && review.user.id.toString() === currentUserId) ||
            review.user.toString() === currentUserId);
        
        let starsHtml = '';
        for (let star = 1; star <= 5; star++) {
          const activeClass = review.rating >= star ? 'active' : 'inactive';
          starsHtml += `
            <svg class="reviews__star reviews__star--${activeClass}">
              <use href="/img/icons.svg#icon-star"></use>
            </svg>
          `;
        }

        reviewsListHtml += `
          <div class="reviews__card" ${isMyReview ? 'style="border: 1px solid rgba(255, 107, 53, 0.4);"' : ''}>
            <div class="reviews__avatar">
              <img class="reviews__avatar-img" src="/img/users/${photo}" alt="${name}">
              <h6 class="reviews__user">${name}</h6>
              ${
                isMyReview
                  ? '<span class="badge" style="margin-left: auto; font-size: 1rem; padding: 0.2rem 0.6rem; background: rgba(255, 107, 53, 0.15); color: #FF6B35; border: 1px solid rgba(255, 107, 53, 0.4); border-radius: 10rem;">You</span>'
                  : ''
              }
            </div>
            <p class="reviews__text">${review.review}</p>
            <div class="reviews__rating">
              ${starsHtml}
            </div>
            ${
              isMyReview
                ? '<a href="#review-form" style="display: block; margin-top: 1.2rem; font-size: 1.2rem; color: #FF6B35; font-weight: 600; text-decoration: underline;">Edit your review &darr;</a>'
                : ''
            }
          </div>
        `;
      });
    } else {
      reviewsListHtml = '<div style="width: 100%; text-align: center; padding: 4rem 0;"><p style="font-size: 1.8rem; font-style: italic; color: rgba(248, 249, 250, 0.7);">No reviews yet for this tour.</p></div>';
    }

    const reviewsHtml = `
      <section class="section-reviews">
        <div class="reviews-wrapper">
          <button class="reviews__btn reviews__btn--left" aria-label="Previous reviews">&larr;</button>
          <div class="reviews">
            ${reviewsListHtml}
          </div>
          <button class="reviews__btn reviews__btn--right" aria-label="Next reviews">&rarr;</button>
        </div>
      </section>
    `;

    // -- CTA SECTION --
    const userRole = container.dataset.userRole;
    let ctaButtonHtml = '';
    
    if (userRole === 'user') {
      const maxGroup = tour.maxGroupSize || 20;
      ctaButtonHtml = `
        <div class="cta__booking-controls">
          <div class="cta__participants-group">
            <label for="tour-participants">Tickets:</label>
            <input type="number" id="tour-participants" min="1" max="${maxGroup}" value="1" />
          </div>
          <button class="btn btn--primary btn--pill" id="book-tour" data-tour-id="${tour.id}" data-max-group="${maxGroup}">Book tour now!</button>
        </div>
      `;
    } else if (userRole) {
      // Logged in, but not a standard user (e.g. admin, guide, lead-guide)
      ctaButtonHtml = `<button class="btn btn--primary btn--pill" disabled style="background-color: #777; cursor: not-allowed; box-shadow: none; transform: none; pointer-events: none;">Only users can book tours</button>`;
    } else {
      // Not logged in
      ctaButtonHtml = `<a class="btn btn--primary btn--pill" href="/login">Log in to book tour</a>`;
    }

    const img1 = tour.images && tour.images[1] ? tour.images[1] : tour.imageCover;
    const img2 = tour.images && tour.images[2] ? tour.images[2] : tour.imageCover;

    const ctaHtml = `
      <section class="section-cta">
        <div class="cta">
          <div class="cta__img cta__img--logo">
            <span class="cta__logo-text">NATOURS</span>
          </div>
          <img class="cta__img cta__img--1" src="/img/tours/${img1}" alt="Tour image">
          <img class="cta__img cta__img--2" src="/img/tours/${img2}" alt="Tour image">
          <div class="cta__content">
            <h2 class="heading-secondary">What are you waiting for?</h2>
            <p class="cta__text">${tour.duration} days. 1 adventure. Infinite memories. Make it yours today!</p>
            ${ctaButtonHtml}
          </div>
        </div>
      </section>
    `;

    // Update DOM
    document.title = `Natours | ${tour.name}`;
    container.innerHTML = heroHtml + descriptionHtml + sectionPicturesHtml + mapHtml + reviewsHtml + ctaHtml;

    const reviewForm = document.getElementById('review-form');
    if (reviewForm) reviewForm.dataset.tourId = tour.id;

    // Dispatch event for other scripts to initialize (leaflet.js, reviewsSlider.js, stripe.js)
    document.dispatchEvent(new Event('tourRendered'));

  } catch (err) {
    if (err.message === 'Tour not found!') {
      window.location.replace('/not-found');
    } else {
      container.innerHTML = `
        <div class="error">
          <div class="error__card">
            <div class="error__bg-text">!</div>
            <div class="error__title">
              <h2 class="heading-secondary heading-secondary--error">Something went wrong!</h2>
            </div>
            <div class="error__msg">${err.message}</div>
            <a class="btn btn--primary btn--pill" href="/">Back to Basecamp</a>
          </div>
        </div>
      `;
    }
  }
});
