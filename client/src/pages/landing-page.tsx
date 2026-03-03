import { useState } from "react";
import { Star, Users, Trophy, Target, Shuffle, Heart, BarChart3, BookOpen, Tv, Film, List, Zap, ArrowRight, CheckCircle, Flame } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function LandingPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"movies" | "shows" | "anime">("movies");

  const mockItems = {
    movies: [
      { title: "Dune: Part Two", year: 2024, rating: 5, status: "Completed" },
      { title: "Oppenheimer", year: 2023, rating: 5, status: "Completed" },
      { title: "Poor Things", year: 2023, rating: 4, status: "Completed" },
      { title: "Alien: Romulus", year: 2024, rating: 4, status: "Plan to Watch" },
    ],
    shows: [
      { title: "Severance", year: 2022, rating: 5, status: "Watching" },
      { title: "The Bear", year: 2022, rating: 5, status: "Completed" },
      { title: "Shogun", year: 2024, rating: 5, status: "Completed" },
      { title: "The Penguin", year: 2024, rating: 4, status: "Plan to Watch" },
    ],
    anime: [
      { title: "Frieren: Beyond Journey's End", year: 2023, rating: 5, status: "Completed" },
      { title: "Dungeon Meshi", year: 2024, rating: 5, status: "Completed" },
      { title: "Solo Leveling", year: 2024, rating: 4, status: "Watching" },
      { title: "Blue Box", year: 2024, rating: 4, status: "Plan to Watch" },
    ],
  };

  const statusColor: Record<string, string> = {
    "Completed": "bg-green-500/20 text-green-400",
    "Watching": "bg-blue-500/20 text-blue-400",
    "Plan to Watch": "bg-purple-500/20 text-purple-400",
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white font-sans">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d1117]/80 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-lg">🎬</div>
          <span className="font-bold text-lg text-white">CozyWatch</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#features" className="hidden md:block text-sm text-gray-400 hover:text-white transition-colors">Features</a>
          <a href="#social" className="hidden md:block text-sm text-gray-400 hover:text-white transition-colors">Social</a>
          <a href="#pricing" className="hidden md:block text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
          {user ? (
            <Link href="/">
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-all">
                Go to App →
              </button>
            </Link>
          ) : (
            <Link href="/auth">
              <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/20">
                Get Started Free
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-300 text-sm font-medium mb-6">
            🎬 Track movies, shows & anime
          </div>

          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6">
            Your cozy space to track
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">everything you watch.</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Rate movies, track shows, discover anime — with friends, streaks, achievements, and AI recommendations all in one beautifully dark app.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth">
              <button className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 shadow-2xl shadow-purple-500/30 transition-all text-lg">
                Start tracking free <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <p className="text-sm text-gray-500">No credit card required</p>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-14 flex-wrap">
            {[
              { label: "Titles Tracked", value: "Movies, Shows & Anime" },
              { label: "Watch Streaks", value: "Daily Challenges" },
              { label: "Social Features", value: "Friends & Feed" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center px-6 border-r last:border-r-0 border-white/10">
                <p className="text-sm font-bold text-purple-300">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── App Preview ── */}
      <section className="py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#161b22] rounded-2xl border border-white/5 p-4 shadow-2xl">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <div className="flex-1 bg-[#0d1117] rounded-md h-5 mx-3 flex items-center px-3">
                <span className="text-gray-500 text-xs">cozywatch.app</span>
              </div>
            </div>

            {/* Mock tab switcher */}
            <div className="flex gap-2 mb-4">
              {(["movies", "shows", "anime"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${tab === t ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-gray-500 hover:text-gray-300"}`}>
                  {t === "movies" ? "🎬" : t === "shows" ? "📺" : "⚡"} {t}
                </button>
              ))}
            </div>

            {/* Mock list */}
            <div className="space-y-2">
              {mockItems[tab].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-[#0d1117] rounded-xl px-4 py-3">
                  <div className="w-10 h-14 bg-gradient-to-br from-purple-800 to-pink-900 rounded-md flex-shrink-0 flex items-center justify-center text-lg">
                    {tab === "movies" ? "🎬" : tab === "shows" ? "📺" : "⚡"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.year}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 text-xs">{"★".repeat(item.rating)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[item.status]}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-white">Everything a media nerd needs</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Built for people who take their watchlist seriously.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: "🎬", gradient: "from-purple-500 to-purple-700", title: "Track Everything", desc: "Movies, TV shows, anime — rate them, log watch sessions, and never forget what you've seen." },
              { icon: "⭐", gradient: "from-yellow-500 to-orange-600", title: "Rate & Review", desc: "Give star ratings, write personal notes, and build your own taste profile over time." },
              { icon: "📊", gradient: "from-green-500 to-emerald-700", title: "Rich Statistics", desc: "See your watch time, top genres, rating distributions, and watching patterns at a glance." },
              { icon: "🏆", gradient: "from-yellow-400 to-yellow-600", title: "Achievements & Badges", desc: "Earn badges for milestones — First Watch, Binge Watcher, Week Warrior, Night Owl and more." },
              { icon: "🔥", gradient: "from-orange-500 to-red-600", title: "Watch Streaks", desc: "Keep your daily watch streak alive. Hit 3 days, 7 days — get rewarded for consistency." },
              { icon: "🎲", gradient: "from-pink-500 to-rose-600", title: "Random Picker", desc: "Can't decide what to watch? Let the random picker choose something from your watchlist." },
              { icon: "👥", gradient: "from-blue-500 to-indigo-600", title: "Friends & Feed", desc: "Add friends, see what they're watching, like and comment on their activity." },
              { icon: "💯", gradient: "from-teal-500 to-cyan-600", title: "Taste Match", desc: "See how similar your taste is to your friends — calculated from your completed titles." },
              { icon: "📋", gradient: "from-violet-500 to-purple-700", title: "Custom Lists", desc: "Create lists like 'Movies to watch with my partner' or 'Best of 2024' — fully customizable." },
            ].map(({ icon, gradient, title, desc }) => (
              <div key={title} className="bg-[#161b22] rounded-2xl p-5 border border-white/5 hover:border-purple-500/20 transition-all group">
                <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-4 text-xl shadow-lg`}>
                  {icon}
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Section ── */}
      <section id="social" className="py-20 px-6 bg-[#161b22]">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-xs font-medium mb-5">
                👥 Social Features
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-5">
                Watch together,<br />even when apart.
              </h2>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Your friends are watching great things. Follow their activity, react to their ratings, 
                and find your next binge based on what people with similar taste loved.
              </p>
              <div className="space-y-3">
                {[
                  "Activity feed — see what friends are watching in real time",
                  "Like and comment on their reviews",
                  "Taste Match % — see how similar your taste is",
                  "Friend requests & social profiles",
                ].map(f => (
                  <div key={f} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock feed */}
            <div className="bg-[#0d1117] rounded-2xl border border-white/5 p-4 space-y-3">
              {[
                { user: "alex_w", action: "completed", title: "Severance S2", rating: 5, time: "2 min ago", likes: 4 },
                { user: "maya_j", action: "started watching", title: "Frieren", rating: null, time: "1 hr ago", likes: 2 },
                { user: "chris_r", action: "rated", title: "Dune: Part Two", rating: 5, time: "3 hrs ago", likes: 7 },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-[#161b22] rounded-xl p-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {item.user[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold text-white">{item.user}</span>
                      <span className="text-gray-400"> {item.action} </span>
                      <span className="font-medium text-purple-300">{item.title}</span>
                      {item.rating && <span className="text-yellow-400 ml-1">{"★".repeat(item.rating)}</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-xs text-gray-500">{item.time}</p>
                      <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors">
                        <Heart className="w-3 h-3" /> {item.likes}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Goals & Achievements ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Achievements */}
          <div className="bg-[#161b22] rounded-2xl border border-white/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h3 className="font-bold text-white">Your Achievements</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { emoji: "🎬", label: "First Watch", earned: true },
                { emoji: "✅", label: "First Complete", earned: true },
                { emoji: "📺", label: "Binge Watcher", earned: true },
                { emoji: "🔥", label: "On a Roll", earned: true },
                { emoji: "🚀", label: "Week Warrior", earned: false },
                { emoji: "🦉", label: "Night Owl", earned: false },
                { emoji: "🎥", label: "Cinephile", earned: false },
                { emoji: "⭐", label: "Critic", earned: true },
                { emoji: "🦋", label: "Social", earned: false },
              ].map(({ emoji, label, earned }) => (
                <div key={label} className={`rounded-xl p-2.5 text-center border transition-all ${earned ? "bg-yellow-500/10 border-yellow-500/20" : "bg-[#0d1117] border-white/5 opacity-40 grayscale"}`}>
                  <div className="text-2xl mb-0.5">{emoji}</div>
                  <p className="text-xs text-gray-300 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Watch Goals */}
          <div className="bg-[#161b22] rounded-2xl border border-white/5 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400" />
              <h3 className="font-bold text-white">2026 Watch Goals</h3>
            </div>
            {[
              { label: "Movies", current: 34, target: 50, color: "bg-purple-500" },
              { label: "Series", current: 8, target: 15, color: "bg-blue-500" },
              { label: "Total", current: 42, target: 60, color: "bg-green-500" },
            ].map(({ label, current, target, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <span className="text-gray-300">{label}</span>
                  <span className="text-gray-400">{current}/{target}</span>
                </div>
                <div className="h-2 bg-[#0d1117] rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, (current/target)*100)}%` }} />
                </div>
              </div>
            ))}

            <div className="mt-4 bg-[#0d1117] rounded-xl p-4 flex items-center gap-3">
              <div className="text-3xl">🔥</div>
              <div>
                <p className="font-bold text-white">5-day streak!</p>
                <p className="text-xs text-gray-400">Keep it going — watch something today</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 px-6 bg-[#161b22]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Completely free to use</h2>
          <p className="text-gray-400 text-lg mb-12">All features, no paywalls. Just sign up and start tracking.</p>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-8">
            <div className="text-5xl font-black text-white mb-2">Free</div>
            <p className="text-gray-400 mb-8">Everything included</p>
            <div className="grid sm:grid-cols-2 gap-3 text-left mb-8">
              {[
                "Unlimited movies, shows & anime",
                "Activity feed & social features",
                "Achievements & watch streaks",
                "Custom lists",
                "Watch goals",
                "Friends & taste match",
                "AI recommendations",
                "Random watchlist picker",
              ].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <Link href="/auth">
              <button className="px-10 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 shadow-xl shadow-purple-500/30 transition-all text-lg">
                Create your account — it's free
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 bg-[#0d1117] border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-sm">🎬</div>
          <span className="text-white font-bold">CozyWatch</span>
        </div>
        <p className="text-gray-500 text-sm">Built for people who love what they watch.</p>
      </footer>
    </div>
  );
}
