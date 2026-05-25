const reportData = {
  metrics: [
    {
      value: "66%",
      label: "Reading Mode připravenost",
      detail: "Funguje jako kouč, ne jako přesný book reader.",
      color: "amber",
    },
    {
      value: "3",
      label: "P0/P1 nálezy",
      detail: "Progress, UI overlay, bezpečnost tisku slovníčku.",
      color: "red",
    },
    {
      value: "5",
      label: "Stavů Live pipeline",
      detail: "Connecting, listening, speaking, slow network, closed.",
      color: "blue",
    },
    {
      value: "1",
      label: "Chybějící reference",
      detail: "Bez cílové věty není přesná kontrola výslovnosti.",
      color: "violet",
    },
  ],
  capability: [
    ["Live audio dialog", 88, "green"],
    ["Legacy chat + STT/TTS", 82, "green"],
    ["Role-play scénáře", 86, "green"],
    ["Progress historie", 68, "amber"],
    ["Reading Mode", 66, "amber"],
    ["Vocabulary trainer", 28, "red"],
  ],
  tech: [
    ["React/Vite struktura", 76, "green"],
    ["Audio stabilita", 57, "amber"],
    ["Bezpečnost API", 35, "red"],
    ["Testovatelnost", 22, "red"],
    ["Local data model", 64, "amber"],
    ["Mobilní UX", 71, "green"],
  ],
  reading: [
    ["Realtime poslech", 86, "green"],
    ["Zopakování správné výslovnosti", 78, "green"],
    ["Výslovnostní tip", 70, "green"],
    ["České vysvětlení slov", 58, "amber"],
    ["Automatický slovníček", 35, "red"],
    ["Porovnání s knihou", 18, "red"],
  ],
  gaps: [
    ["Referenční text", 92, "red"],
    ["Progress napojení", 82, "red"],
    ["Slovníček s překladem", 78, "amber"],
    ["Word-level scoring", 76, "amber"],
    ["Falešný networkSlow", 55, "amber"],
    ["Tisk XSS escape", 48, "red"],
  ],
  pipeline: [
    {
      title: "1. Start",
      text: "ReadingModeView zavolá useLiveAPI(settings). Tlačítko spustí Live session a mikrofon.",
      status: "hotovo",
      chip: "green",
    },
    {
      title: "2. Student čte",
      text: "Audio jde přes ScriptProcessorNode do Gemini Live jako PCM 16 kHz.",
      status: "funkční, ale deprecated",
      chip: "amber",
    },
    {
      title: "3. Přepis",
      text: "inputTranscription se lepí do inputTranscript a conversationLog.",
      status: "křehké chunky",
      chip: "amber",
    },
    {
      title: "4. Aria odpoví",
      text: "Prompt říká: zopakuj větu správně, přidej krátký tip, vysvětli slovíčko česky.",
      status: "dobrý prompt",
      chip: "green",
    },
    {
      title: "5. Slovníček",
      text: "Regex hledá fráze typu I don't know the word X. Překlad se neukládá.",
      status: "nedostatečné",
      chip: "red",
    },
  ],
  states: [
    {
      name: "Disconnected",
      source: "useLiveAPI.isConnected = false",
      ui: "Tlačítko mikrofonu, text: Stiskni tlačítko",
      risk: "Nízké",
      recommendation: "OK. Přidat krátkou nápovědu, že se čte z vloženého nebo fyzického textu.",
    },
    {
      name: "Connecting",
      source: "isConnecting + sessionPromiseRef",
      ui: "Amber tlačítko, Připojování",
      risk: "Střední",
      recommendation: "Při cancel zavřít rozpracovanou session a ukázat, zda se mikrofon opravdu zastavil.",
    },
    {
      name: "Listening",
      source: "isConnected && !isSpeaking",
      ui: "Červený stav Aria poslouchá",
      risk: "Střední",
      recommendation: "Oddělit ticho, student mluví, model čeká na pauzu. Dnes se tyto stavy slévají.",
    },
    {
      name: "User talking",
      source: "volumeLevel > 0.03",
      ui: "RMS kruh kolem tlačítka",
      risk: "Nízké",
      recommendation: "Dobré pro UX. Přidat držení poslední aktivity, aby networkSlow nespouštěl falešně.",
    },
    {
      name: "Aria speaking",
      source: "audioSourcesRef.size > 0",
      ui: "Modrý reproduktor + outputTranscript",
      risk: "Střední",
      recommendation: "Zachovat poslední odpověď déle. Přepis se může resetovat při nové model turn.",
    },
    {
      name: "Slow network",
      source: "7 s bez server aktivity",
      ui: "Chip Síť pomalá",
      risk: "Střední",
      recommendation: "V Reading Mode nepoužívat čisté server silence. Student může dlouho číst bez pauzy.",
    },
    {
      name: "Reading exit",
      source: "handleExit -> disconnect -> onExit",
      ui: "Zpět",
      risk: "Vysoké",
      recommendation: "Před odchodem předat conversationLog do App.tsx a vytvořit reading summary/progress entry.",
    },
  ],
  issues: [
    {
      priority: "P0",
      area: "Reading Mode",
      title: "Chybí uzamčený referenční text knihy",
      desc: "AI může známou knihu odhadnout, ale pro přesnou kontrolu výslovnosti musí vědět konkrétní větu, edici nebo vložený úsek.",
      file: "components/ReadingModeView.tsx",
      status: "návrh změny",
    },
    {
      priority: "P1",
      area: "Progress",
      title: "Reading session se neposílá do progress historie",
      desc: "ReadingModeView používá vlastní useLiveAPI a conversationLog neposílá do App.tsx. Session summary se tedy pro čtení ztrácí.",
      file: "App.tsx:218, ReadingModeView.tsx:12",
      status: "otevřeno",
    },
    {
      priority: "P1",
      area: "UI",
      title: "InputArea může překrýt Reading Mode",
      desc: "InputArea se renderuje podle showAvatarMode, ne podle interactionMode. Při vypnutém avataru zůstane fixed bottom input i v Reading Mode.",
      file: "App.tsx:834, components/InputArea.tsx:40",
      status: "otevřeno",
    },
    {
      priority: "P1",
      area: "Security",
      title: "Vocabulary print zapisuje neescapované HTML",
      desc: "Ručně zadané slovo nebo definice se vkládají přes document.write bez escapování.",
      file: "components/VocabularyModal.tsx:39",
      status: "otevřeno",
    },
    {
      priority: "P2",
      area: "Vocabulary",
      title: "Slovníček neukládá český překlad",
      desc: "VocabularyEntry má jen word, addedAt a optional definition. Reading Mode definici nepředává.",
      file: "types.ts:55, utils/vocabularyUtils.ts:28",
      status: "otevřeno",
    },
    {
      priority: "P2",
      area: "Vocabulary",
      title: "Regex detekce slovíček je úzká",
      desc: "Nechytá přirozené české formulace, víceslovné výrazy, phrasal verbs ani slovíčka z textu knihy.",
      file: "utils/vocabularyUtils.ts:5",
      status: "otevřeno",
    },
    {
      priority: "P2",
      area: "Audio",
      title: "ScriptProcessorNode je deprecated",
      desc: "Audio vstup běží přes main thread. Při delších session nebo náročnějším UI může být méně stabilní.",
      file: "hooks/useLiveAPI.ts:245",
      status: "technický dluh",
    },
    {
      priority: "P2",
      area: "State",
      title: "networkSlow může být falešně pozitivní",
      desc: "Čtenář může mluvit dlouho bez server aktivity. Timeout pak značí pomalou síť, i když student jen čte.",
      file: "hooks/useLiveAPI.ts:412",
      status: "otevřeno",
    },
    {
      priority: "P3",
      area: "UX",
      title: "Chybí režim věta po větě",
      desc: "Student nemá aktuální cílovou větu, zvýraznění přečtených slov ani přepínání další věty.",
      file: "components/ReadingModeView.tsx",
      status: "návrh",
    },
  ],
  references: {
    memory: {
      summary: "<strong>AI zná knihu:</strong> použitelné pro orientační pomoc u známých děl, ale ne pro přesné skórování. Model nemusí znát konkrétní vydání, zkrácenou školní verzi, překlep v textu nebo větu před/po pauze.",
      chart: [
        ["Rychlost startu", 90, "green"],
        ["Přesnost cílové věty", 38, "red"],
        ["Použitelnost pro scoring", 28, "red"],
        ["Riziko halucinace", 74, "red"],
        ["Právní/obsahová čistota", 45, "amber"],
      ],
      cells: [
        ["Výhoda", ["Student nemusí nic vkládat.", "Dobré pro slavná public-domain díla.", "AI může doplnit kontext a vysvětlit děj."]],
        ["Slabina", ["Nelze garantovat přesnou větu.", "Různé edice se liší.", "U chráněných knih by model neměl reprodukovat dlouhé pasáže."]],
        ["Doporučení", ["Použít jen jako fallback.", "V UI označit jako odhad.", "Pro skóre vyžadovat vloženou cílovou větu."]],
      ],
    },
    paste: {
      summary: "<strong>Student vloží text:</strong> nejspolehlivější varianta pro kontrolu výslovnosti. Aplikace zná přesnou cílovou větu a může porovnat přepis s tím, co mělo zaznít.",
      chart: [
        ["Rychlost startu", 62, "amber"],
        ["Přesnost cílové věty", 96, "green"],
        ["Použitelnost pro scoring", 90, "green"],
        ["Riziko halucinace", 12, "green"],
        ["Právní/obsahová čistota", 74, "amber"],
      ],
      cells: [
        ["Výhoda", ["Přesné word-by-word porovnání.", "Funguje pro jakoukoli knihu.", "Dá se ukládat aktuální věta, slovíčka a překlad."]],
        ["Slabina", ["Student musí text vložit nebo nafotit.", "U delších knih nechceme ukládat celé kapitoly.", "OCR by přidal další krok."]],
        ["Doporučení", ["Začít paste/import polem.", "Ukládat jen krátký aktuální úsek.", "Přidat věta po větě navigaci."]],
      ],
    },
    hybrid: {
      summary: "<strong>Hybridní režim:</strong> nejlepší UX. AI může pomoci rozpoznat knihu a kapitolu, ale skórování se zamkne až po potvrzení cílové věty uživatelem.",
      chart: [
        ["Rychlost startu", 82, "green"],
        ["Přesnost cílové věty", 88, "green"],
        ["Použitelnost pro scoring", 84, "green"],
        ["Riziko halucinace", 24, "green"],
        ["Právní/obsahová čistota", 78, "green"],
      ],
      cells: [
        ["Výhoda", ["Pohodlné pro studenta.", "AI doplní kontext, ale nehraje si na zdroj pravdy.", "Dobré pro známé knihy i vlastní texty."]],
        ["Slabina", ["Složitější implementace.", "Potřebuje stav confidence.", "Vyžaduje UI pro potvrzení cílové věty."]],
        ["Doporučení", ["Implementovat jako cílový stav v1.6.", "Nejdřív paste mode, pak AI assist.", "Nikdy nepočítat score z nepotvrzeného odhadu."]],
      ],
    },
  },
  roadmap: [
    {
      version: "v1.5",
      title: "Stabilizace Reading Mode",
      text: "Skrýt InputArea v reading režimu, escapovat vocabulary print, napojit conversationLog do progress historie.",
      priority: "P1",
    },
    {
      version: "v1.6",
      title: "Book text panel",
      text: "Přidat vložení textu, rozdělení na věty, aktuální cílovou větu a navigaci další/předchozí.",
      priority: "P1",
    },
    {
      version: "v1.7",
      title: "Slovníček s češtinou",
      text: "Rozšířit VocabularyEntry o translationCs, exampleSentence, sourceSentence a pronunciationNote.",
      priority: "P2",
    },
    {
      version: "v1.8",
      title: "Pronunciation feedback",
      text: "Porovnat referenční větu s přepisem, zvýraznit chybějící/zaměněná slova a dát jemné skóre.",
      priority: "P2",
    },
    {
      version: "v2.0",
      title: "Hybrid AI book assist",
      text: "AI může odhadnout knihu/kapitolu, ale student potvrzuje cílovou větu. Teprve potvrzený text se používá pro scoring.",
      priority: "P2",
    },
  ],
};

