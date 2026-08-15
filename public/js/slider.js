document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.hero__slide');
  const counterText = document.querySelector('.hero__slider-counter-text');

  if (!slides.length) return;

  let currentSlide = 0;
  const maxSlide = slides.length;

  const updateCounter = (index) => {
    if (!counterText) return;
    const currentNum = String(index + 1).padStart(2, '0');
    const totalNum = String(maxSlide).padStart(2, '0');
    counterText.textContent = `${currentNum} / ${totalNum}`;
  };

  const nextSlide = () => {
    slides[currentSlide].classList.remove('hero__slide--active');
    currentSlide = (currentSlide + 1) % maxSlide;
    slides[currentSlide].classList.add('hero__slide--active');
    updateCounter(currentSlide);
  };

  setInterval(nextSlide, 5000);
});
