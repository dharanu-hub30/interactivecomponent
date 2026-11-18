(function () {
  "use strict";

  /* ---------- Question bank ---------- */
  var BANK = [
    { q: "In web design, what does CSS stand for?",
      a: ["Cascading Style Sheets", "Counter Strike: Source", "Corrective Style Sheet", "Computer Style Sheet"],
      c: 0, why: "CSS stands for Cascading Style Sheets. It controls how HTML elements look." },
    { q: "Which JavaScript method selects an element by its id?",
      a: ["document.getElementById()", "document.findId()", "window.selectId()", "document.pickElement()"],
      c: 0, why: "getElementById() returns the one element with that id from the DOM." },
    { q: "What does DOM stand for?",
      a: ["Document Object Model", "Data Output Method", "Digital Object Map", "Display Order Menu"],
      c: 0, why: "The Document Object Model is a tree of objects that represents the page." },
    { q: "Which method attaches an event handler to an element?",
      a: ["addEventListener()", "attachScript()", "onTrigger()", "bindClickOnly()"],
      c: 0, why: "addEventListener() runs a function whenever the chosen event, like a click, fires." },
    { q: "Which CSS property makes a change between two states look smooth?",
      a: ["transition", "display", "position", "overflow"],
      c: 0, why: "transition animates property changes over a set time, such as a button changing colour." },
    { q: "Which libraries are commonly used to manage state in interactive components?",
      a: ["React and Vue.js", "Photoshop and Figma", "Excel and Word", "Docker and Git"],
      c: 0, why: "React and Vue.js update only the parts of the page that changed, without a full reload." },
    { q: "Which feature helps screen readers understand custom interactive components?",
      a: ["ARIA attributes", "Larger images", "Bold text only", "Auto-playing sound"],
      c: 0, why: "ARIA roles and labels describe a component's purpose to assistive technology." },
    { q: "Roughly at what wind speed does a typical large turbine reach its rated output? (illustrative)",
      a: ["About 12 m/s", "About 1 m/s", "About 40 m/s", "About 90 m/s"],
      c: 0, why: "Most large turbines reach rated power near 12 m/s, and shut down in storms to protect themselves." }
  ];

  var TIME_PER_Q = 20; // seconds
  var KEY = "windwave-quiz-best";

  /* ---------- Element references ---------- */
  function $(id) { return document.getElementById(id); }
  var elPlay = $("qzw-play"), elEnd = $("qzw-end");
  var elQn = $("qzw-qn"), elProg = $("qzw-prog"), elProgFill = $("qzw-prog-fill");
  var elScore = $("qzw-score"), elMeter = $("qzw-meter-fill");
  var elQ = $("qzw-q"), elOpts = $("qzw-opts"), elFb = $("qzw-feedback");
  var elNext = $("qzw-next"), elHint = $("qzw-hint");
  var elRing = $("qzw-ring-fg"), elFinal = $("qzw-final"), elFinalOf = $("qzw-final-of");
  var elRank = $("qzw-rank"), elRankText = $("qzw-rank-text"), elBest = $("qzw-best");
  var elReview = $("qzw-review");

  /* ---------- State ---------- */
  var order = [];      // shuffled question indexes
  var current = 0;
  var score = 0;
  var answered = false;
  var results = [];    // { q, picked, correct, ok }
  var shown = [];      // shuffled options for the current question: { text, isCorrect }
  var tick = null;
  var deadline = 0;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- Timer ---------- */
  function stopTimer() { if (tick) { clearInterval(tick); tick = null; } }

  function startTimer() {
    stopTimer();
    deadline = Date.now() + TIME_PER_Q * 1000;
    elMeter.style.transform = "scaleX(1)";
    elHint.textContent = "Time left: " + TIME_PER_Q + "s";
    tick = setInterval(function () {
      var left = Math.max(0, deadline - Date.now());
      elMeter.style.transform = "scaleX(" + (left / (TIME_PER_Q * 1000)) + ")";
      elHint.textContent = "Time left: " + Math.ceil(left / 1000) + "s";
      if (left <= 0) { stopTimer(); lockAnswer(-1); }
    }, 100);
  }

  /* ---------- Render a question ---------- */
  function showQuestion() {
    answered = false;
    var item = BANK[order[current]];
    var total = order.length;

    elQn.textContent = "Question " + (current + 1) + "/" + total;
    var pct = Math.round((current / total) * 100);
    elProgFill.style.width = pct + "%";
    elProg.setAttribute("aria-valuenow", pct);

    elQ.textContent = item.q;
    elQ.classList.remove("qzw-swap");
    void elQ.offsetWidth; // restart the entrance animation
    elQ.classList.add("qzw-swap");

    shown = shuffle(item.a.map(function (text, i) { return { text: text, isCorrect: i === item.c }; }));

    elOpts.innerHTML = "";
    shown.forEach(function (opt, i) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "qzw-opt";
      btn.style.animationDelay = (i * 70) + "ms";
      var letter = document.createElement("span");
      letter.className = "qzw-letter";
      letter.textContent = String.fromCharCode(65 + i);
      var text = document.createElement("span");
      text.className = "qzw-text";
      text.textContent = opt.text;
      btn.appendChild(letter);
      btn.appendChild(text);
      btn.addEventListener("click", function () { lockAnswer(i); });
      li.appendChild(btn);
      elOpts.appendChild(li);
    });

    elFb.hidden = true;
    elFb.className = "qzw-feedback";
    elNext.disabled = true;
    elNext.textContent = current === total - 1 ? "See results →" : "Next question →";
    startTimer();
  }

  /* ---------- Answer handling ---------- */
  // picked = index of chosen option, or -1 when time ran out
  function lockAnswer(picked) {
    if (answered) return;
    answered = true;
    stopTimer();

    var item = BANK[order[current]];
    var buttons = elOpts.querySelectorAll(".qzw-opt");
    var ok = picked >= 0 && shown[picked].isCorrect;

    Array.prototype.forEach.call(buttons, function (b, i) {
      b.disabled = true;
      if (shown[i].isCorrect) b.classList.add("qzw-correct");
      else if (i === picked) b.classList.add("qzw-wrong");
      else b.classList.add("qzw-faded");
    });

    if (ok) {
      score++;
      elScore.textContent = score;
      elScore.classList.remove("qzw-bump");
      void elScore.offsetWidth;
      elScore.classList.add("qzw-bump");
    }

    elFb.hidden = false;
    elFb.classList.add(ok ? "qzw-fb-good" : "qzw-fb-bad");
    elFb.textContent = (ok ? "Correct! " : picked === -1 ? "Time is up. " : "Not quite. ") + item.why;

    var correctText = shown.filter(function (s) { return s.isCorrect; })[0].text;
    results.push({ q: item.q, picked: picked >= 0 ? shown[picked].text : "No answer", correct: correctText, ok: ok });

    elHint.textContent = ok ? "Nice work." : "Check the green answer.";
    elNext.disabled = false;
    elNext.focus();
  }

  function next() {
    if (!answered) return;
    if (current < order.length - 1) {
      current++;
      showQuestion();
    } else {
      showResults();
    }
  }

  /* ---------- Results ---------- */
  function getBest() {
    try { return Number(localStorage.getItem(KEY)) || 0; } catch (e) { return 0; }
  }
  function setBest(v) {
    try { localStorage.setItem(KEY, String(v)); } catch (e) { /* storage blocked: ignore */ }
  }

  function showResults() {
    stopTimer();
    var total = order.length;
    elProgFill.style.width = "100%";
    elPlay.hidden = true;
    elEnd.hidden = false;

    elFinal.textContent = score;
    elFinalOf.textContent = "/ " + total;

    var frac = score / total;
    // 327 is the circle's circumference (2 * PI * 52)
    elRing.style.strokeDashoffset = "327";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { elRing.style.strokeDashoffset = String(327 * (1 - frac)); });
    });

    if (frac === 1) { elRank.textContent = "Wind master!"; elRankText.textContent = "Perfect score. You know your interactive components."; }
    else if (frac >= 0.75) { elRank.textContent = "Great job!"; elRankText.textContent = "A strong result. Review the green answers to close the gap."; }
    else if (frac >= 0.5) { elRank.textContent = "Getting there"; elRankText.textContent = "Good start. Read the theory section again and retry."; }
    else { elRank.textContent = "Keep practising"; elRankText.textContent = "Review the theory above, then play again."; }

    var best = getBest();
    if (score > best) { setBest(score); elBest.textContent = best === 0 ? "First score saved: " + score : "New best score: " + score + "!"; }
    else { elBest.textContent = "Best score: " + best; }

    elReview.innerHTML = "";
    results.forEach(function (r) {
      var li = document.createElement("li");
      if (r.ok) li.className = "qzw-r-ok";
      li.appendChild(document.createTextNode(r.q));
      var small = document.createElement("small");
      small.textContent = r.ok ? "Your answer: " + r.picked : "Your answer: " + r.picked + " | Correct: " + r.correct;
      li.appendChild(small);
      elReview.appendChild(li);
    });
    elReview.hidden = true;
    $("qzw-review-btn").textContent = "Review answers";
    $("qzw-again").focus();
  }

  function start() {
    order = shuffle(BANK.map(function (_, i) { return i; }));
    current = 0;
    score = 0;
    results = [];
    elScore.textContent = "0";
    elEnd.hidden = true;
    elPlay.hidden = false;
    showQuestion();
  }

  /* ---------- Events ---------- */
  elNext.addEventListener("click", next);
  $("qzw-again").addEventListener("click", start);
  $("qzw-review-btn").addEventListener("click", function () {
    elReview.hidden = !elReview.hidden;
    this.textContent = elReview.hidden ? "Review answers" : "Hide review";
  });

  // Keyboard: A-D choose, Enter goes to the next question
  document.addEventListener("keydown", function (e) {
    if (elPlay.hidden) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.toLowerCase();
    if (!answered && k >= "a" && k <= "d") {
      var idx = k.charCodeAt(0) - 97;
      if (idx < shown.length) { e.preventDefault(); lockAnswer(idx); }
    } else if (answered && e.key === "Enter" && e.target === document.body) {
      e.preventDefault();
      next();
    }
  });

  // Pause the clock fairly if the tab is hidden
  document.addEventListener("visibilitychange", function () {
    if (document.hidden || answered || elPlay.hidden) return;
    deadline = Math.max(deadline, Date.now() + 3000);
  });

  start();
})();
