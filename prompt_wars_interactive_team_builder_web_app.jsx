import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  StopCircle,
  Plus,
  RefreshCcw,
  Timer as TimerIcon,
  Trophy,
  Download,
  Wand2,
  Sparkles,
  Settings,
} from "lucide-react";

// =============================
// Prompt Wars — Interactive Team Builder
// Single-file React app (no backend) using TailwindCSS
// Features: team management, rounds, timed challenges, twist cards, scoring, leaderboard, CSV export
// =============================

const DEFAULT_CHALLENGES = [
  { id: 1, mode: "Story", text: "Write a 150-word story about a robot who learns to dream." },
  { id: 2, mode: "Story", text: "Explain photosynthesis to a 6-year-old using a bedtime story." },
  { id: 3, mode: "Image", text: "Design a poster of a 1920s travel ad for a city on Mars." },
  { id: 4, mode: "Business", text: "Draft a 2-sentence process improvement for reducing support call handle time by 10%." },
  { id: 5, mode: "Business", text: "Create a one-paragraph elevator pitch for a new student finance self-serve portal." },
  { id: 6, mode: "Image", text: "Create an image prompt for a mascot celebrating a big Cubs win in outer space." },
  { id: 7, mode: "Speed", text: "Turn this weak prompt into a strong one: 'make it better'" },
  { id: 8, mode: "Meme", text: "Craft a meme caption about coffee-powered deployments on Friday at 4:59pm." },
  { id: 9, mode: "Corporate", text: "Generate 3 bullet points for a status update on an AI pilot with measurable KPIs." },
  { id: 10, mode: "Haiku", text: "Turn an incident postmortem into a respectful 3-line haiku with action items." },
];

const DEFAULT_TWISTS = [
  "Add one unexpected constraint (e.g., double-acrostic, emoji-only, ABAB rhyme).",
  "Change the audience to: executives with 30 seconds to spare.",
  "Rewrite in the voice of a 1980s infomercial.",
  "Make it bilingual (English + your choice) in one response.",
  "Enforce hard limits: 2 sentences, max 20 words total.",
  "Introduce a tasteful plot twist in the final line.",
  "Switch the format to bullet points with exactly 5 bullets.",
  "Turn seriousness into humor (or vice versa), but preserve facts.",
  "Make it data-driven—add 2 plausible metrics.",
  "Force a persona: 'meticulous auditor' or 'chaotic creative director'.",
];

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

function randFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const PHASES = {
  SETUP: "setup",
  PROMPT: "prompt",
  TWIST: "twist",
  SCORING: "scoring",
  RESULTS: "results",
  END: "end",
};

