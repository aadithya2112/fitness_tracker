const images = document.querySelectorAll("img[data-src]");

const options = {
  rootMargin: "0px",
  threshold: 0.1,
};

const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const img = entry.target;
      const src = img.getAttribute("data-src");

      img.setAttribute("src", src);
      img.removeAttribute("data-src");

      observer.unobserve(img);
    }
  });
}, options);

images.forEach((img) => {
  observer.observe(img);
});