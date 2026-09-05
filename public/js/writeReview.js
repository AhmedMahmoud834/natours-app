// Interactive Star Rating & Write/Edit/Delete Review Submission

document.addEventListener('DOMContentLoaded', () => {
  const reviewForm = document.getElementById('review-form');
  if (!reviewForm) return;

  const tourContainer = document.getElementById('tour-container');
  const currentUserId = tourContainer?.dataset.userId;
  const formTitle = document.getElementById('review-form-title');
  const starIcons = reviewForm.querySelectorAll('.star-icon');
  const ratingInput = document.getElementById('review-rating');
  const starContainer = reviewForm.querySelector('.star-rating');
  const submitBtn = document.getElementById('submit-review');
  const deleteBtn = document.getElementById('delete-review-btn');
  const reviewContent = document.getElementById('review-content');

  let currentSelectedRating = 0;
  let existingReviewId = null;

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

  // 1. Check for Existing Review by Current User
  const initExistingReview = (reviews) => {
    if (!currentUserId || !reviews || !reviews.length) return;

    const myReview = reviews.find(
      (r) =>
        r.user &&
        ((r.user._id && r.user._id.toString() === currentUserId) ||
          (r.user.id && r.user.id.toString() === currentUserId) ||
          r.user.toString() === currentUserId),
    );

    if (myReview) {
      existingReviewId = myReview._id || myReview.id;
      currentSelectedRating = myReview.rating;
      ratingInput.value = myReview.rating;
      updateStars(currentSelectedRating, 'active');
      reviewContent.value = myReview.review || '';

      if (formTitle) formTitle.textContent = 'Edit Your Review';
      if (submitBtn) submitBtn.textContent = 'Update Review';
      if (deleteBtn) deleteBtn.style.display = 'inline-block';
    }
  };

  if (window.currentTourReviews) {
    initExistingReview(window.currentTourReviews);
  }

  document.addEventListener('reviewsLoaded', (e) => {
    if (e.detail && e.detail.reviews) {
      initExistingReview(e.detail.reviews);
    }
  });

  // 2. Star Rating Interactions
  starIcons.forEach((star) => {
    star.addEventListener('mouseover', () => {
      const hoverRating = parseInt(star.dataset.rating, 10);
      starIcons.forEach((s) => s.classList.remove('hovered'));
      updateStars(hoverRating, 'hovered');
    });

    star.addEventListener('click', () => {
      currentSelectedRating = parseInt(star.dataset.rating, 10);
      ratingInput.value = currentSelectedRating;
      updateStars(currentSelectedRating, 'active');
    });
  });

  if (starContainer) {
    starContainer.addEventListener('mouseleave', () => {
      starIcons.forEach((s) => s.classList.remove('hovered'));
      updateStars(currentSelectedRating, 'active');
    });
  }

  // 3. Delete Review Handler
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!existingReviewId) return;

      const confirmed = window.confirm(
        'Are you sure you want to delete your review? This action cannot be undone.',
      );
      if (!confirmed) return;

      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Deleting...';

      try {
        const res = await fetch(`/api/v1/reviews/${existingReviewId}`, {
          method: 'DELETE',
        });

        if (!res.ok && res.status !== 204) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to delete review');
        }

        showAlert('success', 'Review deleted successfully!');
        window.setTimeout(() => {
          location.reload();
        }, 1200);
      } catch (err) {
        showAlert('error', err.message || 'Error deleting your review.');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete Review';
      }
    });
  }

  // 4. Form Submission (Create or Update)
  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tourId = reviewForm.dataset.tourId;
    const rating = parseInt(ratingInput.value, 10);
    const review = reviewContent.value.trim();

    if (!tourId && !existingReviewId) {
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
      const isEdit = Boolean(existingReviewId);
      submitBtn.textContent = isEdit ? 'Updating...' : 'Submitting...';

      const url = isEdit
        ? `/api/v1/reviews/${existingReviewId}`
        : `/api/v1/tours/${tourId}/reviews`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.message || `Error ${isEdit ? 'updating' : 'submitting'} review.`,
        );
      }

      showAlert(
        'success',
        isEdit
          ? 'Review updated successfully!'
          : 'Review submitted successfully!',
      );

      window.setTimeout(() => {
        location.reload();
      }, 1500);
    } catch (err) {
      showAlert('error', err.message || 'Error processing your review.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = existingReviewId
        ? 'Update Review'
        : 'Submit Review';
    }
  });
});