export default function PromptWarsApp() {
  const [teams, setTeams] = useLocalStorage("pw_teams", []);
  const [teamName, setTeamName] = useState("");
  const [rounds, setRounds] = useLocalStorage("pw_rounds", 3);
  const [mode, setMode] = useLocalStorage("pw_mode", "Any");
  const [roundLength, setRoundLength] = useLocalStorage("pw_roundLength", 180);
  const [twistOn, setTwistOn] = useLocalStorage("pw_twistOn", true);
  const [phase, setPhase] = useLocalStorage("pw_phase", PHASES.SETUP);
  const [currentRound, setCurrentRound] = useLocalStorage("pw_currentRound", 1);
  const [challenge, setChallenge] = useLocalStorage("pw_challenge", null);
  const [twist, setTwist] = useLocalStorage("pw_twist", null);
  const [submissions, setSubmissions] = useLocalStorage("pw_submissions", {}); // {teamId: {prompt, output, notes}}
  const [scores, setScores] = useLocalStorage("pw_scores", {}); // {teamId: {creativity, clarity, power}}
  const [timeLeft, setTimeLeft] = useLocalStorage("pw_timeLeft", roundLength);
  const [isRunning, setIsRunning] = useLocalStorage("pw_isRunning", false);
  const [challengeBank, setChallengeBank] = useLocalStorage("pw_challenges", DEFAULT_CHALLENGES);
  const [twistBank, setTwistBank] = useLocalStorage("pw_twists", DEFAULT_TWISTS);

  // Timer
  useEffect(() => {
    let id;
    if (isRunning && timeLeft > 0) {
      id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    }
    if (timeLeft === 0) setIsRunning(false);
    return () => clearInterval(id);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    // Sync when roundLength changes during setup
    if (phase === PHASES.SETUP) setTimeLeft(roundLength);
  }, [roundLength, phase, setTimeLeft]);

  const addTeam = () => {
    if (!teamName.trim()) return;
    const id = crypto.randomUUID();
    setTeams([...teams, { id, name: teamName.trim(), score: 0 }]);
    setTeamName("");
  };

  const removeTeam = (id) => {
    setTeams(teams.filter((t) => t.id !== id));
    const newSubs = { ...submissions };
    delete newSubs[id];
    setSubmissions(newSubs);
    const newScores = { ...scores };
    delete newScores[id];
    setScores(newScores);
  };

  const resetRoundData = () => {
    setSubmissions({});
    setScores({});
  };

  const startGame = () => {
    if (teams.length < 2) {
      alert("Add at least two teams to start.");
      return;
    }
    resetRoundData();
    const pool = mode === "Any" ? challengeBank : challengeBank.filter((c) => c.mode === mode);
    const newChallenge = randFrom(pool);
    setChallenge(newChallenge);
    if (twistOn) setTwist(randFrom(twistBank));
    setPhase(PHASES.PROMPT);
    setTimeLeft(roundLength);
    setIsRunning(true);
  };

  const nextPhase = () => {
    if (phase === PHASES.PROMPT && twistOn) {
      setPhase(PHASES.TWIST);
      setTimeLeft(Math.max(45, Math.floor(roundLength / 3)));
      setIsRunning(true);
      return;
    }
    if (phase === PHASES.PROMPT && !twistOn) {
      setPhase(PHASES.SCORING);
      setIsRunning(false);
      return;
    }
    if (phase === PHASES.TWIST) {
      setPhase(PHASES.SCORING);
      setIsRunning(false);
      return;
    }
    if (phase === PHASES.SCORING) {
      if (currentRound >= rounds) {
        setPhase(PHASES.END);
      } else {
        // carry to next round
        const pool = mode === "Any" ? challengeBank : challengeBank.filter((c) => c.mode === mode);
        const newChallenge = randFrom(pool);
        setChallenge(newChallenge);
        if (twistOn) setTwist(randFrom(twistBank));
        setCurrentRound(currentRound + 1);
        resetRoundData();
        setPhase(PHASES.PROMPT);
        setTimeLeft(roundLength);
        setIsRunning(true);
      }
    }
  };

  const stopTimer = () => setIsRunning(false);
  const startTimer = () => {
    if (timeLeft === 0) setTimeLeft(30);
    setIsRunning(true);
  };
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(roundLength);
  };

  const onEditSubmission = (teamId, field, value) => {
    setSubmissions({
      ...submissions,
      [teamId]: { ...submissions[teamId], [field]: value },
    });
  };

  const onScore = (teamId, field, value) => {
    setScores({
      ...scores,
      [teamId]: { ...scores[teamId], [field]: Number(value) },
    });
  };

  const roundTotals = useMemo(() => {
    const totals = {};
    for (const team of teams) {
      const s = scores[team.id] || {};
      const total = (s.creativity || 0) + (s.clarity || 0) + (s.power || 0);
      totals[team.id] = total;
    }
    return totals;
  }, [scores, teams]);

  useEffect(() => {
    // apply round totals to overall score when entering RESULTS phase
    if (phase === PHASES.RESULTS || phase === PHASES.SCORING) return;
  }, [phase]);

  const finalizeScoring = () => {
    // add round totals to team scores
    const updated = teams.map((t) => ({ ...t }));
    for (const t of updated) {
      t.score += roundTotals[t.id] || 0;
    }
    setTeams(updated);
    setPhase(PHASES.RESULTS);
  };

  const leaderboard = useMemo(() => {
    return [...teams].sort((a, b) => b.score - a.score);
  }, [teams]);

  const exportCSV = () => {
    const headers = [
      "Round",
      "Team",
      "Prompt",
      "Output",
      "Notes",
      "Creativity",
      "Clarity",
      "PromptPower",
      "RoundTotal",
      "CumulativeScore",
    ];
    const rows = [];
    const cum = {};
    for (const t of teams) cum[t.id] = 0;

    // Build one row per team for current round
    for (const t of teams) {
      const sub = submissions[t.id] || {};
      const s = scores[t.id] || {};
      const total = (s.creativity || 0) + (s.clarity || 0) + (s.power || 0);
      const cumulative = (t.score || 0) + total; // if exporting mid-round, include potential
      rows.push([
        currentRound,
        t.name,
        (sub.prompt || "").replaceAll("\n", " "),
        (sub.output || "").replaceAll("\n", " "),
        (sub.notes || "").replaceAll("\n", " "),
        s.creativity || 0,
        s.clarity || 0,
        s.power || 0,
        total,
        cumulative,
      ]);
    }

    const csv = [headers.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt-wars_round-${currentRound}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    if (!confirm("Reset everything? This will clear teams and progress.")) return;
    setTeams([]);
    setTeamName("");
    setRounds(3);
    setMode("Any");
    setRoundLength(180);
    setTwistOn(true);
    setPhase(PHASES.SETUP);
    setCurrentRound(1);
    setChallenge(null);
    setTwist(null);
    setSubmissions({});
    setScores({});
    setTimeLeft(180);
    setIsRunning(false);
    setChallengeBank(DEFAULT_CHALLENGES);
    setTwistBank(DEFAULT_TWISTS);
  };

  const phaseBadge = {
    [PHASES.SETUP]: "bg-slate-200 text-slate-800",
    [PHASES.PROMPT]: "bg-blue-100 text-blue-800",
    [PHASES.TWIST]: "bg-purple-100 text-purple-800",
    [PHASES.SCORING]: "bg-amber-100 text-amber-800",
    [PHASES.RESULTS]: "bg-emerald-100 text-emerald-800",
    [PHASES.END]: "bg-rose-100 text-rose-800",
  }[phase];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Sparkles className="w-6 h-6" />
          <h1 className="text-xl font-bold">Prompt Wars — AI Team Builder</h1>
          <span className={classNames("ml-auto text-xs px-2 py-1 rounded-full", phaseBadge)}>
            {phase.toUpperCase()}
          </span>
          <button
            className="ml-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-700"
            onClick={exportCSV}
            title="Export round data to CSV"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-500"
            onClick={clearAll}
            title="Reset everything"
          >
            <RefreshCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {phase === PHASES.SETUP && (
          <SetupPanel
            {...{
              teamName,
              setTeamName,
              addTeam,
              teams,
              removeTeam,
              rounds,
              setRounds,
              mode,
              setMode,
              roundLength,
              setRoundLength,
              twistOn,
              setTwistOn,
              startGame,
              challengeBank,
              setChallengeBank,
              twistBank,
              setTwistBank,
            }}
          />
        )}

        {phase !== PHASES.SETUP && (
          <GameHUD
            {...{ currentRound, rounds, timeLeft, isRunning, startTimer, stopTimer, resetTimer }}
          />
        )}

        {phase === PHASES.PROMPT && (
          <PromptPhase
            {...{ teams, submissions, onEditSubmission, challenge, nextPhase, isRunning }}
          />
        )}

        {phase === PHASES.TWIST && (
          <TwistPhase {...{ teams, submissions, onEditSubmission, twist, nextPhase, isRunning }} />
        )}

        {phase === PHASES.SCORING && (
          <ScoringPhase
            {...{ teams, submissions, scores, onScore, roundTotals, finalizeScoring }}
          />
        )}

        {phase === PHASES.RESULTS && (
          <ResultsPhase
            {...{ leaderboard, currentRound, nextPhase, setPhase, phase, setCurrentRound, rounds }}
          />
        )}

        {phase === PHASES.END && <FinalWinners {...{ leaderboard, setPhase, setCurrentRound }} />}
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-8 text-xs text-slate-500">
        Built for rapid, in-room facilitation. Tip: put this on a big screen and let teams join from laptops/phones.
      </footer>
    </div>
  );
}

