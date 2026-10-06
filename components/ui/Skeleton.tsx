import type { CSSProperties, ReactNode } from "react";
import styles from "./skeleton.module.css";

export function Skeleton({ width = "100%", height = 14, circle = false, className = "", style }: { width?: CSSProperties["width"]; height?: CSSProperties["height"]; circle?: boolean; className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" data-skeleton="" className={`${styles.bone} ${circle ? styles.circle : ""} ${className}`} style={{ width, height, ...style }} />;
}

/** Keep the action's accessible name and dimensions while showing a spinner. */
export function PendingContent({ pending, children }: { pending: boolean; children: ReactNode }) {
  return <span className={styles.action} aria-busy={pending || undefined}><span className={`${styles.actionLabel} ${pending ? styles.concealed : ""}`}>{children}</span>{pending && <span data-spinner="" aria-hidden="true" className={styles.spinner} />}</span>;
}

function Frame({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  return <div role="status" aria-label={label} aria-busy="true" className={`${styles.frame} ${className}`}>{children}</div>;
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return <Frame label="Content pending" className={styles.lines}>{Array.from({ length: lines }, (_, index) => <Skeleton key={index} width={index === lines - 1 ? "65%" : "100%"} />)}</Frame>;
}

export function ProductGridSkeleton({ count = 8, className = "" }: { count?: number; className?: string }) {
  return <Frame label="Products pending" className={className || styles.productGrid}>{Array.from({ length: count }, (_, index) => <div key={index} className={styles.productCard}><Skeleton height="auto" style={{ aspectRatio: "4 / 5" }} /><Skeleton width="75%" height={17} /><Skeleton width="45%" /><Skeleton width="32%" height={18} /></div>)}</Frame>;
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return <Frame label="Items pending" className={styles.list}>{Array.from({ length: rows }, (_, index) => <div className={styles.listRow} key={index}><Skeleton width={76} height={88} /><div className={styles.lines}><Skeleton width="75%" height={18} /><Skeleton width="55%" /><Skeleton width="35%" /></div><Skeleton width={65} height={20} /></div>)}</Frame>;
}

export function ReviewsSkeleton() {
  return <Frame label="Reviews pending" className={styles.list}>{[0, 1, 2].map(index => <div key={index} className={styles.review}><div className={styles.row}><Skeleton width={38} height={38} circle /><div className={styles.lines}><Skeleton width={110} /><Skeleton width={85} height={12} /></div><Skeleton width={70} height={12} /></div><Skeleton width="90%" /><Skeleton width="65%" /></div>)}</Frame>;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return <Frame label="Records pending" className={styles.table}><div className={styles.tableRow}>{[0, 1, 2, 3].map(index => <Skeleton key={index} width="70%" height={12} />)}</div>{Array.from({ length: rows }, (_, index) => <div className={styles.tableRow} key={index}><div className={styles.lines}><Skeleton width="80%" /><Skeleton width="55%" height={10} /></div><Skeleton width="70%" /><Skeleton width="50%" /><Skeleton width="70%" height={25} /></div>)}</Frame>;
}

export function SummarySkeleton() {
  return <Frame label="Summary pending" className={styles.panel}><Skeleton width="55%" height={22} />{[0, 1, 2].map(index => <div className={styles.row} key={index}><Skeleton width="42%" /><Skeleton width="23%" /></div>)}<Skeleton height={1} /><div className={styles.row}><Skeleton width="35%" height={24} /><Skeleton width="32%" height={24} /></div><Skeleton height={44} /></Frame>;
}

export function ProductDetailsSkeleton() {
  return <Frame label="Product details pending" className={styles.panel}><Skeleton width="40%" height={12} /><Skeleton width="85%" height={28} /><Skeleton width="35%" height={24} /><TextSkeleton /><Skeleton width="25%" /><div className={styles.row}>{[0, 1, 2, 3].map(index => <Skeleton key={index} width={46} height={38} />)}</div><Skeleton height={46} /></Frame>;
}

export function ProductPageSkeleton() {
  return <Frame label="Product pending" className={styles.content}><Skeleton width="35%" /><div className={styles.twoColumns}><Skeleton height="auto" style={{ aspectRatio: "1 / 1" }} /><ProductDetailsSkeleton /></div><Skeleton width="60%" height={36} /><TextSkeleton lines={4} /></Frame>;
}

export function CheckoutSkeleton() {
  return <Frame label="Checkout pending" className={styles.content}><Skeleton width="32%" height={36} /><div className={styles.checkout}><div className={styles.panel}>{[0, 1, 2].map(index => <div key={index} className={styles.panel}><Skeleton width="40%" height={23} /><div className={styles.twoColumns}>{[0, 1, 2, 3].map(field => <div key={field} className={styles.lines}><Skeleton width="40%" height={12} /><Skeleton height={42} /></div>)}</div></div>)}</div><SummarySkeleton /></div></Frame>;
}

export function AccountSkeleton() {
  return <Frame label="Account pending" className={styles.content}><Skeleton height={200} /><div className={styles.row}><Skeleton width={88} height={88} circle /><div className={styles.lines}><Skeleton width="50%" height={28} /><Skeleton width="35%" /></div></div><Skeleton height={48} /><ListSkeleton /></Frame>;
}

export function DashboardSkeleton() {
  return <Frame label="Store overview pending" className={styles.content}><Skeleton width="45%" height={32} /><Skeleton width="65%" /><div className={styles.metrics}>{[0, 1, 2, 3].map(index => <div key={index} className={styles.panel}><Skeleton width="75%" /><Skeleton width="55%" height={30} /><Skeleton width="90%" height={10} /></div>)}</div><div className={styles.twoColumns}><Skeleton height={260} /><Skeleton height={260} /></div><TableSkeleton /></Frame>;
}

export function AuthSkeleton() {
  return <Frame label="Account form pending" className={styles.twoColumns}><Skeleton height={480} /><div className={styles.panel}><Skeleton width="70%" height={36} /><TextSkeleton lines={2} />{[0, 1, 2].map(index => <Skeleton height={48} key={index} />)}<Skeleton height={46} /></div></Frame>;
}

export function PageSkeleton({ variant = "store" }: { variant?: "store" | "product" | "checkout" | "account" | "cart" | "auth" | "admin" | "catalog" }) {
  return <main className={styles.page} data-page-skeleton={variant}><div className={styles.pageInner}>
    {variant === "product" ? <ProductPageSkeleton /> : variant === "checkout" ? <CheckoutSkeleton /> : variant === "account" ? <AccountSkeleton /> : variant === "auth" ? <AuthSkeleton /> : variant === "admin" ? <DashboardSkeleton /> : variant === "cart" ? <Frame label="Cart pending" className={styles.content}><Skeleton width="30%" height={36} /><div className={styles.checkout}><ListSkeleton /><SummarySkeleton /></div></Frame> : variant === "catalog" ? <Frame label="Catalog pending" className={styles.content}><Skeleton height={150} /><ProductGridSkeleton /></Frame> : <Frame label="Page pending" className={styles.content}><Skeleton height="clamp(250px, 38vw, 500px)" /><Skeleton width="40%" height={32} /><ProductGridSkeleton count={4} /></Frame>}
  </div></main>;
}
