"use client";
import { PendingContent } from "@/components/ui/Skeleton";
import { useState } from "react";
import { MapPin } from "lucide-react";
import type { UserAddress, UserProfile } from "@/lib/user-profile";
import styles from "./account.module.css";

export default function SavedAddress({ profile, save, pending }: { profile: UserProfile; save: (address: UserAddress | null) => Promise<void>; pending: boolean }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const address = profile.defaultAddress;
  const fields: { key: keyof UserAddress; label: string; autoComplete: string; required?: boolean; maxLength?: number }[] = [
    { key: "recipient", label: "Recipient name", autoComplete: "shipping name", required: true },
    { key: "contact", label: "Delivery contact number", autoComplete: "shipping tel", required: true, maxLength: 30 },
    { key: "line1", label: "Street address", autoComplete: "shipping address-line1", required: true },
    { key: "line2", label: "Apartment, suite, etc. (optional)", autoComplete: "shipping address-line2" },
    { key: "city", label: "City", autoComplete: "shipping address-level2", required: true },
    { key: "region", label: "State / Province", autoComplete: "shipping address-level1", required: true },
    { key: "postalCode", label: "Postal code (optional)", autoComplete: "shipping postal-code", maxLength: 20 },
    { key: "country", label: "Country", autoComplete: "shipping country-name", required: true },
  ];
  return <section className={styles.tabContent}>
    <div className={styles.sectionHeading}><div><h2>Saved Address</h2><p>Save your default delivery address for future purchases.</p></div></div>
    {!editing && (address ? <article className={styles.detailCard}><MapPin size={22} /><div>
      <div className={styles.cardTitle}><h3>Delivery address</h3><span className={styles.defaultBadge}>Default</span></div>
      <strong>{address.recipient}</strong><p>{address.line1}{address.line2 && <><br />{address.line2}</>}<br />{address.city}, {address.region} {address.postalCode}<br />{address.country}</p><p>{address.contact}</p>
      <div className={styles.formActions}><button type="button" className={styles.outlineButton} disabled={pending} onClick={() => { setError(""); setEditing(true); }}><PendingContent pending={pending}>Edit address</PendingContent></button><button type="button" className={styles.outlineButton} disabled={pending} onClick={async () => { setError(""); try { await save(null); } catch (error) { setError(error instanceof Error ? error.message : "Unable to remove address."); } }}><PendingContent pending={pending}>Remove</PendingContent></button></div>
    </div></article> : <div className={styles.emptyState}><MapPin size={30} /><h3>No saved address yet</h3><p>Add your delivery details once and keep them ready for checkout.</p><button type="button" className={styles.primaryButton} onClick={() => { setError(""); setEditing(true); }}>Add address</button></div>)}
    {editing && <form className={`${styles.editForm} ${styles.addressForm}`} aria-busy={pending} onSubmit={async event => {
      event.preventDefault(); if (pending) return;
      const data = new FormData(event.currentTarget);
      const next = Object.fromEntries(fields.map(field => [field.key, String(data.get(field.key) ?? "").trim()])) as UserAddress;
      setError("");
      try { await save(next); setEditing(false); } catch (error) { setError(error instanceof Error ? error.message : "Unable to save address."); }
    }}><h3>{address ? "Edit delivery address" : "Add delivery address"}</h3>
      {fields.map(field => <label key={field.key}>{field.label}{field.required ? " *" : ""}<input name={field.key} type={field.key === "contact" ? "tel" : "text"} autoComplete={field.autoComplete} required={field.required} maxLength={field.maxLength ?? 150} disabled={pending} defaultValue={address?.[field.key] ?? (field.key === "recipient" ? profile.name : field.key === "contact" ? profile.contact : "")} /></label>)}
      <div className={styles.formActions}><button type="button" className={styles.outlineButton} disabled={pending} onClick={() => { setEditing(false); setError(""); }}><PendingContent pending={pending}>Cancel</PendingContent></button><button className={styles.primaryButton} disabled={pending}><PendingContent pending={pending}>{"Save address"}</PendingContent></button></div>
    </form>}
    {error && <p className={styles.feedback} role="alert">{error}</p>}
  </section>;
}
