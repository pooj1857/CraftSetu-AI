document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("learning-app");
  if (!app) return;
  const craftData = JSON.parse(document.getElementById("craft-data").textContent);
  const bySlug = Object.fromEntries(craftData.map(c => [c.slug, c]));
  const craftSelect = document.getElementById("craft-select");
  const languageSelect = document.getElementById("language-select");
  const tabs = [...document.querySelectorAll(".lesson-tab")];
  const panelTitle = document.querySelector("#lesson-panel h3");
  const lessonCopy = document.getElementById("lesson-copy");
  const lessonKicker = document.querySelector(".lesson-kicker");
  const previous = document.getElementById("previous-step");
  const next = document.getElementById("next-step");
  const steps = [
    c => ({title:"A tradition with a story", copy:c.history, tip:"Look for the stories, places and people connected to this tradition."}),
    c => ({title:"Materials and tools", copy:c.materials, tip:"Start with safe, simple practice materials. Some tools and processes need expert supervision."}),
    c => ({title:"Your first practice", copy:`Begin by observing examples of ${c.name}. Sketch or plan a simple motif, prepare your work area, and practise one small element before attempting a complete piece. ${c.level === "Advanced" ? "For this craft, learn practical techniques with a trained artisan and appropriate safety equipment." : "Keep your first attempt small and focus on the basic shapes or techniques."}`, tip:"Progress comes from patient practice. Ask a local artisan about regional variations whenever possible."}),
    c => ({title:"Culture and continuity", copy:c.significance, tip:"Respect the communities who sustain this knowledge. Credit artisans and avoid treating sacred or community-specific motifs as generic decoration."})
  ];
  let activeStep = 0;
  let savedStep = 0;
  let completed = false;
  const params = new URLSearchParams(location.search);
  if (params.get("language")) languageSelect.value = params.get("language");
  function renderStep(step) {
    activeStep = Math.max(0, Math.min(3, step));
    const c = bySlug[craftSelect.value];
    const info = steps[activeStep](c);
    panelTitle.textContent = info.title;
    lessonCopy.textContent = info.copy;
    lessonKicker.textContent = `LESSON 0${activeStep + 1}`;
    tabs.forEach((tab, i) => tab.classList.toggle("active", i === activeStep));
    previous.disabled = activeStep === 0;
    next.textContent = activeStep === 3 ? (completed ? "Completed ✓" : "Complete learning path ✓") : "Mark step complete →";
    const percent = completed ? 100 : Math.max(savedStep, activeStep) * 25;
    document.getElementById("progress-percent").textContent = percent;
    document.getElementById("progress-bar").style.width = `${percent}%`;
    document.getElementById("sidebar-craft-name").textContent = c.name;
    document.getElementById("sidebar-region").textContent = c.region;
    document.getElementById("craft-title").textContent = c.name;
    document.getElementById("craft-history").textContent = c.history;
  }
  async function loadSaved() {
    // Saved state is loaded when the learner reopens a craft via its saved dashboard link.
    // The server preloads the current craft's saved step into the page progress meter.
    const percent = parseInt(document.getElementById("progress-percent").textContent || "0", 10);
    savedStep = Math.min(4, Math.round(percent / 25));
    completed = percent === 100;
    renderStep(Math.min(3, savedStep));
  }
  tabs.forEach(tab => tab.addEventListener("click", () => renderStep(Number(tab.dataset.step))));
  previous.addEventListener("click", () => renderStep(activeStep - 1));
  next.addEventListener("click", async () => {
    if (activeStep < 3) {
      savedStep = Math.max(savedStep, activeStep + 1);
      renderStep(activeStep + 1);
    } else {
      completed = true;
      await saveProgress();
      renderStep(3);
    }
  });
  craftSelect.addEventListener("change", () => {
    const url = new URL(location.href);
    url.searchParams.set("craft", craftSelect.value);
    url.searchParams.set("language", languageSelect.value);
    location.href = url.toString();
  });
  languageSelect.addEventListener("change", () => {
    const url = new URL(location.href);
    url.searchParams.set("craft", craftSelect.value);
    url.searchParams.set("language", languageSelect.value);
    history.replaceState({}, "", url);
  });
  const form = document.getElementById("ask-form");
 
