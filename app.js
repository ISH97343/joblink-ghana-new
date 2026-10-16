(() => {
  "use strict";
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");
  const year = document.getElementById("year");
  const form = document.getElementById("jobSearchForm");
  const input = document.getElementById("jobSearch");
  const status = document.getElementById("searchStatus");
  const jobsState = document.getElementById("jobsState");
  const clear = document.getElementById("clearSearch");

  if (year) year.textContent = new Date().getFullYear();

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const open = mainNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(open));
    });
    mainNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    }));
  }

  if (form && input && status && jobsState) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = input.value.trim();
      status.textContent = query ? `Search requested: “${query}”` : "Enter a job title or keyword to begin.";
      jobsState.querySelector("h3").textContent = query ? `Ready to search for “${query}”` : "Job listings will appear here";
      jobsState.querySelector("p").textContent = query
        ? "The website is responding. Live results will be enabled when the job database is connected."
        : "This starter website is ready to connect to your JobLink Ghana database.";
    });
  }

  if (clear && input && status && jobsState) {
    clear.addEventListener("click", () => {
      input.value = "";
      status.textContent = "Your job search starts here.";
      jobsState.querySelector("h3").textContent = "Job listings will appear here";
      jobsState.querySelector("p").textContent = "This starter website is ready to connect to your JobLink Ghana database.";
    });
  }
  console.info("JobLink Ghana starter loaded successfully.");
})();
