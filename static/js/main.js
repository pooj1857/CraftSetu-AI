document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav-links");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }
  const search = document.getElementById("craft-search");
  if (search) {
    const cards = [...document.querySelectorAll(".craft-card")];
    const empty = document.getElementById("empty-search");
    search.addEventListener("input", () => {
      const term = search.value.toLowerCase().trim();
      let shown = 0;
      cards.forEach(card => {
        const match = card.dataset.search.includes(term);
        card.classList.toggle("hidden", !match);
        if (match) shown++;
      });
      if (empty) empty.classList.toggle("hidden", shown !== 0);
    });
  }
});
