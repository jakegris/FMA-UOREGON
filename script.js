const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navLinks.classList.remove("open"));
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("active");
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

document.querySelectorAll(".tv-widget").forEach((node) => {
  const config = node.getAttribute("data-tv-config");
  const src = node.getAttribute("data-tv-src");
  if (!config || !src) return;

  const mount = document.createElement("div");
  mount.className = "tradingview-widget-container__widget";
  node.appendChild(mount);

  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.type = "text/javascript";
  script.text = config;
  node.appendChild(script);
});

const newsletterForm = document.getElementById("newsletter-form");
const newsletterStatus = document.getElementById("newsletter-status");
const newsletterSubmit = document.getElementById("newsletter-submit");
const googleFormUrl =
  "https://docs.google.com/forms/d/e/1FAIpQLSef0Ly6OzjP2dXy0c-v1MnR-PYU0BFlqtAm4jw91X25wp1GBg/formResponse";

if (newsletterForm && newsletterStatus && newsletterSubmit) {
  newsletterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("newsletter-email")?.value;
    if (!email) return;

    newsletterSubmit.disabled = true;
    newsletterSubmit.textContent = "Subscribing...";

    try {
      const data = new URLSearchParams();
      data.append("entry.772967501", email);

      await fetch(googleFormUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: data.toString(),
      });

      newsletterStatus.textContent = "You are subscribed! Welcome to FMA.";
      newsletterForm.reset();
    } catch {
      newsletterStatus.textContent =
        "Something went wrong. Please try again later.";
    } finally {
      newsletterSubmit.disabled = false;
      newsletterSubmit.textContent = "Subscribe";
    }
  });
}

const contactForm = document.getElementById("contact-form");
const contactStatus = document.getElementById("form-status");
const contactSubmit = document.getElementById("contact-submit");

if (contactForm && contactStatus && contactSubmit) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    contactSubmit.disabled = true;
    contactSubmit.textContent = "Sending...";
    contactStatus.textContent = "";

    try {
      const formData = new FormData(contactForm);
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error("Form submit failed");

      contactStatus.textContent =
        "Message sent successfully! We will get back to you soon.";
      contactForm.reset();
    } catch {
      contactStatus.textContent =
        "Something went wrong. Please email us directly at uofma@uoregon.edu.";
    } finally {
      contactSubmit.disabled = false;
      contactSubmit.textContent = "Send Message";
    }
  });
}

// Testimonial Carousel Auto-scroll
const testimonialTrack = document.querySelector('.testimonials-grid');
if (testimonialTrack) {
    setInterval(() => {
        const card = testimonialTrack.querySelector('.testimonial-card');
        if (!card) return;
        
        // Calculate width of one card + gap (2rem = 32px)
        const cardWidth = card.offsetWidth + 32; 
        
        // If we've reached the end, scroll back to beginning
        if (testimonialTrack.scrollLeft + testimonialTrack.clientWidth >= testimonialTrack.scrollWidth - 10) {
            testimonialTrack.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            testimonialTrack.scrollBy({ left: cardWidth, behavior: 'smooth' });
        }
    }, 4500);
}
