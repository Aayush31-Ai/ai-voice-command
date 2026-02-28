import Link from 'next/link';
import { ArrowRightIcon, BrainCircuitIcon, MicIcon, SparkleIcon, ZapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/ui/navbar';

export default function HomePage() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-slate-950 text-slate-100">
      <Navbar variant="transparent" />

      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 animate-pulse rounded-full bg-cyan-400/20 blur-3xl [animation-duration:5000ms]" />
        <div className="absolute top-1/3 -left-20 h-64 w-64 animate-pulse rounded-full bg-blue-500/20 blur-3xl [animation-delay:400ms] [animation-duration:6200ms]" />
        <div className="absolute right-0 bottom-0 h-72 w-72 animate-pulse rounded-full bg-emerald-400/10 blur-3xl [animation-delay:800ms] [animation-duration:7000ms]" />
      </div>

      <main className="relative mx-auto w-full max-w-6xl px-6 pt-28 pb-10 md:px-10 md:pt-32 md:pb-12">
        {/* Hero */}
        <section className="mx-auto flex w-full max-w-4xl items-center py-8 text-center md:py-12">
          <div className="w-full">
            <div className="animate-in fade-in zoom-in-95 mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-slate-900/70 px-4 py-2 text-xs text-cyan-200 duration-500">
              <SparkleIcon className="h-3.5 w-3.5" />
              AI-first development — voice + code
            </div>
            <h1 className="animate-in fade-in slide-in-from-bottom-3 text-4xl leading-tight font-semibold duration-700 sm:text-6xl">
              Build with AI that plans,
              <span className="block bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-200 bg-clip-text text-transparent">
                writes, and refines your code.
              </span>
            </h1>
            <p className="animate-in fade-in slide-in-from-bottom-3 mx-auto mt-5 max-w-3xl text-sm text-slate-300 duration-700 [animation-delay:120ms] sm:text-lg">
              VoiceForge combines conversational prompts, automated planning, code generation,
              execution, and summaries in one system. From idea to working output — every step
              designed for fast iteration.
            </p>

            <div className="animate-in fade-in slide-in-from-bottom-3 mt-8 flex flex-col justify-center gap-3 duration-700 [animation-delay:220ms] sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-cyan-300 text-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-cyan-200"
              >
                <Link href="/signup">
                  Get Started Free
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-slate-600 bg-slate-900/40 text-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <Link href="/login">Open AI Workspace</Link>
              </Button>
            </div>

            {/* Social proof strip */}
            <p className="animate-in fade-in mt-6 text-xs text-slate-500 duration-700 [animation-delay:320ms]">
              Powered by <span className="text-cyan-400">LiveKit</span> ·{' '}
              <span className="text-cyan-400">LangGraph</span> ·{' '}
              <span className="text-cyan-400">Groq</span>
            </p>
          </div>
        </section>

        {/* Feature icons strip */}
        <section className="mx-auto mb-8 grid max-w-3xl grid-cols-3 gap-3 text-center sm:gap-6">
          {[
            { icon: MicIcon, label: 'Voice Input', desc: 'Speak your intent naturally' },
            { icon: BrainCircuitIcon, label: 'AI Planning', desc: 'Structured step-by-step plans' },
            { icon: ZapIcon, label: 'Live Execution', desc: 'Run & preview instantly' },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur duration-700"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10 ring-1 ring-cyan-400/20">
                <Icon className="h-5 w-5 text-cyan-300" />
              </span>
              <p className="text-sm font-medium text-slate-200">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </section>

        {/* Services */}
        <section className="mt-2 pb-6 md:pb-8">
          <div className="animate-in fade-in slide-in-from-bottom-3 mb-4 flex items-center justify-between gap-4 duration-700 [animation-delay:280ms]">
            <h2 className="text-xl font-semibold text-slate-100 md:text-2xl">Services</h2>
            <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-200">
              AI-Enabled
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
            <div className="relative pl-6">
              <div className="pointer-events-none absolute top-1 bottom-1 left-2 w-px bg-gradient-to-b from-cyan-300/30 via-cyan-300/70 to-cyan-300/20" />
              <div className="space-y-3">
                {[
                  {
                    title: 'AI Planning',
                    description:
                      'Convert natural voice requests into a structured implementation plan with clear steps, language selection, and execution intent.',
                  },
                  {
                    title: 'Code Generation',
                    description:
                      'Generate production-oriented code from your prompt, then refine it instantly as requirements evolve.',
                  },
                  {
                    title: 'Voice Interaction',
                    description:
                      'Use voice commands for an uninterrupted workflow. Speak tasks, edits, and follow-up instructions without breaking context.',
                  },
                ].map((service, index) => (
                  <article
                    key={service.title}
                    className="animate-in fade-in slide-in-from-bottom-4 relative rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-slate-900/80"
                    style={{ animationDelay: `${320 + index * 120}ms` }}
                  >
                    <span className="absolute top-6 -left-[1.875rem] h-3 w-3 rounded-full border border-cyan-200/60 bg-cyan-300/30 shadow-[0_0_18px_rgba(103,232,249,0.55)]" />
                    <p className="mb-2 text-xs tracking-wide text-cyan-200 uppercase">
                      {service.title}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-300">{service.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <article className="animate-in fade-in slide-in-from-right-4 relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4 backdrop-blur duration-700 [animation-delay:380ms]">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tl from-cyan-400/10 via-transparent to-transparent" />
              <img
                src="https://t4.ftcdn.net/jpg/07/93/86/01/360_F_793860155_sujMcllMxScAQ939IvOL24TFxCrui6jx.jpg"
                alt="AI robot assistant"
                className="h-full min-h-[290px] w-full rounded-xl object-cover object-right"
                loading="lazy"
              />
            </article>
          </div>
        </section>

        {/* How it works */}
        <section className="pb-10">
          <div className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-slate-800/80 bg-slate-900/55 p-6 backdrop-blur duration-700 [animation-delay:620ms]">
            <h3 className="text-lg font-semibold text-slate-100">How the AI workflow works</h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-4">
              {[
                { step: '1. Capture', desc: 'Voice or text request is captured with context.' },
                {
                  step: '2. Plan',
                  desc: 'AI breaks the task into actionable implementation steps.',
                },
                { step: '3. Generate', desc: 'Code is generated and shown live in the editor.' },
                { step: '4. Validate', desc: 'Run, inspect output, and iterate immediately.' },
              ].map(({ step, desc }) => (
                <div
                  key={step}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 transition-colors duration-300 hover:border-cyan-300/30"
                >
                  <p className="mb-1 font-medium text-cyan-200">{step}</p>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="pb-16">
          <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center gap-4 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-sky-400/5 p-8 text-center backdrop-blur duration-700 [animation-delay:700ms]">
            <h3 className="text-2xl font-semibold text-slate-100">
              Ready to build with your voice?
            </h3>
            <p className="max-w-lg text-sm text-slate-400">
              Create your free account and start generating code with AI in minutes.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-cyan-300 text-slate-900 transition-all hover:-translate-y-0.5 hover:bg-cyan-200"
            >
              <Link href="/signup">
                Create Free Account
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-slate-800/60 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-slate-500 sm:flex-row md:px-10">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-cyan-400 to-sky-500">
              <SparkleIcon className="h-3 w-3 text-slate-950" />
            </span>
            <span className="font-medium text-slate-400">VoiceForge</span>
            <span>— AI voice coding workspace</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="transition-colors hover:text-slate-300">
              Sign in
            </Link>
            <Link href="/signup" className="transition-colors hover:text-slate-300">
              Sign up
            </Link>
            <Link href="/dashboard" className="transition-colors hover:text-slate-300">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
