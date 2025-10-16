import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Plus,
  RefreshCcw,
  Timer as TimerIcon,
  Trophy,
  Download,
  Wand2,
  Sparkles,
  Settings,
  Share2,
  Check,
} from "lucide-react";
import { supabase } from "./supabaseClient";

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
  const [gameId, setGameId] = useState(null);
  const [game, setGame] = useState(null);
  const [teams, setTeams] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [scores, setScores] = useState({});
  const [teamName, setTeamName] = useState("");
  const [challengeBank] = useState(DEFAULT_CHALLENGES);
  const [twistBank] = useState(DEFAULT_TWISTS);
  const [copied, setCopied] = useState(false);
  const [copiedParticipant, setCopiedParticipant] = useState(false);
  const [isFacilitator, setIsFacilitator] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const existingGameId = urlParams.get('game');
    const role = urlParams.get('role');

    if (existingGameId) {
      setGameId(existingGameId);
      setIsFacilitator(role === 'facilitator');
      loadGame(existingGameId);
    }
  }, []);

  const loadGame = async (id) => {
    const { data: gameData } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (gameData) {
      setGame(gameData);
      loadTeams(id);
      loadSubmissions(id, gameData.current_round);
      loadScores(id, gameData.current_round);
    }
  };

  const loadTeams = async (id) => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('game_id', id)
      .order('created_at', { ascending: true });
    setTeams(data || []);
  };

  const loadSubmissions = async (id, round) => {
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('game_id', id)
      .eq('round', round);

    const subMap = {};
    (data || []).forEach(sub => {
      subMap[sub.team_id] = sub;
    });
    setSubmissions(subMap);
  };

  const loadScores = async (id, round) => {
    const { data } = await supabase
      .from('scores')
      .select('*')
      .eq('game_id', id)
      .eq('round', round);

    const scoreMap = {};
    (data || []).forEach(score => {
      scoreMap[score.team_id] = score;
    });
    setScores(scoreMap);
  };

  useEffect(() => {
    if (!gameId) return;

    const gameChannel = supabase
      .channel(`game:${gameId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setGame(prevGame => {
              if (payload.new.current_round !== prevGame?.current_round) {
                loadSubmissions(gameId, payload.new.current_round);
                loadScores(gameId, payload.new.current_round);
              }
              return payload.new;
            });
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
        (payload) => {
          loadTeams(gameId);
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `game_id=eq.${gameId}` },
        (payload) => {
          setGame(currentGame => {
            if (currentGame) {
              loadSubmissions(gameId, currentGame.current_round);
            }
            return currentGame;
          });
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'scores', filter: `game_id=eq.${gameId}` },
        (payload) => {
          setGame(currentGame => {
            if (currentGame) {
              loadScores(gameId, currentGame.current_round);
            }
            return currentGame;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time subscription active');
        }
      });

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [gameId]);

  const createNewGame = async () => {
    const { data: newGame } = await supabase
      .from('games')
      .insert({
        rounds: 3,
        current_round: 1,
        mode: 'Any',
        round_length: 180,
        twist_enabled: true,
        phase: PHASES.SETUP,
        time_left: 180,
        is_running: false
      })
      .select()
      .single();

    setGameId(newGame.id);
    setGame(newGame);
    setIsFacilitator(true);
    window.history.pushState({}, '', `?game=${newGame.id}&role=facilitator`);
  };

  const shareFacilitatorLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?game=${gameId}&role=facilitator`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareParticipantLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?game=${gameId}`;
    navigator.clipboard.writeText(url);
    setCopiedParticipant(true);
    setTimeout(() => setCopiedParticipant(false), 2000);
  };

  const addTeam = async () => {
    if (!teamName.trim() || !gameId) return;
    await supabase
      .from('teams')
      .insert({
        game_id: gameId,
        name: teamName.trim(),
        score: 0
      });
    setTeamName("");
  };

  const removeTeam = async (id) => {
    await supabase.from('teams').delete().eq('id', id);
  };

  const updateGame = async (updates) => {
    await supabase
      .from('games')
      .update(updates)
      .eq('id', gameId);
  };

  const startGame = async () => {
    if (teams.length < 2) {
      alert("Add at least two teams to start.");
      return;
    }
    const pool = game.mode === "Any" ? challengeBank : challengeBank.filter((c) => c.mode === game.mode);
    const newChallenge = randFrom(pool);
    const newTwist = game.twist_enabled ? randFrom(twistBank) : null;

    await updateGame({
      phase: PHASES.PROMPT,
      current_challenge: newChallenge,
      current_twist: newTwist,
      time_left: game.round_length,
      is_running: true
    });
  };

  const nextPhase = async () => {
    if (game.phase === PHASES.PROMPT && game.twist_enabled) {
      await updateGame({
        phase: PHASES.TWIST,
        time_left: Math.max(45, Math.floor(game.round_length / 3)),
        is_running: true
      });
      return;
    }
    if (game.phase === PHASES.PROMPT && !game.twist_enabled) {
      await updateGame({
        phase: PHASES.SCORING,
        is_running: false
      });
      return;
    }
    if (game.phase === PHASES.TWIST) {
      await updateGame({
        phase: PHASES.SCORING,
        is_running: false
      });
      return;
    }
    if (game.phase === PHASES.SCORING) {
      if (game.current_round >= game.rounds) {
        await updateGame({ phase: PHASES.END });
      } else {
        const pool = game.mode === "Any" ? challengeBank : challengeBank.filter((c) => c.mode === game.mode);
        const newChallenge = randFrom(pool);
        const newTwist = game.twist_enabled ? randFrom(twistBank) : null;
        await updateGame({
          current_round: game.current_round + 1,
          phase: PHASES.PROMPT,
          current_challenge: newChallenge,
          current_twist: newTwist,
          time_left: game.round_length,
          is_running: true
        });
      }
    }
  };

  const stopTimer = () => updateGame({ is_running: false });
  const startTimer = async () => {
    if (game.time_left === 0) {
      await updateGame({ time_left: 30, is_running: true });
    } else {
      await updateGame({ is_running: true });
    }
  };
  const resetTimer = () => updateGame({ is_running: false, time_left: game.round_length });

  const onEditSubmission = async (teamId, field, value) => {
    setSubmissions(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [field]: value
      }
    }));

    const existing = submissions[teamId];
    if (existing) {
      await supabase
        .from('submissions')
        .update({ [field]: value })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('submissions')
        .insert({
          game_id: gameId,
          team_id: teamId,
          round: game.current_round,
          [field]: value
        });
    }
  };

  const onScore = async (teamId, field, value) => {
    setScores(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [field]: value
      }
    }));

    const existing = scores[teamId];
    if (existing) {
      await supabase
        .from('scores')
        .update({ [field]: value })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('scores')
        .insert({
          game_id: gameId,
          team_id: teamId,
          round: game.current_round,
          [field]: value
        });
    }
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

  const finalizeScoring = async () => {
    for (const t of teams) {
      const roundTotal = roundTotals[t.id] || 0;
      await supabase
        .from('teams')
        .update({ score: t.score + roundTotal })
        .eq('id', t.id);
    }
    await updateGame({ phase: PHASES.RESULTS });
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

    for (const t of teams) {
      const sub = submissions[t.id] || {};
      const s = scores[t.id] || {};
      const total = (s.creativity || 0) + (s.clarity || 0) + (s.power || 0);
      const cumulative = (t.score || 0) + total;
      rows.push([
        game.current_round,
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
    a.download = `prompt-wars_round-${game.current_round}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = async () => {
    if (!confirm("Reset everything? This will clear teams and progress.")) return;
    if (gameId) {
      await supabase.from('games').delete().eq('id', gameId);
    }
    setGameId(null);
    setGame(null);
    setTeams([]);
    setSubmissions({});
    setScores({});
    setTeamName("");
    window.history.pushState({}, '', window.location.pathname);
  };

  useEffect(() => {
    if (!game || !game.is_running || !isFacilitator) return;

    const interval = setInterval(async () => {
      setGame(currentGame => {
        if (currentGame && currentGame.is_running) {
          if (currentGame.time_left > 0) {
            updateGame({ time_left: currentGame.time_left - 1 });
          } else {
            updateGame({ is_running: false });
          }
        }
        return currentGame;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.is_running, gameId, isFacilitator]);

  if (!gameId || !game) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full border">
          <div className="text-center mb-6">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-700" />
            <h1 className="text-2xl font-bold mb-2">Prompt Wars</h1>
            <p className="text-slate-600">Interactive Team Builder with Live Sync</p>
          </div>
          <button
            className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-700 font-medium"
            onClick={createNewGame}
          >
            Create New Game
          </button>
        </div>
      </div>
    );
  }

  const phaseBadge = {
    [PHASES.SETUP]: "bg-slate-200 text-slate-800",
    [PHASES.PROMPT]: "bg-blue-100 text-blue-800",
    [PHASES.TWIST]: "bg-purple-100 text-purple-800",
    [PHASES.SCORING]: "bg-amber-100 text-amber-800",
    [PHASES.RESULTS]: "bg-emerald-100 text-emerald-800",
    [PHASES.END]: "bg-rose-100 text-rose-800",
  }[game.phase];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Sparkles className="w-6 h-6" />
          <h1 className="text-xl font-bold">Prompt Wars</h1>
          <span className={classNames("text-xs px-2 py-1 rounded-full", phaseBadge)}>
            {game.phase.toUpperCase()}
          </span>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {isFacilitator && (
              <>
                <button
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-sm"
                  onClick={shareParticipantLink}
                  title="Share participant link"
                >
                  {copiedParticipant ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  {copiedParticipant ? "Copied!" : "Share"}
                </button>
                <button
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-700 text-sm"
                  onClick={exportCSV}
                  title="Export round data to CSV"
                >
                  <Download className="w-4 h-4" /> Export
                </button>
                <button
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-500 text-sm"
                  onClick={clearAll}
                  title="Reset everything"
                >
                  <RefreshCcw className="w-4 h-4" /> Reset
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {game.phase === PHASES.SETUP && isFacilitator && (
          <SetupPanel
            {...{
              teamName,
              setTeamName,
              addTeam,
              teams,
              removeTeam,
              game,
              updateGame,
              startGame,
              shareParticipantLink,
              copiedParticipant,
              shareFacilitatorLink,
              copied,
            }}
          />
        )}

        {game.phase === PHASES.SETUP && !isFacilitator && (
          <ParticipantWaitingRoom game={game} teams={teams} />
        )}

        {game.phase !== PHASES.SETUP && (
          <GameHUD
            {...{ game, startTimer, stopTimer, resetTimer, isFacilitator }}
          />
        )}

        {game.phase === PHASES.PROMPT && (
          <PromptPhase
            {...{ teams, submissions, onEditSubmission, challenge: game.current_challenge, nextPhase, isRunning: game.is_running, isFacilitator }}
          />
        )}

        {game.phase === PHASES.TWIST && (
          <TwistPhase {...{ teams, submissions, onEditSubmission, twist: game.current_twist, nextPhase, isRunning: game.is_running, isFacilitator }} />
        )}

        {game.phase === PHASES.SCORING && (
          <ScoringPhase
            {...{ teams, submissions, scores, onScore, roundTotals, finalizeScoring, isFacilitator }}
          />
        )}

        {game.phase === PHASES.RESULTS && (
          <ResultsPhase
            {...{ leaderboard, game, nextPhase, updateGame, isFacilitator }}
          />
        )}

        {game.phase === PHASES.END && <FinalWinners {...{ leaderboard, updateGame, isFacilitator }} />}
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-8 text-xs text-slate-500">
        Built for rapid, in-room facilitation. Share the link so teams can join from any device.
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
  game,
  updateGame,
  startGame,
  shareParticipantLink,
  copiedParticipant,
  shareFacilitatorLink,
  copied,
}) {
  return (
    <div className="grid gap-6">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Share2 className="w-5 h-5" /> Share Links
        </h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-blue-800 mb-1">Participant Link</div>
            <button
              className="w-full px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500"
              onClick={shareParticipantLink}
            >
              {copiedParticipant ? <><Check className="w-4 h-4 inline" /> Copied!</> : <><Share2 className="w-4 h-4 inline" /> Copy Link</>}
            </button>
            <p className="text-xs text-blue-700 mt-1">Teams can view and enter prompts</p>
          </div>
          <div>
            <div className="text-blue-800 mb-1">Facilitator Link</div>
            <button
              className="w-full px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700"
              onClick={shareFacilitatorLink}
            >
              {copied ? <><Check className="w-4 h-4 inline" /> Copied!</> : <><Share2 className="w-4 h-4 inline" /> Copy Link</>}
            </button>
            <p className="text-xs text-blue-700 mt-1">Full control and setup access</p>
          </div>
        </div>
      </div>
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
                value={game.rounds}
                onChange={(e) => updateGame({ rounds: Number(e.target.value) })}
              />
            </label>
            <label className="block">
              <span className="text-slate-600">Mode</span>
              <select
                className="w-full mt-1 px-3 py-2 rounded-xl border"
                value={game.mode}
                onChange={(e) => updateGame({ mode: e.target.value })}
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
                value={game.round_length}
                onChange={(e) => updateGame({ round_length: Number(e.target.value), time_left: Number(e.target.value) })}
              />
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={game.twist_enabled}
                onChange={(e) => updateGame({ twist_enabled: e.target.checked })}
              />
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
    </div>
  );
}

function ParticipantWaitingRoom({ game, teams }) {
  return (
    <div className="grid gap-6">
      <div className="bg-white rounded-2xl shadow-sm p-8 border text-center">
        <TimerIcon className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h2 className="text-2xl font-bold mb-2">Waiting for Game to Start</h2>
        <p className="text-slate-600 mb-6">The facilitator is setting up the game. You'll see the challenge when the game begins.</p>
        <div className="bg-slate-50 rounded-xl p-4">
          <h3 className="font-semibold mb-3">Teams Registered ({teams.length})</h3>
          <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {teams.map((t) => (
              <li key={t.id} className="border rounded-lg p-2 bg-white text-sm">
                {t.name}
              </li>
            ))}
            {teams.length === 0 && <p className="text-sm text-slate-500">No teams yet</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function GameHUD({ game, startTimer, stopTimer, resetTimer, isFacilitator }) {
  return (
    <div className="mb-6 grid md:grid-cols-3 gap-3">
      <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-3">
        <TimerIcon className="w-6 h-6" />
        <div>
          <div className="text-xs text-slate-500">Timer</div>
          <div className="text-xl font-semibold tabular-nums">{formatTime(game.time_left)}</div>
        </div>
        {isFacilitator && (
          <div className="ml-auto flex items-center gap-2">
            {!game.is_running ? (
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
        )}
      </div>
      <div className="bg-white rounded-2xl p-5 border shadow-sm">
        <div className="text-xs text-slate-500">Round</div>
        <div className="text-xl font-semibold">{game.current_round} / {game.rounds}</div>
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

function PromptPhase({ teams, submissions, onEditSubmission, challenge, nextPhase, isRunning, isFacilitator }) {
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

      {isFacilitator && (
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
      )}
    </div>
  );
}

function TwistPhase({ teams, submissions, onEditSubmission, twist, nextPhase, isRunning, isFacilitator }) {
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

      {isFacilitator && (
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
      )}
    </div>
  );
}

function ScoringPhase({ teams, submissions, scores, onScore, roundTotals, finalizeScoring, isFacilitator }) {
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
            {isFacilitator ? (
              <>
                <ScoreRow label="Creativity" value={scores[t.id]?.creativity || 0} onChange={(v) => onScore(t.id, "creativity", v)} />
                <ScoreRow label="Clarity" value={scores[t.id]?.clarity || 0} onChange={(v) => onScore(t.id, "clarity", v)} />
                <ScoreRow label="Prompt Power" value={scores[t.id]?.power || 0} onChange={(v) => onScore(t.id, "power", v)} />
              </>
            ) : (
              <div className="text-sm text-slate-500 text-center py-3">Waiting for facilitator to score...</div>
            )}
          </motion.div>
        ))}
      </div>

      {isFacilitator && (
        <div className="flex justify-end">
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
            onClick={finalizeScoring}
          >
            Finalize Round
          </button>
        </div>
      )}
    </div>
  );
}

function ResultsPhase({ leaderboard, game, nextPhase, updateGame, isFacilitator }) {
  return (
    <div className="grid gap-6">
      <Callout title={`Round ${game.current_round} Results`} icon={<Trophy className="w-5 h-5" />}>
        <p>Scores have been added to team totals. Keep the momentum going!</p>
      </Callout>

      <Leaderboard leaderboard={leaderboard} />

      {isFacilitator && (
        <div className="flex justify-end gap-2">
          {game.current_round < game.rounds ? (
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700"
              onClick={nextPhase}
            >
              Next Round
            </button>
          ) : (
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-500"
              onClick={() => updateGame({ phase: PHASES.END })}
            >
              View Winners
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FinalWinners({ leaderboard, updateGame, isFacilitator }) {
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
      {isFacilitator && (
        <div className="flex justify-end">
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700"
            onClick={() => {
              updateGame({ phase: PHASES.SETUP, current_round: 1 });
            }}
          >
            Play Again
          </button>
        </div>
      )}
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