form.addEventListener("submit", async e => {
  e.preventDefault();

  const question = document.getElementById("ai-question").value.trim();
  const responseBox = document.getElementById("ai-response");
  const button = document.getElementById("ask-button");

  if (!question) return;

  button.disabled = true;
  button.innerHTML = "✳ Thinking...";
  responseBox.classList.remove("hidden", "error");
  responseBox.classList.add("ai-answer-loading");
  responseBox.replaceChildren();

  const loading = document.createElement("p");
  loading.textContent = "Your craft lesson is being prepared...";
  responseBox.appendChild(loading);

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        craft: craftSelect.value,
        language: languageSelect.value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "The AI request failed.");
    }

    responseBox.replaceChildren();
    responseBox.classList.remove("ai-answer-loading");

    const header = document.createElement("div");
    header.className = "ai-answer-header";

    const icon = document.createElement("span");
    icon.className = "ai-answer-icon";
    icon.textContent = "✳";

    const headingWrap = document.createElement("div");

    const eyebrow = document.createElement("span");
    eyebrow.className = "ai-answer-eyebrow";
    eyebrow.textContent = "YOUR PERSONAL CRAFT LESSON";

    const heading = document.createElement("h3");
    heading.textContent = "Here's what you need to know";

    headingWrap.append(eyebrow, heading);
    header.append(icon, headingWrap);
    responseBox.appendChild(header);

    const divider = document.createElement("div");
    divider.className = "ai-answer-divider";
    responseBox.appendChild(divider);

    const content = document.createElement("div");
    content.className = "ai-answer-content";

    // Format headings, paragraphs, and simple lists safely.
    // All AI-provided text is inserted using textContent.
    const lines = String(data.answer || "No answer was returned.")
      .replace(/\r\n/g, "\n")
      .split("\n");

    let list = null;

    lines.forEach(line => {
      const trimmed = line.trim();

      if (!trimmed) {
        list = null;
        return;
      }

      const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
      const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
      const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);

      if (headingMatch) {
        list = null;
        const h = document.createElement("h4");
        h.textContent = headingMatch[1].replace(/\*\*/g, "");
        content.appendChild(h);
      } else if (numberedMatch || bulletMatch) {
        if (!list) {
          list = document.createElement(
            numberedMatch ? "ol" : "ul"
          );
          content.appendChild(list);
        }

        const item = document.createElement("li");
        item.textContent = (numberedMatch || bulletMatch)[1]
          .replace(/\*\*/g, "");
        list.appendChild(item);
      } else {
        list = null;
        const paragraph = document.createElement("p");
        paragraph.textContent = trimmed.replace(/\*\*/g, "");
        content.appendChild(paragraph);
      }
    });

    responseBox.appendChild(content);

    const footer = document.createElement("div");
    footer.className = "ai-answer-footer";
    footer.textContent =
      "✦ Keep learning • Practise patiently • Respect artisan knowledge";

    responseBox.appendChild(footer);

  } catch (err) {
    responseBox.classList.remove("ai-answer-loading");
    responseBox.classList.add("error");
    responseBox.textContent =
      err.message || "Could not connect to the AI service.";
  } finally {
    button.disabled = false;
    button.innerHTML = 'Ask AI <span>↗</span>';
  }
});

  async function saveProgress() {
    const status = document.getElementById("save-status");
    status.textContent = "Saving…";
    try {
      const response = await fetch("/api/progress", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          craft: craftSelect.value, language: languageSelect.value,
          step: completed ? 4 : Math.max(savedStep, activeStep),
          completed, notes: document.getElementById("learning-notes").value
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed.");
      status.textContent = data.message;
      document.getElementById("progress-percent").textContent = completed ? "100" : String(Math.max(savedStep, activeStep) * 25);
      document.getElementById("progress-bar").style.width = `${completed ? 100 : Math.max(savedStep, activeStep) * 25}%`;
    } catch (err) { status.textContent = err.message; }
  }
  document.getElementById("save-progress").addEventListener("click", saveProgress);
  loadSaved();
});
