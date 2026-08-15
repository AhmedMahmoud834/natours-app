/* eslint-disable */
document.addEventListener('DOMContentLoaded', () => {
  const reviewsContainer = document.querySelector('.reviews');
  const btnLeft = document.querySelector('.reviews__btn--left');
  const btnRight = document.querySelector('.reviews__btn--right');

  if (!reviewsContainer || !btnLeft || !btnRight) return;

  const checkScrollBounds = () => {
    const isAtStart = reviewsContainer.scrollLeft <= 0;
    const isAtEnd =
      Math.ceil(reviewsContainer.scrollLeft + reviewsContainer.clientWidth) >=
      reviewsContainer.scrollWidth;

    if (isAtStart) {
      btnLeft.classList.add('reviews__btn--disabled');
    } else {
      btnLeft.classList.remove('reviews__btn--disabled');
    }

    if (isAtEnd) {
      btnRight.classList.add('reviews__btn--disabled');
    } else {
      btnRight.classList.remove('reviews__btn--disabled');
    }
  };

  btnRight.addEventListener('click', () => {
    reviewsContainer.scrollBy({ left: 400, behavior: 'smooth' });
  });

  btnLeft.addEventListener('click', () => {
    reviewsContainer.scrollBy({ left: -400, behavior: 'smooth' });
  });

  reviewsContainer.addEventListener('scroll', checkScrollBounds);

  // Initialize bounds check on load
  checkScrollBounds();
});
