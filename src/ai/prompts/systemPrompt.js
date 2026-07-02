const CURRICULUM = [
  { slug: "boolean-algebra", title: "Boolean Algebra", summary: "gates, expressions, simplification, De Morgan's laws" },
  { slug: "number-systems", title: "Number Systems", summary: "binary, octal, hex, BCD, conversions" },
  { slug: "arithmetic-circuits", title: "Arithmetic Circuits", summary: "half adder, full adder, subtractor, comparator" },
  { slug: "memory", title: "Memory", summary: "latches, flip-flops, registers, RAM/ROM" },
  { slug: "sequential-circuits", title: "Sequential Circuits", summary: "FSMs, counters, shift registers" },
];

const COAL_CURRICULUM = [
  { slug: "coal-syntax", title: "COAL Syntax", summary: "instructions, labels, comments, basic program structure" },
  { slug: "registers-memory", title: "Registers and Memory", summary: "register files, addressing, load/store, data movement" },
  { slug: "control-flow", title: "Control Flow", summary: "branching, jumps, loops, decision-making instructions" },
  { slug: "computer-organization", title: "Computer Organization", summary: "fetch-decode-execute, ARM64, CPU architecture, assembly logic" },
];

const VALID_DIFFICULTIES = ["beginner", "intermediate", "advanced"];

function titleCase(slug = "") {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function describeTopic(slug, course = "DLS") {
  if (!slug) return null;
  const list = course === "COAL" ? COAL_CURRICULUM : CURRICULUM;
  const known = list.find((t) => t.slug === slug);
  return known ? `${known.title} (${known.summary})` : titleCase(slug);
}

function buildDualCurriculumBlock() {
  const dld = CURRICULUM.map((t, i) => `${i + 1}. ${t.title} (${t.summary})`).join("\n");
  const coal = COAL_CURRICULUM.map((t, i) => `${i + 1}. ${t.title} (${t.summary})`).join("\n");
  return `Digital Logic Design (DLS):\n${dld}\n\nCOAL / Computer Organization:\n${coal}`;
}

function buildSystemPrompt({ user, context = {} } = {}) {
  const {
    name: contextName,
    currentCourse,
    currentTopic,
    recentTopics = [],
    toolsUsed = [],
    difficulty,
  } = context || {};

  const name = (user && user.name) || contextName || "there";
  const normalizedCourse = String(currentCourse || "").toUpperCase() === "COAL" ? "COAL" : "DLS";
  const currentTopicDescription = describeTopic(currentTopic, normalizedCourse) || "Not specified";

  const recentTopicsLine =
    Array.isArray(recentTopics) && recentTopics.length
      ? recentTopics.map((t) => describeTopic(t, normalizedCourse) || titleCase(t)).join(" → ")
      : "None yet";

  const toolsLine =
    Array.isArray(toolsUsed) && toolsUsed.length
      ? toolsUsed.map(titleCase).join(", ")
      : "None yet";

  const normalizedDifficulty = VALID_DIFFICULTIES.includes(difficulty) ? difficulty : "intermediate";

  const difficultyGuidance = {
    beginner: "Explain fundamentals carefully, define terms the first time you use them, and avoid jumping ahead.",
    intermediate: "Skip trivial basics, but do not assume graduate-level prior knowledge.",
    advanced: "Move quickly, use precise technical vocabulary, and feel free to reference edge cases or optimization tradeoffs.",
  }[normalizedDifficulty];

  return `You are DLS Mentor, an expert teaching assistant for Digital Logic Studio (DLS)
and the COAL learning track (Computer Organization and Assembly Language).

Student profile:
- Name: ${name}
- Active course: ${normalizedCourse}
- Current topic: ${currentTopicDescription}
- Recently studied: ${recentTopicsLine}
- Tools used this session: ${toolsLine}
- Difficulty level: ${normalizedDifficulty.charAt(0).toUpperCase() + normalizedDifficulty.slice(1)}

Platform curriculum scope:
${buildDualCurriculumBlock()}

Persona and tone:
- Speak directly to ${name} by name when it feels natural, but don't force it into every sentence.
- ${difficultyGuidance}
- Use concrete examples, truth tables, and circuit analogies for DLS topics.
- For COAL topics, use clear instruction examples, register/memory explanations, and step-by-step execution flow.
- If the question fits the other course better, answer helpfully and mention which track it belongs to.
- If the question is outside digital logic and computer organization, politely redirect back to the curriculum.
- Keep answers concise but complete. Prefer numbered steps for procedures.`;
}

module.exports = { buildSystemPrompt, CURRICULUM, COAL_CURRICULUM };
