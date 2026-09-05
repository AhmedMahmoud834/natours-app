document.addEventListener('DOMContentLoaded', () => {
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

  const reviewCards = document.querySelectorAll('.user-review-card');
  if (!reviewCards.length) return;

  reviewCards.forEach((card) => {
    const reviewId = card.dataset.reviewId;
    const starContainer = card.querySelector('.user-review-card__rating');
    const starIcons = starContainer.querySelectorAll('.star-icon');
    const ratingInput = card.querySelector('.user-review-rating-input');
    const textarea = card.querySelector('.user-review-card__textarea');
    const btnSave = card.querySelector('.btn-save-user-review');
    const btnDelete = card.querySelector('.btn-delete-user-review');

    let currentRating = parseInt(ratingInput.value, 10) || 0;

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

    // Star rating interactions
    starIcons.forEach((star) => {
      star.addEventListener('mouseover', () => {
        const hoverRating = parseInt(star.dataset.rating, 10);
        starIcons.forEach((s) => s.classList.remove('hovered'));
        updateStars(hoverRating, 'hovered');
      });

      star.addEventListener('click', () => {
        currentRating = parseInt(star.dataset.rating, 10);
        ratingInput.value = currentRating;
        updateStars(currentRating, 'active');
      });
    });

    if (starContainer) {
      starContainer.addEventListener('mouseleave', () => {
        starIcons.forEach((s) => s.classList.remove('hovered'));
        updateStars(currentRating, 'active');
      });
    }

    // Save changes (PATCH /api/v1/reviews/:id)
    btnSave.addEventListener('click', async () => {
      const rating = parseInt(ratingInput.value, 10);
      const review = textarea.value.trim();

      if (!rating || rating < 1 || rating > 5) {
        return showAlert('error', 'Rating must be between 1 and 5 stars.');
      }
      if (!review) {
        return showAlert('error', 'Review text cannot be empty.');
      }

      btnSave.disabled = true;
      btnSave.textContent = 'Saving...';

      try {
        const res = await fetch(`/api/v1/reviews/${reviewId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating, review }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to update review');

        showAlert('success', 'Review updated successfully!');
        card.dataset.originalRating = rating;
        card.dataset.originalText = review;
      } catch (err) {
        showAlert('error', err.message || 'Error updating review');
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = 'Save Changes';
      }
    });

    // Delete review (DELETE /api/v1/reviews/:id)
    btnDelete.addEventListener('click', async () => {
      const confirmed = window.confirm(
        'Are you sure you want to delete this review? This action cannot be undone.',
      );
      if (!confirmed) return;

      btnDelete.disabled = true;
      btnDelete.textContent = 'Deleting...';

      try {
        const res = await fetch(`/api/v1/reviews/${reviewId}`, {
          method: 'DELETE',
        });

        if (!res.ok && res.status !== 204) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to delete review');
        }

        showAlert('success', 'Review deleted successfully!');
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';

        window.setTimeout(() => {
          card.remove();
          const remaining = document.querySelectorAll('.user-review-card');
          if (!remaining.length) {
            const grid = document.querySelector('.user-reviews-grid');
            if (grid) {
              grid.innerHTML =
                '<p class="empty-state" style="color: rgba(255, 255, 255, 0.5); font-style: italic;">You have not written any reviews yet.</p>';
            }
          }
        }, 300);
      } catch (err) {
        showAlert('error', err.message || 'Error deleting review');
        btnDelete.disabled = false;
        btnDelete.textContent = 'Delete';
      }
    });
  });
});
