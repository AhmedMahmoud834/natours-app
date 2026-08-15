/* eslint-disable */
(() => {
  let lastScrollTop = 0;

  const initSmartHeader = () => {
    const header = document.querySelector('.header');
    if (!header) return;

    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;

      // Transparency / Glassmorphism logic
      if (scrollTop > 50) {
        header.classList.add('header--scrolled');
      } else {
        header.classList.remove('header--scrolled');
      }

      // Hide / Show visibility logic
      if (scrollTop > lastScrollTop && scrollTop > header.offsetHeight) {
        header.classList.add('header--hidden');
      } else {
        header.classList.remove('header--hidden');
      }

      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    };

    window.addEventListener('scroll', handleScroll);
    // Initial check on load
    handleScroll();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSmartHeader);
  } else {
    initSmartHeader();
  }
})();
