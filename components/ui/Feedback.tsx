"use client";

import { createContext, isValidElement, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleAlert, TriangleAlert, X } from "lucide-react";
import styles from "./feedback.module.css";

type Kind = "success" | "error" | "warning";
type Notice = { id: string; kind: Kind; content: ReactNode; signature: string; onDismiss?: () => void };
type Feedback = { success: (message: string) => void; error: (message: string) => void; warning: (message: string) => void; publish: (notice: Notice) => void; remove: (id: string) => void };
const Context = createContext<Feedback | null>(null);

function contentText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(contentText).join(" ");
  if (isValidElement<{ children?: ReactNode }>(node)) return contentText(node.props.children);
  return "";
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextId = useRef(0);
  const publish = useCallback((notice: Notice) => {
    setNotices(current => {
      if (current.some(item => item.id === notice.id || (notice.kind !== "success" && item.kind === notice.kind && item.signature === notice.signature))) return current;
      const next = [...current.filter(item => !(notice.kind === "success" && item.kind === "success" && item.signature === notice.signature)), notice];
      const visibleSuccesses = new Set(next.filter(item => item.kind === "success").slice(-3).map(item => item.id));
      return next.filter(item => item.kind !== "success" || visibleSuccesses.has(item.id));
    });
  }, []);
  const remove = useCallback((id: string) => setNotices(current => current.filter(item => item.id !== id)), []);
  const feedback = useMemo<Feedback>(() => {
    const send = (kind: Kind, content: string) => { if (content.trim()) publish({ id: `action-${++nextId.current}`, kind, content, signature: content }); };
    return { publish, remove, success: message => send("success", message), error: message => send("error", message), warning: message => send("warning", message) };
  }, [publish, remove]);

  useEffect(() => {
    // Keep native constraints, but present their messages in the shared modal.
    let validating = false;
    function invalid(event: Event) {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
      event.preventDefault();
      if (validating) return;
      validating = true;
      queueMicrotask(() => { validating = false; });
      const label = field.getAttribute("aria-label") || field.labels?.[0]?.textContent?.replace(/\s+/g, " ").trim() || field.name || "This field";
      const message = `${label}: ${field.validationMessage}`;
      publish({ id: `validation-${++nextId.current}`, kind: "warning", content: message, signature: message, onDismiss: () => { requestAnimationFrame(() => { if (field.isConnected) field.focus(); }); } });
    }
    document.addEventListener("invalid", invalid, true);
    return () => document.removeEventListener("invalid", invalid, true);
  }, [publish]);

  const modal = notices.find(item => item.kind !== "success");
  const dismiss = () => { if (modal) { remove(modal.id); modal.onDismiss?.(); } };
  return <Context.Provider value={feedback}>{children}
    <ToastViewport notices={notices.filter(item => item.kind === "success")} remove={remove} />
    {modal && <FeedbackDialog key={modal.id} kind={modal.kind === "warning" ? "warning" : "error"} title={modal.kind === "warning" ? "Please check this" : "Something went wrong"} onClose={dismiss}>
      <div className={styles.message} onClick={event => { if (event.target instanceof Element && event.target.closest("button, a")) dismiss(); }}>{modal.content}</div>
    </FeedbackDialog>}
  </Context.Provider>;
}

function ToastViewport({ notices, remove }: { notices: Notice[]; remove: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const latestId = notices.at(-1)?.id;
  useEffect(() => {
    const viewport = ref.current;
    if (!viewport) return;
    if (latestId) { viewport.hidePopover(); viewport.showPopover(); }
    else viewport.hidePopover();
  }, [latestId]);
  return <div ref={ref} popover="manual" className={styles.toasts} aria-label="Notifications">{notices.map(notice => <Toast key={notice.id} notice={notice} remove={remove} />)}</div>;
}

function Toast({ notice, remove }: { notice: Notice; remove: (id: string) => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => { if (paused) return; const timer = window.setTimeout(() => remove(notice.id), 6000); return () => clearTimeout(timer); }, [notice.id, paused, remove]);
  return <div className={styles.toast} role="status" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}><CheckCircle2 size={21} aria-hidden="true" /><div>{notice.content}</div><button type="button" aria-label="Dismiss notification" onClick={() => remove(notice.id)}><X size={17} /></button></div>;
}

export function useFeedback() {
  const context = useContext(Context);
  if (!context) throw new Error("useFeedback must be used within FeedbackProvider");
  return context;
}

/** Declarative bridge for query errors and existing async result state. */
export function FeedbackNotice({ children, kind = "error" }: { children: ReactNode; kind?: Kind }) {
  const id = useId();
  const { publish, remove } = useFeedback();
  const signature = contentText(children).trim();
  const latest = useRef(children);
  useEffect(() => { latest.current = children; });
  useEffect(() => {
    if (!signature) return;
    publish({ id, kind, content: latest.current, signature });
    // Success notifications survive navigation; errors expire with their source.
    return () => { if (kind !== "success") remove(id); };
  }, [id, kind, signature, publish, remove]);
  return null;
}

export function FeedbackDialog({ children, title, onClose, kind = "warning" }: { children: ReactNode; title: string; onClose: () => void; kind?: "warning" | "error" }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId(), descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return createPortal(<dialog ref={ref} className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <button type="button" className={styles.close} onClick={onClose} aria-label="Close message"><X size={20} /></button>
    <div className={`${styles.icon} ${kind === "error" ? styles.error : styles.warning}`}>{kind === "error" ? <CircleAlert size={28} /> : <TriangleAlert size={28} />}</div>
    <h2 id={titleId}>{title}</h2><div id={descriptionId}>{children}</div><button autoFocus type="button" className={styles.dismiss} onClick={onClose}>Dismiss</button>
  </dialog>, document.body);
}
