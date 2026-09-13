"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchTask = {
  id: string;
  title: string;
  completed: boolean;
  priority?: string;
  category?: string;
  dueDate?: string;
};

type SearchEvent = {
  id: string;
  title: string;
  date: string;
  provider?: string;
  location?: string;
};

type SearchResult = {
  id: string;
  title: string;
  detail: string;
  type: "Task" | "Event" | "Page";
  href: string;
};

const pages: SearchResult[] = [
  { id: "dashboard", title: "Dashboard", detail: "Workspace overview", type: "Page", href: "/" },
  { id: "tasks", title: "Tasks", detail: "Task manager", type: "Page", href: "/tasks" },
  { id: "focus", title: "Focus", detail: "Focus mode timer", type: "Page", href: "/focus" },
  { id: "calendar", title: "Calendar", detail: "Events and integrations", type: "Page", href: "/calendar" },
  { id: "gpa", title: "GPA Tracker", detail: "Course grades and point tracker", type: "Page", href: "/gpa" },
  { id: "profile", title: "Profile", detail: "Account and preferences", type: "Page", href: "/profile" },
  { id: "settings", title: "Settings", detail: "App settings", type: "Page", href: "/settings" },
];

function matches(value: string | undefined, query: string) {
  return Boolean(value && value.toLowerCase().includes(query));
}

export default function SearchBar() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<SearchTask[]>([]);
  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/tasks")
      .then((response) => response.json())
      .then((data: { tasks?: SearchTask[] }) => {
        if (active) setTasks(data.tasks || []);
      })
      .catch(() => {
        if (active) setTasks([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const loadEvents = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("tasktracker-events") || "[]") as SearchEvent[];
        setEvents(saved);
      } catch {
        setEvents([]);
      }
    };
    const eventLoad = window.setTimeout(loadEvents, 0);
    return () => {
      active = false;
      window.clearTimeout(eventLoad);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setFocused(true);
      }
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        event.preventDefault();
        inputRef.current?.focus();
        setFocused(true);
      }
    }
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setFocused(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const taskResults: SearchResult[] = tasks
      .filter((task) => matches(task.title, normalized) || matches(task.category, normalized) || matches(task.priority, normalized) || (task.completed ? "completed" : "open").includes(normalized))
      .map((task) => ({ id: `task-${task.id}`, title: task.title, detail: `${task.completed ? "Completed" : "Open"} task${task.category ? ` · ${task.category}` : ""}`, type: "Task", href: "/tasks" }));
    const eventResults: SearchResult[] = events
      .filter((event) => matches(event.title, normalized) || matches(event.location, normalized) || matches(event.provider, normalized) || matches(event.date, normalized))
      .map((event) => ({ id: `event-${event.provider || "local"}-${event.id}`, title: event.title, detail: `${event.date}${event.location ? ` · ${event.location}` : ""}`, type: "Event", href: "/calendar" }));
    const pageResults = pages.filter((page) => matches(page.title, normalized) || matches(page.detail, normalized));
    return [...taskResults, ...eventResults, ...pageResults].slice(0, 8);
  }, [events, query, tasks]);

  function openResult(result: SearchResult) {
    setQuery("");
    setFocused(false);
    router.push(result.href);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (results[0]) openResult(results[0]);
  }

  const showDropdown = focused && query.trim().length > 0;

  return (
    <div className="global-search" ref={containerRef}>
      <form className="global-search-form" onSubmit={handleSubmit} role="search">
        <span className="global-search-icon" aria-hidden="true">⌕</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
              setFocused(false);
            }
          }}
          placeholder="Search..."
          aria-label="Search tasks, events, and pages"
        />
        {query ? <button className="global-search-clear" type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Clear search">×</button> : <kbd>⌘K</kbd>}
      </form>
      {showDropdown && (
        <div className="global-search-results" id="global-search-results">
          {loading && <p className="global-search-status">Searching...</p>}
          {!loading && results.map((result) => (
            <button className="global-search-result" key={result.id} type="button" onClick={() => openResult(result)}>
              <span className={`global-search-result-icon search-result-${result.type.toLowerCase()}`}>{result.type === "Task" ? "✓" : result.type === "Event" ? "▦" : "→"}</span>
              <span><strong>{result.title}</strong><small>{result.type} · {result.detail}</small></span>
            </button>
          ))}
          {!loading && !results.length && <p className="global-search-status">No matching tasks, events, or pages.</p>}
        </div>
      )}
    </div>
  );
}
