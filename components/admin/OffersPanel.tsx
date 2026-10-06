"use client";
import { FeedbackNotice, useFeedback } from "@/components/ui/Feedback";

import { SummarySkeleton, PendingContent } from "@/components/ui/Skeleton";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CalendarDays, CirclePercent, Pencil, Plus, Search, Tag, Trash2, Users, X } from "lucide-react";
import { useAdminMutation, useAdminQuery } from "@/lib/admin/client";
import type { AdminCoupon, AdminPromotion } from "@/lib/admin/types";
import { offerCategories, validOfferScope } from "@/lib/admin/offer-scope";
import styles from "./operations.module.css";

type Section = "coupons" | "promotions";
type Offer = AdminCoupon | AdminPromotion;
const money = (value: number) => `Rs. ${value.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
const displayDate = (value: string) => value ? new Date(value).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" }) : "No limit";
const localDate = (value: string) => { if (!value) return ""; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); };
const isoDate = (value: FormDataEntryValue | null) => value ? new Date(String(value)).toISOString() : "";
const splitList = (value: FormDataEntryValue | null) => String(value ?? "").split(/[,\n]/).map(item => item.trim()).filter(Boolean);

function couponState(coupon: AdminCoupon) {
  const now = new Date().toISOString();
  if (!coupon.active || !validOfferScope(coupon)) return "inactive";
  if (coupon.endsAt && coupon.endsAt <= now || coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return "ended";
  if (coupon.startsAt && coupon.startsAt > now) return "scheduled";
  return "active";
}

function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className={styles.dialog} aria-label={title} onCancel={onClose}><div className={styles.dialogHeader}><h3>{title}</h3><button className={styles.iconButton} type="button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div><div className={styles.dialogBody}>{children}</div></dialog>;
}

function CategoryPicker({ scope, onScopeChange, selected, onChange }: { scope: "store" | "categories"; onScopeChange: (scope: "store" | "categories") => void; selected: string[]; onChange: (selected: string[]) => void }) {
  return <div className={styles.form}>
    <label className={styles.field}>Applies to<select className={styles.select} value={scope} onChange={event => onScopeChange(event.target.value as "store" | "categories")}><option value="store">Entire store</option><option value="categories">Selected main categories</option></select></label>
    {scope === "categories" && <fieldset className={styles.categoryChoices}><legend>Main categories ({selected.length} selected)</legend>{offerCategories.map(category => <label className={styles.checkbox} key={category}><input type="checkbox" checked={selected.includes(category)} onChange={event => onChange(event.target.checked ? [...selected, category] : selected.filter(value => value !== category))} />{category}</label>)}</fieldset>}
    <p className={styles.muted}>{scope === "store" ? "Applies to every product in the store, including products added later." : "Select one or more main categories. Every product within those categories is included, across all subcategories."}</p>
  </div>;
}

function OfferEditor({ section, offer, onClose }: { section: Section; offer?: Offer; onClose: () => void }) {
  const mutation = useAdminMutation(section, "api");
  const feedback = useFeedback();
  const coupon = section === "coupons" ? offer as AdminCoupon | undefined : undefined;
  const promotion = section === "promotions" ? offer as AdminPromotion | undefined : undefined;
  const [type, setType] = useState<AdminCoupon["type"]>(coupon?.type ?? "percentage");
  const [kind, setKind] = useState<AdminCoupon["kind"]>(coupon?.kind ?? "coupon");
  const [categories, setCategories] = useState<string[]>(offer?.categories?.filter(category => offerCategories.includes(category)) ?? []);
  const [scope, setScope] = useState<"store" | "categories">(offer && (!validOfferScope(offer) || offer.categories?.length) ? "categories" : "store");
  const warn = useFeedback().warning;
  const [initialStart] = useState(() => localDate(offer?.startsAt ?? new Date().toISOString()));
  const [initialEnd] = useState(() => localDate(offer?.endsAt ?? new Date(Date.now() + 30 * 86_400_000).toISOString()));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const startsAt = isoDate(form.get("startsAt"));
    const endsAt = isoDate(form.get("endsAt"));
    if (startsAt && endsAt && endsAt <= startsAt) { warn("The end date must be after the start date."); return; }
    if (scope === "categories" && categories.length === 0) { warn("Select at least one main category or choose the entire store."); return; }
    const common = { startsAt, endsAt, active: form.get("active") === "on", productIds: [], categories: scope === "store" ? [] : categories };
    const body = section === "coupons" ? {
      ...common, kind, code: String(form.get("code")).trim().toUpperCase(), type, value: type === "free_shipping" ? 0 : Number(form.get("value")),
      minimumPurchase: Number(form.get("minimumPurchase") || 0), maximumDiscount: form.get("maximumDiscount") ? Number(form.get("maximumDiscount")) : null,
      usageLimit: Number(form.get("usageLimit") || 0), customerEmails: splitList(form.get("customerEmails")).map(email => email.toLowerCase()), firstOrderOnly: form.get("firstOrderOnly") === "on",
    } : { ...common, name: String(form.get("name")).trim(), banner: String(form.get("banner") ?? "").trim(), discountPercent: Number(form.get("discountPercent")) };
    try { await mutation.mutateAsync({ path: offer ? `${section}/${offer.id}` : section, method: offer ? "PATCH" : "POST", body }); feedback.success(`${section === "coupons" ? "Discount code" : "Sale"} ${offer ? "saved" : "created"}.`); onClose(); } catch { /* Server errors shown below. */ }
  }

  return <Dialog title={`${offer ? "Edit" : "Create"} ${section === "coupons" ? "discount code" : "sale"}`} onClose={onClose}>
    <form className={styles.form} onSubmit={submit}>
      {section === "coupons" ? <><div className={styles.grid}>
        <label className={styles.field}>Code kind<select className={styles.select} value={kind} onChange={event => setKind(event.target.value as AdminCoupon["kind"])}><option value="coupon">Coupon</option><option value="promo">Promo code</option></select></label>
        <label className={styles.field}>{kind === "promo" ? "Promo code" : "Coupon code"}<input name="code" className={styles.input} required maxLength={50} defaultValue={coupon?.code} placeholder="e.g. SUMMER25" pattern="[A-Za-z0-9_-]+" title="Use letters, numbers, hyphens, and underscores" style={{ textTransform: "uppercase" }} /></label>
        <label className={styles.field}>Discount type<select name="type" className={styles.select} value={type} onChange={event => setType(event.target.value as AdminCoupon["type"])}><option value="percentage">Percentage discount</option><option value="fixed">Fixed discount</option><option value="free_shipping">Free shipping</option></select></label>
        {type !== "free_shipping" && <label className={styles.field}>{type === "percentage" ? "Discount (%)" : "Discount amount (Rs.)"}<input key={type} name="value" className={styles.input} type="number" required min={0.01} max={type === "percentage" ? 100 : undefined} step="0.01" defaultValue={coupon?.value || 10} /></label>}
        <label className={styles.field}>Minimum purchase (Rs.)<input name="minimumPurchase" className={styles.input} type="number" min={0} step="0.01" defaultValue={coupon?.minimumPurchase ?? 0} /></label>
        <label className={styles.field}>Maximum discount (Rs.)<input name="maximumDiscount" className={styles.input} type="number" min={0} step="0.01" defaultValue={coupon?.maximumDiscount ?? ""} placeholder="No maximum" /><small>Leave blank for an uncapped discount.</small></label>
        <label className={styles.field}>Total usage limit<input name="usageLimit" className={styles.input} type="number" min={0} step={1} defaultValue={coupon?.usageLimit ?? 0} /><small>0 means unlimited uses.</small></label>
      </div></> : <div className={styles.grid}>
        <label className={`${styles.field} ${styles.full}`}>Sale name<input name="name" className={styles.input} required maxLength={150} defaultValue={promotion?.name} placeholder="e.g. Eid Collection Sale" /></label>
        <label className={styles.field}>Discount (%)<input name="discountPercent" className={styles.input} type="number" min={0.01} max={100} step="0.01" required defaultValue={promotion?.discountPercent ?? 20} /></label>
        <label className={styles.field}>Banner image URL or path<input name="banner" className={styles.input} type="text" defaultValue={promotion?.banner} placeholder="/sales.png or https://…" /><small>Optional promotional artwork.</small></label>
      </div>}
      <div className={styles.grid}><label className={styles.field}>Starts at<input name="startsAt" type="datetime-local" className={styles.input} required={section === "promotions"} defaultValue={initialStart} /></label><label className={styles.field}>Ends at<input name="endsAt" type="datetime-local" className={styles.input} required={section === "promotions"} defaultValue={initialEnd} /></label></div>
      <p className={styles.muted}>Dates use your local time. Enabled offers become active at the start time and end automatically.</p>
      {offer && !validOfferScope(offer) && <FeedbackNotice kind="warning">This older offer needs a new scope before it can apply. Select main categories or the entire store and save.</FeedbackNotice>}
      <CategoryPicker scope={scope} onScopeChange={setScope} selected={categories} onChange={setCategories} />
      {section === "coupons" ? <><div className={styles.grid}>
        <label className={styles.field}>Eligible customer emails<textarea name="customerEmails" className={styles.textarea} defaultValue={coupon?.customerEmails.join(", ")} placeholder="customer@urbanforge.example" /><small>Separate emails with commas; leave empty for all customers.</small></label>
      </div><label className={styles.checkbox}><input type="checkbox" name="firstOrderOnly" defaultChecked={coupon?.firstOrderOnly ?? false} />First-order customers only</label></> : <p className={styles.muted}>Sale prices apply automatically during the active period. If sales overlap, the lowest available price applies. Customers can also apply an eligible discount code at checkout.</p>}
      <label className={styles.checkbox}><input type="checkbox" name="active" defaultChecked={offer?.active ?? true} />Enable {section === "coupons" ? "discount code" : "sale"}</label>
      <FeedbackNotice>{mutation.error?.message}</FeedbackNotice>
      <div className={styles.dialogFooter}><button type="button" className={styles.secondary} onClick={onClose}>Cancel</button><button className={styles.button} disabled={mutation.isPending}><PendingContent pending={mutation.isPending}>{`${offer ? "Save" : "Create"} ${section === "coupons" ? "discount code" : "sale"}`}</PendingContent></button></div>
    </form>
  </Dialog>;
}

function OffersView({ section, search }: { section: Section; search: string }) {
  const query = useAdminQuery<{ coupons?: AdminCoupon[]; promotions?: AdminPromotion[] }>(section, "api", { refetchInterval: 30_000 });
  const mutation = useAdminMutation(section, "api");
  const feedback = useFeedback();
  const [localSearch, setLocalSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editor, setEditor] = useState<Offer | "new" | null>(null);
  const [deleting, setDeleting] = useState<Offer | null>(null);
  const terms = `${search} ${localSearch}`.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const offers: Offer[] = section === "coupons" ? query.data?.coupons ?? [] : query.data?.promotions ?? [];
  const filtered = offers.filter(offer => terms.every(term => ("code" in offer ? offer.code : offer.name).toLowerCase().includes(term)) && (filter === "all" || ("code" in offer ? couponState(offer) : offer.state) === filter));

  async function remove() {
    if (!deleting) return;
    try { await mutation.mutateAsync({ path: `${section}/${deleting.id}`, method: "DELETE" }); feedback.success("Offer deleted."); setDeleting(null); } catch { /* Shown in the dialog. */ }
  }

  async function toggle(offer: Offer) {
    try { await mutation.mutateAsync({ path: `${section}/${offer.id}`, method: "PATCH", body: { active: !offer.active } }); feedback.success(offer.active ? "Offer disabled." : "Offer enabled."); } catch { /* Shown above the list. */ }
  }

  return <section className={styles.panel}>
    <div className={styles.heading}><div><h2>{section === "coupons" ? "Discounts & coupons" : "Sales & promotions"}</h2><p>{section === "coupons" ? "Create coupons and promo codes for the entire store or selected main categories." : "Schedule automatic sales for the entire store or selected main categories."}</p></div><button className={styles.button} onClick={() => setEditor("new")}><Plus size={15} />{section === "coupons" ? "Create discount code" : "Create sale"}</button></div>
    {mutation.error && !deleting && <FeedbackNotice>{mutation.error.message}</FeedbackNotice>}
    <div className={styles.card}><div className={styles.toolbar} style={{ borderBottom: 0 }}><label className={styles.search}><Search size={15} /><input aria-label={`Search ${section}`} value={localSearch} onChange={event => setLocalSearch(event.target.value)} placeholder={section === "coupons" ? "Search coupons or promo codes…" : "Search sales…"} /></label><select className={styles.select} aria-label="Filter offer status" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="scheduled">Scheduled</option><option value="ended">Ended</option><option value="inactive">Inactive</option></select><span className={styles.muted}>{filtered.length} {section}</span></div></div>
    {query.isPending ? <div className={styles.offerGrid}>{[0, 1, 2].map(index => <SummarySkeleton key={index} />)}</div> : query.error ? <div className={`${styles.card} ${styles.empty}`}><FeedbackNotice>{query.error.message}</FeedbackNotice><button className={styles.secondary} onClick={() => void query.refetch()}>Try again</button></div> : filtered.length ? <div className={styles.offerGrid}>{filtered.map(offer => {
      const isCoupon = "code" in offer;
      const state = isCoupon ? couponState(offer) : offer.state;
      return <article className={styles.offerCard} key={offer.id}>
        {!isCoupon && offer.banner && <Image src={offer.banner} alt={`${offer.name} banner`} width={500} height={220} className={styles.banner} unoptimized />}
        <div className={styles.offerBody}><div className={styles.offerTop}><span className={styles.offerIcon}>{isCoupon ? <Tag size={20} /> : <CirclePercent size={20} />}</span><span className={styles.badge} data-status={state}>{state}</span></div><h3>{isCoupon ? offer.code : offer.name}</h3>{isCoupon && <span className={styles.muted}>{offer.kind === "promo" ? "Promo code" : "Coupon"}</span>}
          <div className={styles.offerValue}>{isCoupon ? offer.type === "free_shipping" ? "Free shipping" : offer.type === "fixed" ? `${money(offer.value)} off` : `${offer.value}% off` : `${offer.discountPercent}% off`}</div>
          <div className={styles.offerFacts}><span><CalendarDays size={13} />{offer.startsAt ? displayDate(offer.startsAt) : "Any time"} – {offer.endsAt ? displayDate(offer.endsAt) : "No expiry"}</span><span><Tag size={13} />{!validOfferScope(offer) ? "Scope update required" : offer.categories.length ? offer.categories.join(", ") : "Entire store"}</span>
            {isCoupon && <><span>Minimum purchase: {money(offer.minimumPurchase)}</span>{offer.maximumDiscount !== null && <span>Maximum discount: {money(offer.maximumDiscount)}</span>}<span><Users size={13} />{offer.customerEmails.length ? `${offer.customerEmails.length} selected customers` : offer.firstOrderOnly ? "First-order customers" : "All customers"}</span><span>{offer.usedCount} uses{offer.usageLimit ? ` of ${offer.usageLimit}` : " · unlimited"}</span>{offer.usageLimit > 0 && <div className={styles.progress} aria-label={`${offer.usedCount} of ${offer.usageLimit} uses`}><span style={{ width: `${Math.min(100, offer.usedCount / offer.usageLimit * 100)}%` }} /></div>}</>}</div>
        </div><div className={styles.offerFooter}><button className={styles.secondary} onClick={() => setEditor(offer)} aria-label={`Edit ${isCoupon ? offer.code : offer.name}`}><Pencil size={13} />Edit</button><button className={styles.secondary} onClick={() => void toggle(offer)} disabled={mutation.isPending || (!offer.active && !validOfferScope(offer))}><PendingContent pending={mutation.isPending}>{offer.active ? "Disable" : "Enable"}</PendingContent></button><button className={styles.iconButton} aria-label={`Delete ${isCoupon ? offer.code : offer.name}`} onClick={() => { mutation.reset(); setDeleting(offer); }}><Trash2 size={14} /></button></div>
      </article>;
    })}</div> : <div className={`${styles.card} ${styles.empty}`}><Tag size={34} strokeWidth={1.3} /><h3>{terms.length || filter !== "all" ? `No matching ${section}` : section === "coupons" ? "Your next offer starts here" : "Make room for your next big sale"}</h3><p>{terms.length || filter !== "all" ? "Try another search or status filter." : section === "coupons" ? "Create a discount code, set your limits, and choose who can use it." : "Choose main categories or the entire store, then schedule your sale."}</p></div>}
    {editor && <OfferEditor section={section} offer={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} />}
    {deleting && <Dialog title={`Delete ${section === "coupons" ? "discount code" : "sale"}`} onClose={() => setDeleting(null)}><div className={styles.confirm}><p>Delete <strong>{"code" in deleting ? deleting.code : deleting.name}</strong>? This offer will be removed from your store. You can disable it instead if you want to keep its settings.</p>{mutation.error && <FeedbackNotice>{mutation.error.message}</FeedbackNotice>}<div className={styles.dialogFooter}><button className={styles.secondary} onClick={() => setDeleting(null)}>Keep offer</button><button className={styles.danger} disabled={mutation.isPending} onClick={() => void remove()}><PendingContent pending={mutation.isPending}>{"Delete offer"}</PendingContent></button></div></div></Dialog>}
  </section>;
}

export default function OffersPanel({ section, search = "" }: { section: Section; search?: string }) {
  return <OffersView key={section} section={section} search={search} />;
}
