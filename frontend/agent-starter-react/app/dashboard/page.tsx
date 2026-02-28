'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  SparklesIcon,
  Plus,
  Loader2,
  LogOut,
  FolderIcon,
  CalendarIcon,
  CodeIcon,
  HomeIcon,
  ChevronRightIcon,
  SearchIcon,
  ArrowRightIcon,
  BookOpenIcon,
  FileTextIcon,
  UploadIcon,
  MapIcon,
  Trash2,
} from 'lucide-react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { supabase } from '@/lib/supabase';
import {
  listProjects,
  createProject,
  deleteProject,
  ProjectRecord,
  LanguageType,
  listLearnBooks,
  createLearnBook,
  deleteLearnBook,
  uploadLearnBookPdf,
  LearnBookRecord,
} from '@/lib/voiceforge-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ActiveTab = 'projects' | 'learn-books';

export default function DashboardPage() {
  const { session, isLoading } = useSupabaseSession();
  const router = useRouter();

  // ── Active section tab ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('projects');

  // ── Projects state ────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLanguage, setNewProjectLanguage] = useState<LanguageType>('python');
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  // ── Learn Books state ─────────────────────────────────────────────────────
  const [learnBooks, setLearnBooks] = useState<LearnBookRecord[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newBookDescription, setNewBookDescription] = useState('');
  const [newBookLanguage, setNewBookLanguage] = useState<LanguageType>('python');
  const [newBookPdf, setNewBookPdf] = useState<File | null>(null);
  const [creatingBook, setCreatingBook] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState('');

  // ── Delete state ──────────────────────────────────────────────────────────
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null);
  const [confirmDeleteBookId, setConfirmDeleteBookId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [session, isLoading, router]);

  useEffect(() => {
    if (!session) return;
    listProjects(session.access_token)
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoadingProjects(false));
    listLearnBooks(session.access_token)
      .then(setLearnBooks)
      .catch(console.error)
      .finally(() => setLoadingBooks(false));
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ── Create Project ────────────────────────────────────────────────────────
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !newProjectName.trim()) return;
    setCreatingProject(true);
    try {
      const newProject = await createProject(newProjectName, newProjectLanguage, '', session.access_token);
      setProjects([newProject, ...projects]);
      setIsProjectModalOpen(false);
      setNewProjectName('');
      setNewProjectLanguage('python');
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreatingProject(false);
    }
  };

  // ── Create Learn Book ─────────────────────────────────────────────────────
  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !newBookName.trim()) return;
    setCreatingBook(true);
    try {
      const book = await createLearnBook(
        { name: newBookName, description: newBookDescription || undefined, language: newBookLanguage },
        session.access_token
      );
      // Upload PDF if provided
      if (newBookPdf) {
        try {
          await uploadLearnBookPdf(book.id, newBookPdf, session.access_token);
          book.has_pdf = true;
        } catch (pdfErr) {
          console.error('PDF upload failed (book still created):', pdfErr);
        }
      }
      setLearnBooks([book, ...learnBooks]);
      setIsBookModalOpen(false);
      setNewBookName('');
      setNewBookDescription('');
      setNewBookLanguage('python');
      setNewBookPdf(null);
    } catch (error) {
      console.error('Failed to create learn book:', error);
    } finally {
      setCreatingBook(false);
    }
  };

  // ── Delete Handlers ─────────────────────────────────────────────────────
  const handleDeleteProject = async (id: string) => {
    if (!session) return;
    setDeletingId(id);
    try {
      await deleteProject(id, session.access_token);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Failed to delete project:', error);
    } finally {
      setDeletingId(null);
      setConfirmDeleteProjectId(null);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!session) return;
    setDeletingId(id);
    try {
      await deleteLearnBook(id, session.access_token);
      setLearnBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      console.error('Failed to delete learn book:', error);
    } finally {
      setDeletingId(null);
      setConfirmDeleteBookId(null);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearchQuery.toLowerCase())
  );
  const filteredBooks = learnBooks.filter((b) =>
    b.name.toLowerCase().includes(bookSearchQuery.toLowerCase())
  );

  if (isLoading || !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-500">
            <SparklesIcon className="h-5 w-5 text-slate-950" />
          </span>
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-500/8 blur-3xl" />
      </div>

      {/* Top Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-sky-500 shadow-sm shadow-cyan-500/30">
              <SparklesIcon className="h-3.5 w-3.5 text-slate-950" />
            </span>
            <span className="text-sm font-semibold tracking-tight">VoiceForge</span>
          </Link>

          <nav className="hidden items-center gap-1 text-sm text-slate-400 sm:flex">
            <Link href="/" className="flex items-center gap-1 transition-colors hover:text-slate-200">
              <HomeIcon className="h-3.5 w-3.5" />
              Home
            </Link>
            <ChevronRightIcon className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-slate-200">Dashboard</span>
            <ChevronRightIcon className="h-3.5 w-3.5 text-slate-600" />
            <Link href="/roadmap" className="flex items-center gap-1 transition-colors hover:text-slate-200">
              <MapIcon className="h-3.5 w-3.5" />
              Roadmap
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {activeTab === 'projects' ? (
              <Button
                onClick={() => setIsProjectModalOpen(true)}
                size="sm"
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">New</span>
              </Button>
            ) : (
              <Button
                onClick={() => setIsBookModalOpen(true)}
                size="sm"
                className="bg-violet-500 text-white hover:bg-violet-400"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Learn Book</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* Section switcher tabs */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
              <button
                onClick={() => setActiveTab('projects')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === 'projects'
                    ? 'bg-cyan-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderIcon className="h-4 w-4" />
                Projects
                <span className={`rounded-full px-1.5 py-0.5 text-xs ${activeTab === 'projects' ? 'bg-slate-950/20' : 'bg-slate-800 text-slate-400'}`}>
                  {projects.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('learn-books')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === 'learn-books'
                    ? 'bg-violet-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpenIcon className="h-4 w-4" />
                Learn Books
                <span className={`rounded-full px-1.5 py-0.5 text-xs ${activeTab === 'learn-books' ? 'bg-white/20' : 'bg-slate-800 text-slate-400'}`}>
                  {learnBooks.length}
                </span>
              </button>
            </div>
          </div>

          {/* Roadmap quick-access */}
          <Link
            href="/roadmap"
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-300"
          >
            <MapIcon className="h-4 w-4" />
            Roadmap Generator
          </Link>
        </div>

        {/* ── Projects tab ────────────────────────────────────────────────── */}
        {activeTab === 'projects' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Your Projects</h1>
              <p className="mt-1 text-sm text-slate-400">
                {projects.length} project{projects.length !== 1 ? 's' : ''} — click any to open its workspace
              </p>
            </div>

            {projects.length > 0 && (
              <div className="mb-6 flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    placeholder="Search projects..."
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    className="border-slate-700 bg-slate-900 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/40"
                  />
                </div>
              </div>
            )}

            {loadingProjects ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
              </div>
            ) : filteredProjects.length === 0 && projects.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900">
                  <FolderIcon className="h-7 w-7 text-slate-500" />
                </span>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-300">No projects yet</p>
                  <p className="mt-1 text-xs text-slate-500">Create your first project to get started</p>
                </div>
                <Button onClick={() => setIsProjectModalOpen(true)} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                  <Plus className="mr-2 h-4 w-4" />
                  Create first project
                </Button>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-500">
                No projects match &quot;{projectSearchQuery}&quot;
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group relative flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-slate-900 hover:shadow-lg hover:shadow-black/30"
                  >
                    <button
                      onClick={() => router.push(`/workspace/${project.id}`)}
                      className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                      aria-label={`Open project ${project.name}`}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 group-hover:border-cyan-400/30 group-hover:bg-cyan-400/10 transition-colors">
                          <FolderIcon className="h-4 w-4 text-slate-400 group-hover:text-cyan-300 transition-colors" />
                        </span>
                        <h2 className="text-sm font-semibold text-slate-100 leading-tight group-hover:text-white transition-colors">
                          {project.name}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteProjectId(project.id); }}
                          className="relative z-10 rounded-md p-1 text-slate-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                          aria-label={`Delete project ${project.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-600 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-cyan-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${project.language === 'python' ? 'bg-blue-400/10 text-blue-300 ring-blue-400/20' : 'bg-amber-400/10 text-amber-300 ring-amber-400/20'}`}>
                        <CodeIcon className="h-3 w-3" />
                        {project.language === 'python' ? 'Python' : 'HTML/JS'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarIcon className="h-3 w-3" />
                      Updated{' '}
                      {project.updated_at
                        ? new Date(project.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Learn Books tab ──────────────────────────────────────────────── */}
        {activeTab === 'learn-books' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Your Learn Books</h1>
              <p className="mt-1 text-sm text-slate-400">
                {learnBooks.length} book{learnBooks.length !== 1 ? 's' : ''} — voice-powered learning with detailed code explanations
              </p>
            </div>

            {learnBooks.length > 0 && (
              <div className="mb-6 flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    placeholder="Search books..."
                    value={bookSearchQuery}
                    onChange={(e) => setBookSearchQuery(e.target.value)}
                    className="border-slate-700 bg-slate-900 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:ring-violet-500/40"
                  />
                </div>
              </div>
            )}

            {loadingBooks ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
              </div>
            ) : filteredBooks.length === 0 && learnBooks.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900">
                  <BookOpenIcon className="h-7 w-7 text-slate-500" />
                </span>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-300">No learn books yet</p>
                  <p className="mt-1 text-xs text-slate-500">Create a book to start learning with voice + code explanations</p>
                </div>
                <Button onClick={() => setIsBookModalOpen(true)} className="bg-violet-500 text-white hover:bg-violet-400">
                  <Plus className="mr-2 h-4 w-4" />
                  Create first book
                </Button>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-500">
                No books match &quot;{bookSearchQuery}&quot;
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredBooks.map((book) => (
                  <div
                    key={book.id}
                    className="group relative flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-slate-900 hover:shadow-lg hover:shadow-black/30"
                  >
                    <button
                      onClick={() => router.push(`/learn-books/${book.id}`)}
                      className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                      aria-label={`Open learn book ${book.name}`}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 group-hover:border-violet-400/30 group-hover:bg-violet-400/10 transition-colors">
                          <BookOpenIcon className="h-4 w-4 text-slate-400 group-hover:text-violet-300 transition-colors" />
                        </span>
                        <div>
                          <h2 className="text-sm font-semibold text-slate-100 leading-tight group-hover:text-white transition-colors">
                            {book.name}
                          </h2>
                          {book.description && (
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{book.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteBookId(book.id); }}
                          className="relative z-10 rounded-md p-1 text-slate-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                          aria-label={`Delete learn book ${book.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-600 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-violet-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${book.language === 'python' ? 'bg-blue-400/10 text-blue-300 ring-blue-400/20' : 'bg-amber-400/10 text-amber-300 ring-amber-400/20'}`}>
                        <CodeIcon className="h-3 w-3" />
                        {book.language === 'python' ? 'Python' : 'HTML/JS'}
                      </span>
                      {book.has_pdf && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/20">
                          <FileTextIcon className="h-3 w-3" />
                          PDF
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarIcon className="h-3 w-3" />
                      Updated{' '}
                      {book.updated_at
                        ? new Date(book.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Confirm Delete Project Modal ───────────────────────────────────────── */}
      {confirmDeleteProjectId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setConfirmDeleteProjectId(null)}
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/60">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
                <Trash2 className="h-4 w-4 text-red-400" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-100">Delete Project</h2>
                <p className="text-xs text-slate-400">
                  &quot;{projects.find((p) => p.id === confirmDeleteProjectId)?.name}&quot;
                </p>
              </div>
            </div>
            <p className="mb-5 text-sm text-slate-400">
              This action is permanent and cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteProjectId(null)}
                disabled={deletingId === confirmDeleteProjectId}
                className="border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteProject(confirmDeleteProjectId)}
                disabled={deletingId === confirmDeleteProjectId}
                className="bg-red-500 text-white hover:bg-red-400"
              >
                {deletingId === confirmDeleteProjectId && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Book Modal ─────────────────────────────────────────── */}
      {confirmDeleteBookId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setConfirmDeleteBookId(null)}
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/60">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
                <Trash2 className="h-4 w-4 text-red-400" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-100">Delete Learn Book</h2>
                <p className="text-xs text-slate-400">
                  &quot;{learnBooks.find((b) => b.id === confirmDeleteBookId)?.name}&quot;
                </p>
              </div>
            </div>
            <p className="mb-5 text-sm text-slate-400">
              This will also delete any indexed PDF data. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteBookId(null)}
                disabled={deletingId === confirmDeleteBookId}
                className="border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteBook(confirmDeleteBookId)}
                disabled={deletingId === confirmDeleteBookId}
                className="bg-red-500 text-white hover:bg-red-400"
              >
                {deletingId === confirmDeleteBookId && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Project Modal ─────────────────────────────────────────────── */}
      {isProjectModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setIsProjectModalOpen(false)}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/60">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 ring-1 ring-cyan-400/20">
                <Plus className="h-4 w-4 text-cyan-300" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-100">New Project</h2>
                <p className="text-xs text-slate-400">Set up your AI coding workspace</p>
              </div>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="proj-name" className="text-sm text-slate-300">Project name</Label>
                <Input
                  id="proj-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Awesome Project"
                  required
                  autoFocus
                  className="border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-lang" className="text-sm text-slate-300">Language</Label>
                <Select value={newProjectLanguage} onValueChange={(v) => setNewProjectLanguage(v as LanguageType)}>
                  <SelectTrigger id="proj-lang" className="border-slate-700 bg-slate-950 text-slate-100 focus:ring-cyan-500/40">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="html">HTML / JS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsProjectModalOpen(false)} disabled={creatingProject} className="border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-slate-100">
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingProject || !newProjectName.trim()} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                  {creatingProject && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Learn Book Modal ──────────────────────────────────────────── */}
      {isBookModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setIsBookModalOpen(false)}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/60">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
                <BookOpenIcon className="h-4 w-4 text-violet-300" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-100">New Learn Book</h2>
                <p className="text-xs text-slate-400">Voice-powered learning with deep code explanations</p>
              </div>
            </div>
            <form onSubmit={handleCreateBook} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="book-name" className="text-sm text-slate-300">Book name</Label>
                <Input
                  id="book-name"
                  value={newBookName}
                  onChange={(e) => setNewBookName(e.target.value)}
                  placeholder="Learn Python Basics"
                  required
                  autoFocus
                  className="border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus-visible:ring-violet-500/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="book-desc" className="text-sm text-slate-300">
                  Description <span className="text-slate-500">(optional)</span>
                </Label>
                <Input
                  id="book-desc"
                  value={newBookDescription}
                  onChange={(e) => setNewBookDescription(e.target.value)}
                  placeholder="A beginner's journey through Python..."
                  className="border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus-visible:ring-violet-500/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="book-lang" className="text-sm text-slate-300">Language</Label>
                <Select value={newBookLanguage} onValueChange={(v) => setNewBookLanguage(v as LanguageType)}>
                  <SelectTrigger id="book-lang" className="border-slate-700 bg-slate-950 text-slate-100 focus:ring-violet-500/40">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="html">HTML / JS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-300">
                  Reference PDF <span className="text-slate-500">(optional)</span>
                </Label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-600 bg-slate-950 px-4 py-3 transition-colors hover:border-violet-500/50 hover:bg-violet-500/5">
                  <UploadIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="flex-1 truncate text-sm text-slate-400">
                    {newBookPdf ? newBookPdf.name : 'Click to upload a PDF (e.g. a textbook)'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => setNewBookPdf(e.target.files?.[0] ?? null)}
                  />
                </label>
                {newBookPdf && (
                  <button
                    type="button"
                    onClick={() => setNewBookPdf(null)}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Remove PDF
                  </button>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsBookModalOpen(false)} disabled={creatingBook} className="border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-slate-100">
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingBook || !newBookName.trim()} className="bg-violet-500 text-white hover:bg-violet-400">
                  {creatingBook && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  {newBookPdf ? 'Create & Index PDF' : 'Create Book'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
