
document.addEventListener("DOMContentLoaded", () => {
  const setup = document.getElementById("quiz-setup");
  const craftSelect = document.getElementById("craft-category");
  const languageSelect = document.getElementById("quiz-language");
  const difficultySelect = document.getElementById("difficulty");
  const startButton = document.getElementById("start-quiz");
  const changeButton = document.getElementById("change-settings");
  const quizArea = document.getElementById("quiz-area");
  const questionsBox = document.getElementById("quiz-questions");
  const loadingBox = document.getElementById("quiz-loading");
  const errorBox = document.getElementById("setup-error");
  const title = document.getElementById("selected-quiz-title");
  const details = document.getElementById("selected-quiz-details");
  const answeredCount = document.getElementById("answered-count");

  let currentQuizId = null;
  let submitted = false;

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
  }

  function clearError() {
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
  }

  function updateAnsweredCount() {
    const fields = [...questionsBox.querySelectorAll("fieldset")];
    const answered = fields.filter(
      field => field.querySelector("input:checked")
    ).length;

    if (answeredCount) {
      answeredCount.textContent =
        `${answered} of ${fields.length} questions answered`;
    }
  }

  function renderQuestions(questions) {
    questionsBox.replaceChildren();

    questions.forEach((question, index) => {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "quiz-question";
      fieldset.dataset.id = String(question.id);

      const legend = document.createElement("legend");
      const number = document.createElement("span");
      number.className = "question-number";
      number.textContent = String(index + 1).padStart(2, "0");
      legend.append(number, document.createTextNode(` ${question.question}`));
      fieldset.appendChild(legend);

      const optionsBox = document.createElement("div");
      optionsBox.className = "answer-options";

      question.options.forEach((option, optionIndex) => {
        const label = document.createElement("label");
        label.className = "answer-option";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = `q${question.id}`;
        input.value = String(optionIndex);
        input.addEventListener("change", updateAnsweredCount);

        const text = document.createElement("span");
        text.textContent = option;

        label.append(input, text);
        optionsBox.appendChild(label);
      });

      fieldset.appendChild(optionsBox);
      questionsBox.appendChild(fieldset);
    });

    updateAnsweredCount();
  }

  // Generate a new AI quiz
  startButton.addEventListener("click", async event => {
    event.preventDefault();
    clearError();

    const craft_slug = craftSelect.value;
    const language = languageSelect.value;
    const difficulty = difficultySelect.value;

    if (!craft_slug || !language || !difficulty) {
      showError("Please select a craft, language and difficulty first.");
      return;
    }

    startButton.disabled = true;
    setup.classList.add("hidden");
    quizArea.classList.add("hidden");
    loadingBox?.classList.remove("hidden");

    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ craft_slug, language, difficulty })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not generate your quiz.");
      }

      if (!data.quiz_id || !Array.isArray(data.questions) ||
          data.questions.length === 0) {
        throw new Error("Quiz ID or questions are missing. Please try again.");
      }

      currentQuizId = data.quiz_id;
      submitted = false;

      renderQuestions(data.questions);

      title.textContent = `${data.craft_name} Quiz`;
      details.textContent =
        `${data.language} · ${data.difficulty} · ${data.questions.length} AI-generated questions`;

      quizArea.classList.remove("hidden");
      quizArea.scrollIntoView({ behavior: "smooth", block: "start" });

    } catch (error) {
      setup.classList.remove("hidden");
      showError(error.message || "Could not generate your quiz.");
    } finally {
      loadingBox?.classList.add("hidden");
      startButton.disabled = false;
    }
  });

  // Submit answers and save the attempt to SQLite
  const submitButton = document.getElementById("submit-quiz");

  if (submitButton) {
    submitButton.addEventListener("click", async () => {
      if (submitted || !currentQuizId) {
        showError("Please generate a new quiz first.");
        return;
      }

      const answers = {};

      questionsBox.querySelectorAll("fieldset").forEach(fieldset => {
        const selected = fieldset.querySelector("input:checked");

        if (selected) {
          answers[fieldset.dataset.id] = Number(selected.value);
        }
      });

      submitButton.disabled = true;
      clearError();

      try {
        const response = await fetch("/api/quiz/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quiz_id: currentQuizId,
            answers
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not save your quiz attempt.");
        }

        submitted = true;

        // Show the score returned by the backend
        let result = document.getElementById("quiz-result");

        if (!result) {
          result = document.createElement("div");
          result.id = "quiz-result";
          quizArea.appendChild(result);
        }

        result.replaceChildren();

        const heading = document.createElement("h2");
        heading.textContent = "Quiz Result";

        const score = document.createElement("p");
        score.textContent =
          `Your score: ${data.score}/${data.total} (${data.percentage}%)`;

        const saved = document.createElement("p");
        saved.textContent =
          "Your quiz attempt has been saved. Visit My Learning to see your history.";

        result.append(heading, score, saved);

        // Reveal correct answers and explanations if the page has them
        data.results.forEach(item => {
          const fieldset = questionsBox.querySelector(
            `fieldset[data-id="${item.id}"]`
          );

          if (!fieldset) return;

          const feedback = document.createElement("p");
          feedback.textContent =
            `Correct answer: ${item.answer}. ${item.explanation}`;
          fieldset.appendChild(feedback);

          fieldset.querySelectorAll("input").forEach(input => {
            input.disabled = true;
          });
        });

        updateAnsweredCount();

      } catch (error) {
        showError(error.message || "Could not save your quiz attempt.");
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  // Return to quiz setup
  changeButton.addEventListener("click", () => {
    quizArea.classList.add("hidden");
    setup.classList.remove("hidden");
    questionsBox.replaceChildren();
    clearError();
    currentQuizId = null;
    submitted = false;

    const result = document.getElementById("quiz-result");
    if (result) result.replaceChildren();

    if (submitButton) submitButton.disabled = false;

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});
