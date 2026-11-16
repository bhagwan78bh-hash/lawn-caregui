/* ============================================================
   lawncaregui — interactions
   Vanilla JS, no dependencies.
   ============================================================ */
(function () {
  "use strict";

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     Header, scroll state, active navigation, back to top
  --------------------------------------------------------- */
  const header = $("#siteHeader");
  const toTop = $("#toTop");
  const navLinks = $$(".nav-link");
  const navSections = navLinks
    .map((link) => {
      const id = link.getAttribute("href");
      return { link, section: id && id.startsWith("#") ? $(id) : null };
    })
    .filter((item) => item.section);

  let scrollQueued = false;

  function updateOnScroll() {
    scrollQueued = false;
    const y = window.scrollY;

    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (toTop) toTop.classList.toggle("is-visible", y > 720);

    const probe = y + 140;
    let current = "";
    navSections.forEach(({ section }) => {
      if (section.getBoundingClientRect().top + y <= probe) current = section.id;
    });

    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === "#" + current;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  function queueScrollUpdate() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(updateOnScroll);
  }

  window.addEventListener("scroll", queueScrollUpdate, { passive: true });
  updateOnScroll();

  if (toTop) {
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------------------------------------------------------
     Mobile navigation
  --------------------------------------------------------- */
  const navToggle = $(".nav-toggle");
  const nav = $("#primaryNav");
  const desktopQuery = window.matchMedia("(min-width: 901px)");

  function setMenu(open, returnFocus) {
    if (!nav || !navToggle) return;
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("no-scroll", open);
    if (!open && returnFocus) navToggle.focus();
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      setMenu(!nav.classList.contains("is-open"));
    });

    $$("a", nav).forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setMenu(false, true);
      }
    });

    const onDesktop = (event) => {
      if (event.matches) setMenu(false);
    };
    if (desktopQuery.addEventListener) desktopQuery.addEventListener("change", onDesktop);
    else desktopQuery.addListener(onDesktop);
  }

  /* ---------------------------------------------------------
     Comparison table swipe hint (mobile)
  --------------------------------------------------------- */
  const compareScroll = $(".compare-scroll");
  const compareHint = $(".compare-hint");

  if (compareScroll && compareHint) {
    compareScroll.addEventListener(
      "scroll",
      () => compareHint.classList.add("is-dismissed"),
      { passive: true, once: true }
    );
  }

  /* ---------------------------------------------------------
     Reveal on scroll
  --------------------------------------------------------- */
  const revealItems = $$(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((el) => el.classList.add("is-visible"));
  } else {
    $$(".stagger").forEach((group) => {
      $$(":scope > .reveal", group).forEach((el, index) => {
        el.style.setProperty("--reveal-delay", index * 70 + "ms");
      });
    });

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    revealItems.forEach((el) => revealObserver.observe(el));
  }

  /* ---------------------------------------------------------
     Stat counters
  --------------------------------------------------------- */
  const counters = $$("[data-count]");

  function runCounter(el) {
    const target = parseFloat(el.dataset.count);
    if (!Number.isFinite(target)) return;
    const suffix = el.dataset.suffix || "";
    const duration = 1400;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) window.requestAnimationFrame(tick);
    }

    window.requestAnimationFrame(tick);
  }

  if (counters.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      counters.forEach((el) => {
        el.textContent = el.dataset.count + (el.dataset.suffix || "");
      });
    } else {
      const counterObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            runCounter(entry.target);
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.6 }
      );
      counters.forEach((el) => counterObserver.observe(el));
    }
  }

  /* ---------------------------------------------------------
     Accordions (care guide + FAQ)
  --------------------------------------------------------- */
  $$("[data-accordion]").forEach((root) => {
    const triggers = $$(".acc-trigger", root);

    function closeItem(item) {
      item.classList.remove("is-open");
      const trigger = $(".acc-trigger", item);
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    }

    function openItem(item) {
      item.classList.add("is-open");
      const trigger = $(".acc-trigger", item);
      if (trigger) trigger.setAttribute("aria-expanded", "true");
    }

    triggers.forEach((trigger, index) => {
      trigger.addEventListener("click", () => {
        const item = trigger.closest(".acc-item");
        if (!item) return;
        const isOpen = item.classList.contains("is-open");

        $$(".acc-item", root).forEach((other) => {
          if (other !== item) closeItem(other);
        });

        if (isOpen) closeItem(item);
        else openItem(item);
      });

      trigger.addEventListener("keydown", (event) => {
        let nextIndex = null;
        if (event.key === "ArrowDown") nextIndex = (index + 1) % triggers.length;
        else if (event.key === "ArrowUp") nextIndex = (index - 1 + triggers.length) % triggers.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = triggers.length - 1;

        if (nextIndex !== null) {
          event.preventDefault();
          triggers[nextIndex].focus();
        }
      });
    });
  });

  /* ---------------------------------------------------------
     Legal dialogs
  --------------------------------------------------------- */
  const dialogs = $$(".legal-dialog");
  const hashToDialog = { "#terms": "termsDialog", "#privacy": "privacyDialog" };
  const dialogToHash = { termsDialog: "#terms", privacyDialog: "#privacy" };

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog || typeof dialog.showModal !== "function") return;

    setMenu(false);
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("dialog-open");

    const hash = dialogToHash[id];
    if (hash && window.history.replaceState) {
      window.history.replaceState(null, "", hash);
    }
  }

  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    dialog.close();
  }

  $$("[data-open-dialog]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openDialog(button.dataset.openDialog);
    });
  });

  $$("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      closeDialog(button.closest("dialog"));
    });
  });

  dialogs.forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("close", () => {
      document.body.classList.remove("dialog-open");
      const hash = dialogToHash[dialog.id];
      if (hash && window.location.hash === hash && window.history.replaceState) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    });
  });

  function openDialogFromHash() {
    const id = hashToDialog[window.location.hash];
    if (id) openDialog(id);
  }

  openDialogFromHash();
  window.addEventListener("hashchange", () => {
    if (hashToDialog[window.location.hash]) openDialogFromHash();
  });

  /* ---------------------------------------------------------
     Cookie notice (localStorage)
  --------------------------------------------------------- */
  const cookieKey = "lcg-cookie-choice";
  const cookieBanner = $("#cookieBanner");
  let storedChoice = null;

  try {
    storedChoice = window.localStorage.getItem(cookieKey);
  } catch (error) {
    storedChoice = null;
  }

  function showCookieBanner() {
    if (!cookieBanner) return;
    cookieBanner.hidden = false;
    document.body.classList.add("has-cookie");
  }

  function hideCookieBanner() {
    if (!cookieBanner) return;
    cookieBanner.hidden = true;
    document.body.classList.remove("has-cookie");
  }

  if (cookieBanner) {
    if (!storedChoice) {
      window.setTimeout(showCookieBanner, 1500);
    }

    $$("[data-cookie]").forEach((button) => {
      button.addEventListener("click", () => {
        const choice = button.dataset.cookie;
        try {
          window.localStorage.setItem(cookieKey, choice);
        } catch (error) {
          /* Storage may be unavailable in private modes; the notice still closes. */
        }
        hideCookieBanner();

        if (choice === "accepted") {
          /* Add privacy-friendly analytics initialisation here. */
        }
      });
    });
  }

  $$("[data-cookie-reset]").forEach((button) => {
    button.addEventListener("click", () => {
      try {
        window.localStorage.removeItem(cookieKey);
      } catch (error) {
        /* Ignore unavailable storage. */
      }
      const parentDialog = button.closest("dialog");
      if (parentDialog) closeDialog(parentDialog);
      showCookieBanner();
    });
  });

  /* ---------------------------------------------------------
     Quote form
  --------------------------------------------------------- */
  const form = $("#quoteForm");
  const formSuccess = $("#formSuccess");
  const formSuccessText = $("#formSuccessText");
  const formStatus = $("#formStatus");
  const formReset = $("#formReset");

  if (form && formSuccess) {
    const fields = {
      name: {
        input: $("#name"),
        error: $("#nameError"),
        validate(value) {
          return value.trim().length >= 2 ? "" : "Please tell us your name.";
        },
      },
      phone: {
        input: $("#phone"),
        error: $("#phoneError"),
        validate(value) {
          const digits = value.replace(/\D/g, "");
          if (!digits) return "Please add a phone number so we can reply.";
          if (digits.length < 10 || digits.length > 13) {
            return "Enter a valid phone number, e.g. +91 98765 43210.";
          }
          return "";
        },
      },
      email: {
        input: $("#email"),
        error: $("#emailError"),
        validate(value) {
          if (!value.trim()) return "";
          return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
            ? ""
            : "That email address does not look right.";
        },
      },
      consent: {
        input: $("#consent"),
        error: $("#consentError"),
        validate(input) {
          return input.checked ? "" : "Please accept the privacy policy to continue.";
        },
      },
    };

    let attempted = false;

    function setFieldError(field, message) {
      const wrapper = field.input.closest(".field");
      if (wrapper) wrapper.classList.toggle("has-error", Boolean(message));
      if (field.error) field.error.textContent = message || "";
    }

    function validateField(field) {
      const message = field.validate(field.input.value, field.input);
      setFieldError(field, message);
      return !message;
    }

    function validateForm() {
      let firstInvalid = null;
      Object.keys(fields).forEach((key) => {
        const valid = validateField(fields[key]);
        if (!valid && !firstInvalid) firstInvalid = fields[key].input;
      });
      return firstInvalid;
    }

    Object.keys(fields).forEach((key) => {
      const field = fields[key];
      if (!field.input) return;

      field.input.addEventListener("blur", () => {
        if (attempted || field.input.value) validateField(field);
      });

      field.input.addEventListener("input", () => {
        if (attempted) validateField(field);
        else if (field.error && field.error.textContent) validateField(field);
      });

      field.input.addEventListener("change", () => {
        if (attempted) validateField(field);
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      attempted = true;

      const firstInvalid = validateForm();
      if (firstInvalid) {
        if (formStatus) {
          formStatus.hidden = false;
          formStatus.textContent = "Please check the highlighted fields and try again.";
        }
        firstInvalid.focus();
        return;
      }

      if (formStatus) formStatus.hidden = true;

      const nameValue = fields.name.input.value.trim();
      const firstName = nameValue.split(/\s+/)[0];
      const phoneValue = fields.phone.input.value.trim();

      if (formSuccessText) {
        formSuccessText.textContent =
          "Thank you, " + firstName + ". We will call you on " + phoneValue +
          " within one working day to arrange the site visit. If it is urgent, WhatsApp us and we will pick it up sooner.";
      }

      /* Hook your backend or form service here (fetch POST, Formspree, etc.). */
      form.hidden = true;
      formSuccess.hidden = false;
      formSuccess.focus();
    });

    if (formReset) {
      formReset.addEventListener("click", () => {
        form.reset();
        attempted = false;
        Object.keys(fields).forEach((key) => setFieldError(fields[key], ""));
        if (formStatus) formStatus.hidden = true;
        formSuccess.hidden = true;
        form.hidden = false;
        fields.name.input.focus();
      });
    }
  }

  /* ---------------------------------------------------------
     Print care checklist
  --------------------------------------------------------- */
  const printButton = $("#printGuide");
  if (printButton) {
    printButton.addEventListener("click", () => window.print());
  }

  /* ---------------------------------------------------------
     Footer year
  --------------------------------------------------------- */
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
