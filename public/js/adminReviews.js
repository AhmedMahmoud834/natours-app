// Admin Reviews Client-side Logic

const DOM = {
  searchReviews: document.getElementById('search-reviews'),
  reviewsList: document.getElementById('reviews-list'),
  placeholder: document.getElementById('review-placeholder'),
  content: document.getElementById('review-content'),
  detailAuthor: document.getElementById('detail-author'),
  detailEmail: document.getElementById('detail-email'),
  detailRating: document.getElementById('detail-rating'),
  detailContent: document.getElementById('detail-content'),
  btnDeleteReview: document.getElementById('btn-delete-review'),
};

let currentReviewId = null;
let currentActiveItem = null;

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

// 1. Frontend Search Logic
if (DOM.searchReviews) {
  DOM.searchReviews.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const reviewItems = document.querySelectorAll('.review-item');

    reviewItems.forEach((item) => {
      const author = (item.dataset.author || '').toLowerCase();
      const content = (item.dataset.content || '').toLowerCase();

      if (author.includes(query) || content.includes(query)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  });
}

// 2. Fetch & Display Details
const selectReview = (item) => {
  if (currentActiveItem) {
    currentActiveItem.classList.remove('active');
  }

  currentActiveItem = item;
  currentActiveItem.classList.add('active');
  currentReviewId = item.dataset.id;

  const author = item.dataset.author || 'Unknown User';
  const email = item.dataset.email || 'N/A';
  const rating = item.dataset.rating || '-';
  const content = item.dataset.content || 'No content provided.';

  DOM.detailAuthor.textContent = author;
  DOM.detailEmail.textContent = email;
  DOM.detailRating.textContent = `★ ${rating}`;
  DOM.detailContent.textContent = content;

  DOM.placeholder.style.display = 'none';
  DOM.content.style.display = 'block';
};

const resetDetailsPane = () => {
  currentReviewId = null;
  currentActiveItem = null;

  DOM.detailAuthor.textContent = '';
  DOM.detailEmail.textContent = '';
  DOM.detailRating.textContent = '';
  DOM.detailContent.textContent = '';

  DOM.content.style.display = 'none';
  DOM.placeholder.style.display = 'block';
};

if (DOM.reviewsList) {
  DOM.reviewsList.addEventListener('click', (e) => {
    const reviewItem = e.target.closest('.review-item');
    if (!reviewItem) return;

    selectReview(reviewItem);
  });
}

// 3. Delete Logic
if (DOM.btnDeleteReview) {
  DOM.btnDeleteReview.addEventListener('click', async () => {
    if (!currentReviewId) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this review?',
    );
    if (!confirmed) return;

    try {
      DOM.btnDeleteReview.disabled = true;
      DOM.btnDeleteReview.textContent = 'Deleting...';

      const res = await fetch(`/api/v1/reviews/${currentReviewId}`, {
        method: 'DELETE',
      });

      if (res.status === 204 || res.ok) {
        showAlert('success', 'Review deleted successfully!');

        // Remove from DOM
        if (currentActiveItem) {
          currentActiveItem.remove();
        }

        // Clear details pane
        resetDetailsPane();

        // If list is now empty, show empty message
        const remainingItems = document.querySelectorAll('.review-item');
        if (remainingItems.length === 0 && DOM.reviewsList) {
          DOM.reviewsList.innerHTML =
            '<li class="empty-msg">No reviews found.</li>';
        }
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete review');
      }
    } catch (err) {
      showAlert('error', err.message || 'Something went wrong deleting review');
    } finally {
      if (DOM.btnDeleteReview) {
        DOM.btnDeleteReview.disabled = false;
        DOM.btnDeleteReview.textContent = 'Delete Review';
      }
    }
  });
}