const colors = {
  green: "var(--green)",
  amber: "var(--amber)",
  red: "var(--red)",
  blue: "var(--blue)",
  violet: "var(--violet)",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function chipClass(value) {
  if (value === "P0" || value === "P1") return "red";
  if (value === "P2") return "amber";
  if (value === "P3") return "blue";
  return "blue";
}

function renderMetrics() {
  const root = $("#metricGrid");
  root.innerHTML = reportData.metrics.map((item) => `
    <article class="metric">
      <div class="metric-value" style="color:${colors[item.color] || colors.blue}">${item.value}</div>
      <div class="metric-label">${item.label}</div>
      <div class="metric-detail">${item.detail}</div>
    </article>
  `).join("");
}

function renderBars(id, rows) {
  const root = $(id);
  root.innerHTML = rows.map(([label, value, color]) => `
    <div class="bar-line">
      <span>${label}</span>
      <div class="bar-track" aria-hidden="true">
        <div class="bar-fill" data-width="${value}" style="background:${colors[color] || colors.blue}"></div>
      </div>
      <strong>${value}%</strong>
    </div>
  `).join("");

  requestAnimationFrame(() => {
    root.querySelectorAll(".bar-fill").forEach((bar) => {
      bar.style.width = `${bar.dataset.width}%`;
    });
  });
}

function renderPipeline() {
  $("#readingPipeline").innerHTML = reportData.pipeline.map((stage) => `
    <article class="stage">
      <strong>${stage.title}</strong>
      <p>${stage.text}</p>
      <span class="chip ${stage.chip}">${stage.status}</span>
    </article>
  `).join("");
}

function renderStates() {
  $("#stateTable").innerHTML = reportData.states.map((state) => `
    <tr>
      <td><strong>${state.name}</strong></td>
      <td><code>${state.source}</code></td>
      <td>${state.ui}</td>
      <td><span class="chip ${state.risk === "Vysoké" ? "red" : state.risk === "Střední" ? "amber" : "green"}">${state.risk}</span></td>
      <td>${state.recommendation}</td>
    </tr>
  `).join("");
}

function renderIssueFilters() {
  const areas = [...new Set(reportData.issues.map((issue) => issue.area))].sort();
  $("#areaFilter").innerHTML += areas.map((area) => `<option value="${area}">${area}</option>`).join("");
}

function renderIssues() {
  const priority = $("#priorityFilter").value;
  const area = $("#areaFilter").value;
  const root = $("#issueList");

  root.innerHTML = reportData.issues.map((issue) => {
    const hidden = (priority !== "all" && issue.priority !== priority) || (area !== "all" && issue.area !== area);
    return `
      <article class="issue${hidden ? " hidden" : ""}" data-priority="${issue.priority}" data-area="${issue.area}">
        <span class="chip ${chipClass(issue.priority)}">${issue.priority}</span>
        <div>
          <p class="issue-title">${issue.title}</p>
          <p class="issue-desc">${issue.desc}</p>
          <div class="issue-file">${issue.file}</div>
        </div>
        <span class="chip blue">${issue.area}</span>
      </article>
    `;
  }).join("");
}

function renderReference(mode = "memory") {
  const data = reportData.references[mode];
  $("#referenceSummary").innerHTML = data.summary;
  renderBars("#referenceChart", data.chart);
  $("#referenceMatrix").innerHTML = data.cells.map(([title, items]) => `
    <article class="matrix-cell">
      <h3>${title}</h3>
      <ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>
    </article>
  `).join("");
}

function renderRoadmap() {
  $("#roadmapList").innerHTML = reportData.roadmap.map((item) => `
    <article class="timeline-item">
      <div>
        <div class="timeline-date">${item.version}</div>
        <span class="chip ${chipClass(item.priority)}">${item.priority}</span>
      </div>
      <div>
        <h3>${item.title}</h3>
        <p>${item.text}</p>
      </div>
    </article>
  `).join("");
}

function activateSection(id) {
  $$(".section").forEach((section) => section.classList.toggle("active", section.id === id));
  $$("[data-section-button]").forEach((button) => button.classList.toggle("active", button.dataset.sectionButton === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindEvents() {
  $$("[data-section-button]").forEach((button) => {
    button.addEventListener("click", () => activateSection(button.dataset.sectionButton));
  });

  $$("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => activateSection(button.dataset.jump));
  });

  $("#priorityFilter").addEventListener("change", renderIssues);
  $("#areaFilter").addEventListener("change", renderIssues);

  $$("[data-reference-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-reference-mode]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderReference(button.dataset.referenceMode);
    });
  });
}

function init() {
  renderMetrics();
  renderBars("#capabilityChart", reportData.capability);
  renderBars("#techChart", reportData.tech);
  renderBars("#readingChart", reportData.reading);
  renderBars("#gapChart", reportData.gaps);
  renderPipeline();
  renderStates();
  renderIssueFilters();
  renderIssues();
  renderReference("memory");
  renderRoadmap();
  bindEvents();
}

init();
