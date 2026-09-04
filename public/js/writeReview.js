// Interactive Star Rating & Write Review Submission

document.addEventListener('DOMContentLoaded', () => {
  const reviewForm = document.getElementById('review-form');
  if (!reviewForm) return;

  const starIcons = reviewForm.querySelectorAll('.star-icon');
  const ratingInput = document.getElementById('review-rating');
  const starContainer = reviewForm.querySelector('.star-rating');
  const submitBtn = document.getElementById('submit-review');
  const reviewContent = document.getElementById('review-content');

  let currentSelectedRating = 0;

  const hideAlert = () => {
    const el = document.querySelector('.alert');
    if (el) el.parentElement.removeChild(el);
  };

  const showAlert = (type, msg) => {
    hideAlert();
    const markup = `<div class="alert alert--${type}">${msg}</div>`;
    document.body.insertAdjacentHTML('afterbegin', markup);
    window.setTimeout(hideAlert, 4000);
  };

  const updateStars = (rating, className = 'active') => {
    starIcons.forEach((star) => {
      const starRating = parseInt(star.dataset.rating, 10);
      if (starRating <= rating) {
        star.classList.add(className);
      } else {
        star.classList.remove(className);
      }
    });
  };

  // 1. Star Rating Interactions
  starIcons.forEach((star) => {
    // Hover over a star
    star.addEventListener('mouseover', () => {
      const hoverRating = parseInt(star.dataset.rating, 10);
      starIcons.forEach((s) => s.classList.remove('hovered'));
      updateStars(hoverRating, 'hovered');
    });

    // Click to lock in rating
    star.addEventListener('click', () => {
      currentSelectedRating = parseInt(star.dataset.rating, 10);
      ratingInput.value = currentSelectedRating;
      updateStars(currentSelectedRating, 'active');
    });
  });

  // Mouse leaves star container -> revert to selected rating
  if (starContainer) {
    starContainer.addEventListener('mouseleave', () => {
      starIcons.forEach((s) => s.classList.remove('hovered'));
      updateStars(currentSelectedRating, 'active');
    });
  }

  // 2. Form Submission with Axios
  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tourId = reviewForm.dataset.tourId;
    const rating = parseInt(ratingInput.value, 10);
    const review = reviewContent.value.trim();

    if (!tourId) {
      return showAlert('error', 'Tour ID not found. Please refresh the page.');
    }

    if (!rating || rating < 1 || rating > 5) {
      return showAlert('error', 'Please select a rating between 1 and 5 stars.');
    }

    if (!review) {
      return showAlert('error', 'Please write a review text.');
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      // POST to /api/v1/tours/:tourId/reviews
      const res = await axios({
        method: 'POST',
        url: `/api/v1/tours/${tourId}/reviews`,
        data: {
          rating,
          review,
        },
      });

      if (res.data.status === 'Success' || res.status === 201) {
        showAlert('success', 'Review submitted successfully!');
        
        // Reset form
        reviewForm.reset();
        currentSelectedRating = 0;
        ratingInput.value = '';
        updateStars(0, 'active');

        // Reload page after a brief moment so user sees their new review
        window.setTimeout(() => {
          location.reload();
        }, 1500);
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Error submitting your review. Please try again.';
      showAlert('error', message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';
    }
  });
});
