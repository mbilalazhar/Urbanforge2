"use client";
import { FeedbackNotice, useFeedback } from "@/components/ui/Feedback";

import { Skeleton, TableSkeleton, PendingContent } from "@/components/ui/Skeleton";
import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, ArrowDownUp, ClipboardList, History, Layers3, Package, PackageX, RefreshCw, Search } from "lucide-react";
import { useAdminMutation, useAdminQuery } from "@/lib/admin/client";
import type { AdminProduct, StockMovement, InventoryData, InventoryHistory } from "@/lib/admin/types";
import styles from "./catalog.module.css";

type InventoryRow = { product: AdminProduct; variantId: string; sku: string; detail: string; stock: number };
const movementLabels: Record<StockMovement["type"], string> = { added: "Stock added", sold: "Stock sold", returned: "Stock returned", adjustment: "Adjustment" };
const PER_PAGE = 15;

export default function InventoryPanel({ search = "" }: { search?: string }) {
  const query = useAdminQuery<InventoryData>("inventory?includeHistory=false", "api", { refetchInterval: 30_000 });
  const adjust = useAdminMutation("inventory", "api");
  const [localSearch, setLocalSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [type, setType] = useState<StockMovement["type"]>("added");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [movementFilter, setMovementFilter] = useState("");
  const [historyProduct, setHistoryProduct] = useState("");
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const notifySuccess = useFeedback().success;
  const warn = useFeedback().warning;
  const formRef = useRef<HTMLFormElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const historyParams = new URLSearchParams({ page: String(historyPage), limit: String(PER_PAGE) });
  if (movementFilter) historyParams.set("type", movementFilter);
  if (historyProduct) historyParams.set("productId", historyProduct);
  if (search.trim()) historyParams.set("search", search.trim());
  const history = useAdminQuery<InventoryHistory>(`inventory/movements?${historyParams}`, "api", { refetchInterval: 30_000 });
  const products = query.data?.products ?? [];
  const movements = history.data?.movements ?? [];
  const historyProducts = [...new Map([...(history.data?.products ?? []), ...products].map(product => [product.id, { id: product.id, name: product.name }])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const unavailable = query.isPending || query.isError;
  async function refresh(notify = false) { const results = await Promise.all([query.refetch(), history.refetch()]); if (notify && results.every(result => result.isSuccess)) notifySuccess("Inventory refreshed."); }
  const rows: InventoryRow[] = products.flatMap(product => product.variants.length
    ? product.variants.map(variant => ({ product, variantId: variant.id, sku: variant.sku, detail: [variant.color, variant.size].filter(Boolean).join(" / ") || "Variant", stock: variant.stock }))
    : [{ product, variantId: "", sku: product.sku, detail: product.category, stock: product.stock }]);
  const filteredRows = rows.filter(row => [search, localSearch].every(term => `${row.product.name} ${row.sku} ${row.detail}`.toLowerCase().includes(term.toLowerCase().trim()))
    && (!stockFilter || (stockFilter === "low" ? row.stock > 0 && row.stock <= 5 : stockFilter === "out" ? row.stock === 0 : row.stock > 5)));
  const filteredMovements = movements;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PER_PAGE));
  const activePage = Math.min(page, pageCount);
  const historyPageCount = history.data?.pages ?? 1;
  const activeHistoryPage = history.data?.page ?? 1;
  const selectedProduct = products.find(product => product.id === productId);
  const selectedVariant = selectedProduct?.variants.find(variant => variant.id === variantId);
  const currentStock = selectedProduct?.variants.length ? selectedVariant?.stock : selectedProduct?.stock;
  const signedQuantity = type === "sold" ? -Math.abs(Number(quantity)) : Number(quantity);
  const nextStock = currentStock === undefined ? undefined : currentStock + signedQuantity;

  function selectAdjustment(row: InventoryRow) {
    setProductId(row.product.id);
    setVariantId(row.variantId);

    adjust.reset();
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    quantityRef.current?.focus({ preventScroll: true });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adjust.isPending || unavailable) return;

    if (!Number.isInteger(signedQuantity) || signedQuantity === 0) {
      warn("Enter a non-zero whole number of units.");
      return;
    }
    if (!reason.trim()) { warn("Enter a reason for this adjustment."); return; }
    if (Math.abs(signedQuantity) > 1_000_000 || (nextStock !== undefined && nextStock > 1_000_000)) { warn("Stock and quantity changes cannot exceed 1,000,000 units."); return; }
    if (nextStock === undefined || nextStock < 0) {
      warn("This adjustment would make stock negative. Check the selected product and quantity.");
      return;
    }
    adjust.mutate({ path: "inventory", method: "POST", body: { productId, ...(variantId ? { variantId } : {}), quantity: signedQuantity, type, reason: reason.trim(), expectedStock: currentStock } }, {
      onError: () => refresh(),
      onSuccess: () => { setQuantity(""); setReason(""); setHistoryPage(1); notifySuccess("Stock updated. Your adjustment has been recorded in the stock history."); },
    });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.heading}><div><h1>Inventory</h1><p>Keep every size, color, and stock movement accounted for.</p></div><div className={styles.footerActions}><button type="button" className={styles.secondary} disabled={query.isFetching || history.isFetching} onClick={() => void refresh(true)}><PendingContent pending={query.isFetching || history.isFetching}><RefreshCw size={15} /> Refresh</PendingContent></button><button className={styles.secondary} disabled={unavailable || !products.length} onClick={() => { formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); quantityRef.current?.focus({ preventScroll: true }); }}><ArrowDownUp size={15} /> Adjust stock</button></div></div>
      <div className={styles.stats}>
        <div className={styles.stat}><div className={styles.statIcon}><Package size={20} /></div><div><span>Units in stock</span><strong>{query.isPending ? <Skeleton width={56} height={25} /> : unavailable ? "—" : query.data?.summary.units.toLocaleString()}</strong></div></div>
        <div className={styles.stat}><div className={styles.statIcon}><ClipboardList size={20} /></div><div><span>Tracked SKUs</span><strong>{query.isPending ? <Skeleton width={56} height={25} /> : unavailable ? "—" : query.data?.summary.trackedSkus.toLocaleString()}</strong></div></div>
        <div className={styles.stat}><div className={styles.statIcon}><Layers3 size={20} /></div><div><span>Low-stock SKUs</span><strong>{query.isPending ? <Skeleton width={56} height={25} /> : unavailable ? "—" : query.data?.summary.lowStockSkus.toLocaleString()}</strong></div></div>
        <div className={styles.stat}><div className={styles.statIcon}><PackageX size={20} /></div><div><span>Out-of-stock SKUs</span><strong>{query.isPending ? <Skeleton width={56} height={25} /> : unavailable ? "—" : query.data?.summary.outOfStockSkus.toLocaleString()}</strong></div></div>
      </div>

      {query.error && <FeedbackNotice><AlertCircle size={16} />{query.error.message}<button onClick={() => query.refetch()}>Try again</button></FeedbackNotice>}
      <div className={styles.inventoryGrid}>
        <section className={styles.card}>
          <div className={styles.toolbar}><h2>Current inventory <span className={styles.toolbarCount}>{filteredRows.length} SKUs</span></h2><label className={styles.search}><Search size={15} /><input aria-label="Search inventory" placeholder="Search product, SKU, size, or color…" value={localSearch} onChange={event => { setLocalSearch(event.target.value); setPage(1); }} /></label></div>
          <div className={styles.filters}>
            <select aria-label="Inventory stock filter" value={stockFilter} onChange={event => { setStockFilter(event.target.value); setPage(1); }}><option value="">All stock levels</option><option value="in">In stock (over 5)</option><option value="low">Low stock (1–5)</option><option value="out">Out of stock</option></select>
            {(localSearch || stockFilter) && <button className={styles.reset} onClick={() => { setLocalSearch(""); setStockFilter(""); setPage(1); }}>Clear filters</button>}
          </div>
          {query.isPending ? <TableSkeleton /> : query.error ? <div className={styles.empty}><AlertCircle size={30} /><h3>Inventory is unavailable</h3><p>Try loading your inventory again.</p></div> : !filteredRows.length ? <div className={styles.empty}><Package size={32} /><h3>{products.length ? "No matching stock" : "Your inventory starts here"}</h3><p>{products.length ? "Change your search or stock filter to see more products." : "Add a product in Products to start tracking inventory and variant stock."}</p></div> : <>
            <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Product / variant</th><th>SKU</th><th>Available</th><th>Stock status</th><th>Action</th></tr></thead><tbody>{filteredRows.slice((activePage - 1) * PER_PAGE, activePage * PER_PAGE).map(row => <tr key={`${row.product.id}-${row.variantId}`}>
              <td><strong>{row.product.name}</strong><span className={styles.subtle}>{row.detail}</span></td><td>{row.sku}</td><td><strong>{row.stock.toLocaleString()}</strong></td><td><span className={`${styles.badge} ${row.stock === 0 ? styles.red : row.stock <= 5 ? styles.amber : styles.green}`}>{row.stock === 0 ? "Out of stock" : row.stock <= 5 ? "Low stock" : "In stock"}</span></td><td><button className={styles.secondary} onClick={() => selectAdjustment(row)} aria-label={`Adjust stock for ${row.product.name} ${row.detail}`}><ArrowDownUp size={12} /> Adjust</button></td>
            </tr>)}</tbody></table></div>
            <div className={styles.pagination}><span>{filteredRows.length} SKUs</span><div className={styles.paginationActions}><button className={styles.secondary} disabled={activePage === 1} onClick={() => setPage(activePage - 1)}>Previous</button><span>{activePage} / {pageCount}</span><button className={styles.secondary} disabled={activePage === pageCount} onClick={() => setPage(activePage + 1)}>Next</button></div></div>
          </>}
        </section>
        <section className={styles.card}>
          <div className={styles.sectionHeading}><h2>Stock adjustment</h2><p>Add, remove, or return units to inventory.</p></div>
          <form ref={formRef} className={styles.adjustmentForm} onSubmit={submit} aria-busy={adjust.isPending}>
            <label className={styles.field}>Product *<select required value={productId} disabled={adjust.isPending || unavailable || !products.length} onChange={event => { setProductId(event.target.value); setVariantId("");  }}><option value="">Select a product</option>{products.map(product => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label>
            {!!selectedProduct?.variants.length && <label className={styles.field}>Variant *<select required value={variantId} disabled={adjust.isPending} onChange={event => { setVariantId(event.target.value);  }}><option value="">Select a variant</option>{selectedProduct.variants.map(variant => <option key={variant.id} value={variant.id}>{[variant.color, variant.size].filter(Boolean).join(" / ")} · {variant.sku}</option>)}</select></label>}
            <label className={styles.field}>Movement type *<select value={type} disabled={adjust.isPending} onChange={event => { setType(event.target.value as StockMovement["type"]); setQuantity("");  }}>{Object.entries(movementLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className={styles.field}>{type === "adjustment" ? "Quantity change *" : "Quantity *"}<input ref={quantityRef} required type="number" step="1" min={type === "adjustment" ? "-1000000" : "1"} max="1000000" value={quantity} disabled={adjust.isPending} placeholder={type === "adjustment" ? "e.g. 10 or -5" : "e.g. 10"} onChange={event => { setQuantity(event.target.value);  }} /><span className={styles.hint}>{type === "adjustment" ? "Enter a positive number to add, or a negative number to remove." : type === "sold" ? "These units will be removed from stock." : "These units will be added to stock."}</span></label>
            <label className={`${styles.field} ${styles.wide}`}>Reason *<textarea required maxLength={500} rows={2} value={reason} disabled={adjust.isPending} onChange={event => setReason(event.target.value)} placeholder="e.g. New delivery received, supplier restock, or stock count correction" /></label>
            <div className={styles.preview}><span>Current: <strong>{currentStock ?? "—"}</strong></span><span>After adjustment: <strong>{nextStock ?? "—"}</strong></span></div>
            <FeedbackNotice>{adjust.error?.message}</FeedbackNotice>
            <button className={styles.primary} disabled={adjust.isPending || unavailable || !selectedProduct || (!!selectedProduct.variants.length && !selectedVariant)}><PendingContent pending={adjust.isPending}><ArrowDownUp size={14} />{"Update stock"}</PendingContent></button>
          </form>
        </section>
      </div>
      <section className={styles.card}>
        <div className={styles.toolbar}><h2>Stock history <span className={styles.toolbarCount}>{history.data?.total ?? "—"} movements</span></h2><span className={styles.hint}>Every adjustment, recorded. Refreshes every 30 seconds.</span></div>
        <div className={styles.filters}><select aria-label="Filter stock history by movement" value={movementFilter} onChange={event => { setMovementFilter(event.target.value); setHistoryPage(1); }}><option value="">All movements</option>{Object.entries(movementLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select aria-label="Filter stock history by product" value={historyProduct} onChange={event => { setHistoryProduct(event.target.value); setHistoryPage(1); }}><option value="">All products</option>{historyProducts.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select>{(movementFilter || historyProduct) && <button className={styles.reset} onClick={() => { setMovementFilter(""); setHistoryProduct(""); setHistoryPage(1); }}>Clear filters</button>}</div>
        {history.isPending ? <TableSkeleton /> : history.error ? <FeedbackNotice><p>{history.error.message}</p><button type="button" onClick={() => history.refetch()}>Try again</button></FeedbackNotice> : !filteredMovements.length ? <div className={styles.empty}><History size={30} /><h3>No stock movements yet</h3><p>{(movementFilter || historyProduct || search.trim()) ? "Adjust the history filters to see more movements." : "Stock added, sold, returned, and manually adjusted will appear here."}</p></div> : <>
          <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Product</th><th>Movement</th><th>Change</th><th>Before → After</th><th>Reason</th><th>Date</th></tr></thead><tbody>{filteredMovements.map(movement => {
            const product = products.find(item => item.id === movement.productId);
            const variant = product?.variants.find(item => item.id === movement.variantId);
            return <tr key={movement.id}><td><strong>{movement.productName}</strong><span className={styles.subtle}>{[movement.variantLabel || [variant?.color, variant?.size].filter(Boolean).join(" / "), movement.sku || variant?.sku || (!movement.variantId ? product?.sku : movement.variantId)].filter(Boolean).join(" · ")}</span></td><td><span className={`${styles.badge} ${movement.type === "sold" ? styles.red : movement.type === "adjustment" ? styles.blue : styles.green}`}>{movementLabels[movement.type]}</span></td><td><span className={movement.quantity > 0 ? styles.movementPositive : styles.movementNegative}>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</span></td><td>{movement.before} → <strong>{movement.after}</strong></td><td className={styles.historyReason}>{movement.reason || "—"}</td><td>{new Date(movement.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" })}<span className={styles.subtle}>{new Date(movement.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" })}</span></td></tr>;
          })}</tbody></table></div>
          <div className={styles.pagination}><span>{history.data?.total ?? 0} recorded movements</span><div className={styles.paginationActions}><button className={styles.secondary} disabled={activeHistoryPage === 1} onClick={() => setHistoryPage(activeHistoryPage - 1)}>Previous</button><span>{activeHistoryPage} / {historyPageCount}</span><button className={styles.secondary} disabled={activeHistoryPage === historyPageCount} onClick={() => setHistoryPage(activeHistoryPage + 1)}>Next</button></div></div>
        </>}
      </section>
    </div>
  );
}