function SetupPanel({
  teamName,
  setTeamName,
  addTeam,
  teams,
  removeTeam,
  rounds,
  setRounds,
  mode,
  setMode,
  roundLength,
  setRoundLength,
  twistOn,
  setTwistOn,
  startGame,
  challengeBank,
  setChallengeBank,
  twistBank,
  setTwistBank,
}) {
  const [newChallenge, setNewChallenge] = useState("");
  const [newChallengeMode, setNewChallengeMode] = useState("Story");
  const [newTwist, setNewTwist] = useState("");

  const removeChallenge = (id) => setChallengeBank(challengeBank.filter((c) => c.id !== id));

  return (
    <div className="grid gap-6">
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5 border">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Wand2 className="w-5 h-5" /> Teams
          </h2>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 rounded-xl border"
              placeholder="Team name (e.g., The Innovators)"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTeam()}
            />
            <button className="px-3 py-2 rounded-xl bg-slate-900 text-white" onClick={addTeam}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <ul className="mt-4 grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {teams.map((t) => (
              <li key={t.id} className="border rounded-xl p-3 flex items-center justify-between">
                <span className="font-medium truncate">{t.name}</span>
                <button
                  className="text-rose-600 hover:text-rose-700 text-sm"
                  onClick={() => removeTeam(t.id)}
                >
                  remove
                </button>
              </li>
            ))}
            {teams.length === 0 && <p className="text-sm text-slate-500">Add at least two teams.</p>}
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Settings className="w-5 h-5" /> Game Settings
          </h2>
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="text-slate-600">Rounds</span>
              <input
                type="number"
                min={1}
                max={10}
                className="w-full mt-1 px-3 py-2 rounded-xl border"
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="text-slate-600">Mode</span>
              <select
                className="w-full mt-1 px-3 py-2 rounded-xl border"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                {['Any','Story','Image','Business','Meme','Speed','Haiku','Corporate'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-slate-600">Round length (seconds)</span>
              <input
                type="number"
                min={30}
                max={900}
                className="w-full mt-1 px-3 py-2 rounded-xl border"
                value={roundLength}
                onChange={(e) => setRoundLength(Number(e.target.value))}
              />
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={twistOn} onChange={(e) => setTwistOn(e.target.checked)} />
              <span>Enable twist round</span>
            </label>
            <button
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
              onClick={startGame}
              disabled={teams.length < 2}
            >
              <Play className="w-4 h-4" /> Start Game
            </button>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-5 border">
          <h3 className="font-semibold mb-2">Challenge Bank</h3>
          <div className="flex gap-2 mb-3">
            <select
              className="px-3 py-2 rounded-xl border"
              value={newChallengeMode}
              onChange={(e) => setNewChallengeMode(e.target.value)}
            >
              {['Story','Image','Business','Meme','Speed','Haiku','Corporate'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              className="flex-1 px-3 py-2 rounded-xl border"
              placeholder="Add a new challenge prompt"
              value={newChallenge}
              onChange={(e) => setNewChallenge(e.target.value)}
            />
            <button
              className="px-3 py-2 rounded-xl bg-slate-900 text-white"
              onClick={() => {
                if (!newChallenge.trim()) return;
                const id = crypto.randomUUID();
                setChallengeBank([...challengeBank, { id, mode: newChallengeMode, text: newChallenge.trim() }]);
                setNewChallenge("");
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-2 max-h-64 overflow-auto pr-1">
            {challengeBank.map((c) => (
              <li key={c.id} className="border rounded-xl px-3 py-2 text-sm flex items-start gap-2">
                <span className="text-slate-500 text-xs px-2 py-0.5 rounded-full bg-slate-100">{c.mode}</span>
                <span className="flex-1">{c.text}</span>
                <button className="text-rose-600 text-xs" onClick={() => removeChallenge(c.id)}>remove</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border">
          <h3 className="font-semibold mb-2">Twist Bank</h3>
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 px-3 py-2 rounded-xl border"
              placeholder="Add a new twist"
              value={newTwist}
              onChange={(e) => setNewTwist(e.target.value)}
            />
            <button
              className="px-3 py-2 rounded-xl bg-slate-900 text-white"
              onClick={() => {
                if (!newTwist.trim()) return;
                setTwistBank([...twistBank, newTwist.trim()]);
                setNewTwist("");
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-2 max-h-64 overflow-auto pr-1">
            {twistBank.map((t, idx) => (
              <li key={idx} className="border rounded-xl px-3 py-2 text-sm flex items-between justify-between gap-2">
                <span className="flex-1">{t}</span>
                <button
                  className="text-rose-600 text-xs"
                  onClick={() => setTwistBank(twistBank.filter((x, i) => i !== idx))}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function GameHUD({ currentRound, rounds, timeLeft, isRunning, startTimer, stopTimer, resetTimer }) {
  return (
    <div className="mb-6 grid md:grid-cols-3 gap-3">
      <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-3">
        <TimerIcon className="w-6 h-6" />
        <div>
          <div className="text-xs text-slate-500">Timer</div>
          <div className="text-xl font-semibold tabular-nums">{formatTime(timeLeft)}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!isRunning ? (
            <button className="px-3 py-1.5 rounded-xl bg-slate-900 text-white" onClick={startTimer}>
              <Play className="w-4 h-4" />
            </button>
          ) : (
            <button className="px-3 py-1.5 rounded-xl bg-amber-500 text-white" onClick={stopTimer}>
              <Pause className="w-4 h-4" />
            </button>
          )}
          <button className="px-3 py-1.5 rounded-xl bg-slate-200" onClick={resetTimer}>
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-5 border shadow-sm">
        <div className="text-xs text-slate-500">Round</div>
        <div className="text-xl font-semibold">{currentRound} / {rounds}</div>
        <div className="text-xs text-slate-500 mt-1">Craft smart prompts. Iterate. Win bragging rights.</div>
      </div>
      <div className="bg-white rounded-2xl p-5 border shadow-sm">
        <div className="text-xs text-slate-500">Scoring Criteria</div>
        <ul className="text-sm mt-1 list-disc pl-5">
          <li>Creativity (0–5)</li>
          <li>Clarity (0–5)</li>
          <li>Prompt Power (0–5)</li>
        </ul>
      </div>
    </div>
  );
}

function PromptPhase({ teams, submissions, onEditSubmission, challenge, nextPhase, isRunning }) {
  return (
    <div className="grid gap-6">
      <Callout title="Core Challenge" subtitle={challenge?.mode || "Any"}>
        <p className="text-lg">{challenge?.text}</p>
      </Callout>

      <div className="grid md:grid-cols-2 gap-4">
        {teams.map((t) => (
          <motion.div key={t.id} layout className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{t.name}</span>
              <span className="ml-auto text-xs text-slate-500">Round entry</span>
            </div>
            <label className="block text-xs text-slate-500 mb-1">Your engineered prompt</label>
            <textarea
              className="w-full h-24 px-3 py-2 rounded-xl border mb-3"
              placeholder="Write or refine the prompt you'll give to the AI"
              value={submissions[t.id]?.prompt || ""}
              onChange={(e) => onEditSubmission(t.id, "prompt", e.target.value)}
            />
            <label className="block text-xs text-slate-500 mb-1">Paste AI output (optional)</label>
            <textarea
              className="w-full h-24 px-3 py-2 rounded-xl border"
              placeholder="Paste the AI's response here for judging"
              value={submissions[t.id]?.output || ""}
              onChange={(e) => onEditSubmission(t.id, "output", e.target.value)}
            />
          </motion.div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50"
          onClick={nextPhase}
          disabled={isRunning}
          title={isRunning ? "Timer must be paused or finished" : "Proceed to twist or scoring"}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function TwistPhase({ teams, submissions, onEditSubmission, twist, nextPhase, isRunning }) {
  return (
    <div className="grid gap-6">
      <Callout title="Twist" icon={<Wand2 className="w-5 h-5" />}>
        <p className="text-lg">{twist}</p>
      </Callout>

      <div className="grid md:grid-cols-2 gap-4">
        {teams.map((t) => (
          <motion.div key={t.id} layout className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{t.name}</span>
              <span className="ml-auto text-xs text-slate-500">Twist iteration</span>
            </div>
            <label className="block text-xs text-slate-500 mb-1">Iteration notes</label>
            <textarea
              className="w-full h-24 px-3 py-2 rounded-xl border mb-3"
              placeholder="Describe how you applied the twist or paste revised output"
              value={submissions[t.id]?.notes || ""}
              onChange={(e) => onEditSubmission(t.id, "notes", e.target.value)}
            />
          </motion.div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50"
          onClick={nextPhase}
          disabled={isRunning}
          title={isRunning ? "Timer must be paused or finished" : "Proceed to scoring"}
        >
          Score Round
        </button>
      </div>
    </div>
  );
}

function ScoringPhase({ teams, submissions, scores, onScore, roundTotals, finalizeScoring }) {
  return (
    <div className="grid gap-6">
      <Callout title="Judge & Score" icon={<Trophy className="w-5 h-5" />}>
        <p>Score each team on Creativity, Clarity, and Prompt Power (0–5 each). Totals add to the leaderboard.</p>
      </Callout>

      <div className="grid md:grid-cols-2 gap-4">
        {teams.map((t) => (
          <motion.div key={t.id} layout className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{t.name}</span>
              <span className="ml-auto text-xs text-slate-500">Round total: {roundTotals[t.id] || 0}</span>
            </div>
            <div className="text-xs text-slate-500">Prompt</div>
            <div className="text-sm border rounded-xl p-2 mb-2 bg-slate-50 min-h-12">
              {submissions[t.id]?.prompt || <em className="text-slate-400">(none)</em>}
            </div>
            <div className="text-xs text-slate-500">Output</div>
            <div className="text-sm border rounded-xl p-2 mb-3 bg-slate-50 min-h-12">
              {submissions[t.id]?.output || <em className="text-slate-400">(none)</em>}
            </div>
            <ScoreRow label="Creativity" value={scores[t.id]?.creativity || 0} onChange={(v) => onScore(t.id, "creativity", v)} />
            <ScoreRow label="Clarity" value={scores[t.id]?.clarity || 0} onChange={(v) => onScore(t.id, "clarity", v)} />
            <ScoreRow label="Prompt Power" value={scores[t.id]?.power || 0} onChange={(v) => onScore(t.id, "power", v)} />
          </motion.div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
          onClick={finalizeScoring}
        >
          Finalize Round
        </button>
      </div>
    </div>
  );
}

function ResultsPhase({ leaderboard, currentRound, nextPhase, setPhase, phase, setCurrentRound, rounds }) {
  return (
    <div className="grid gap-6">
      <Callout title={`Round ${currentRound} Results`} icon={<Trophy className="w-5 h-5" />}>
        <p>Scores have been added to team totals. Keep the momentum going!</p>
      </Callout>

      <Leaderboard leaderboard={leaderboard} />

      <div className="flex justify-end gap-2">
        {currentRound < rounds ? (
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700"
            onClick={nextPhase}
          >
            Next Round
          </button>
        ) : (
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-500"
            onClick={() => setPhase(PHASES.END)}
          >
            View Winners
          </button>
        )}
      </div>
    </div>
  );
}

function FinalWinners({ leaderboard, setPhase, setCurrentRound }) {
  const [fireworks, setFireworks] = useState(false);
  useEffect(() => {
    setFireworks(true);
    const t = setTimeout(() => setFireworks(false), 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="grid gap-6">
      <Callout title="Final Winners" icon={<Trophy className="w-6 h-6" />}>
        <p>Congratulations to the top teams! Thanks for playing Prompt Wars.</p>
      </Callout>
      <Leaderboard leaderboard={leaderboard} highlightTop />
      <div className="flex justify-end">
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700"
          onClick={() => {
            setPhase(PHASES.SETUP);
            setCurrentRound(1);
          }}
        >
          Play Again
        </button>
      </div>
      <AnimatePresence>
        {fireworks && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 flex items-center justify-center"
          >
            <div className="text-6xl">🎉</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Leaderboard({ leaderboard, highlightTop = false }) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="p-3">Rank</th>
            <th className="p-3">Team</th>
            <th className="p-3">Score</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((t, idx) => (
            <tr key={t.id} className={classNames("border-t", highlightTop && idx === 0 && "bg-amber-50")}> 
              <td className="p-3 font-medium">{idx + 1}</td>
              <td className="p-3">{t.name}</td>
              <td className="p-3 tabular-nums">{t.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreRow({ label, value, onChange }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={5}
        step={1}
        className="w-full"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="flex justify-between text-[11px] text-slate-500"><span>0</span><span>5</span></div>
    </div>
  );
}

function Callout({ title, subtitle, children, icon }) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="font-semibold text-lg">{title}</h3>
        {subtitle && (
          <span className="ml-2 text-xs text-slate-500 px-2 py-0.5 rounded-full bg-slate-100">{subtitle}</span>
        )}
      </div>
      <div className="text-slate-700">{children}</div>
    </div>
  );
}

function csvEscape(x) {
  const s = String(x);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return '"' + s.replaceAll('"', '""') + '"';
  }
  return s;
}

function formatTime(total) {
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(total % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}
