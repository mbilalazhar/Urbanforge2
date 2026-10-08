"use client";
import { FeedbackDialog, FeedbackNotice, useFeedback } from "@/components/ui/Feedback";

import { Skeleton, TableSkeleton, PendingContent } from "@/components/ui/Skeleton";
import { useState, type FormEvent, type ReactNode } from "react";
import Image from "@/components/product/ProductImage";
import { AlertCircle, ArrowLeft, Copy, Layers3, Package, PackageCheck, PackageX, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useAdminMutation, useAdminQuery } from "@/lib/admin/client";
import type { AdminProduct } from "@/lib/admin/types";
import { productCategories, subcategoriesFor, productTypesFor } from "@/lib/product-categories";
import { IMAGE_TYPES, VIDEO_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, MAX_MEDIA_BYTES, isProductVideoUrl, VIDEO_URL_GUIDANCE } from "@/lib/product-media";
import ProductMediaFiles, { ProductVideoUrls } from "./ProductMediaFiles";
import styles from "./catalog.module.css";

type VariantDraft = { id: string; sku: string; color: string; size: string; stock: string };
type ProductDraft = {
  name: string; description: string; shortDescription: string; category: string; subcategory: string; productType: string;
  brand: string; gender: string; price: string; salePrice: string; sku: string; images: string; videos: string;
  colors: string; sizes: string; material: string; stock: string; tags: string; status: "active" | "inactive";
  featured: boolean; newArrival: boolean; bestseller: boolean; seoTitle: string; seoDescription: string;
  variants: VariantDraft[];
};

const money = (value: number) => `Rs. ${value.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
const list = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);
const mediaList = (value: string) => value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
const PER_PAGE = 20;

function makeDraft(product?: AdminProduct): ProductDraft {
  return {
    name: product?.name ?? "", description: product?.description ?? "", shortDescription: product?.shortDescription ?? "",
    category: product?.category ?? "", subcategory: product?.subcategory ?? "", productType: product?.productType ?? "", brand: product?.brand ?? "", gender: product?.gender ?? "unisex",
    price: String(product?.price ?? ""), salePrice: product?.salePrice == null ? "" : String(product.salePrice), sku: product?.sku ?? "",
    images: product?.images.join("\n") ?? "", videos: product?.videos.join("\n") ?? "", colors: product?.colors.join(", ") ?? "",
    sizes: product?.sizes.join(", ") ?? "", material: product?.material ?? "", stock: String(product?.stock ?? 0), tags: product?.tags.join(", ") ?? "",
    status: product?.status ?? "active", featured: product?.featured ?? false, newArrival: product?.newArrival ?? false,
    bestseller: product?.bestseller ?? false, seoTitle: product?.seoTitle ?? "", seoDescription: product?.seoDescription ?? "",
    variants: product?.variants.map(variant => ({ ...variant, stock: String(variant.stock) })) ?? [],
  };
}

function Field({ label, children, wide = false, hint }: { label: string; children: ReactNode; wide?: boolean; hint?: string }) {
  return <label className={`${styles.field} ${wide ? styles.wide : ""}`}><span>{label}</span>{children}{hint && <span className={styles.hint}>{hint}</span>}</label>;
}

function ProductEditor({ product, onClose, onSaved }: { product?: AdminProduct; onClose: () => void; onSaved: (message: string) => void }) {
  const [draft, setDraft] = useState<ProductDraft>(() => makeDraft(product));
  const warn = useFeedback().warning;
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const productTypes = productTypesFor(draft.category, draft.subcategory);
  const save = useAdminMutation("products", "api");
  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft(current => ({ ...current, [key]: value }));
  const totalStock = draft.variants.length ? draft.variants.reduce((total, variant) => total + (Number(variant.stock) || 0), 0) : Number(draft.stock);
  const discount = Number(draft.price) > 0 && draft.salePrice !== "" ? Math.max(0, Number(((1 - Number(draft.salePrice) / Number(draft.price)) * 100).toFixed(2))) : "";

  function updateVariant(id: string, field: keyof VariantDraft, value: string) {
    setDraft(current => ({ ...current, variants: current.variants.map(variant => variant.id === id ? { ...variant, [field]: value } : variant) }));
  }

  function addFiles(kind: "images" | "videos", selected: FileList | null) {
    if (!selected) return;
    const added = Array.from(selected);
    const allowed = kind === "images" ? IMAGE_TYPES : VIDEO_TYPES;
    const limit = kind === "images" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (added.some(file => !allowed.includes(file.type) || !file.size || file.size > limit)) {
      warn(kind === "images" ? "Choose JPEG, PNG, WebP, or GIF images, up to 10 MB each." : "Choose MP4, WebM, or MOV videos, up to 50 MB each."); return;
    }
    if ([...imageFiles, ...videoFiles, ...added].reduce((total, file) => total + file.size, 0) > MAX_MEDIA_BYTES) {
      warn("Uploads must total no more than 100 MB."); return;
    }

    (kind === "images" ? setImageFiles : setVideoFiles)(files => [...files, ...added]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.isPending) return;

    if (draft.salePrice !== "" && Number(draft.salePrice) > Number(draft.price)) {
      warn("Sale price must be less than or equal to the regular price.");
      return;
    }
    const images = mediaList(draft.images);
    const videos = mediaList(draft.videos);
    if (!images.length && !imageFiles.length) { warn("Add at least one product image."); return; }
    if (images.length + imageFiles.length > 30 || videos.length + videoFiles.length > 10) { warn("Use at most 30 images and 10 videos."); return; }
    if (!subcategoriesFor(draft.category).includes(draft.subcategory) || (productTypes.length && !productTypes.includes(draft.productType))) { warn("Select a valid category, subcategory, and product type."); return; }
    if ([...images, ...videos].some(url => !/^https?:\/\//i.test(url) && !/^\/(?!\/)/.test(url))) {
      warn("Use an https:// URL or a local /path for every image and video.");
      return;
    }
    if (videos.some(url => !isProductVideoUrl(url))) { warn(VIDEO_URL_GUIDANCE); return; }
    const data = { ...draft, name: draft.name.trim(), sku: draft.sku.trim(), category: draft.category.trim(), brand: draft.brand.trim(),
        price: Number(draft.price), salePrice: draft.salePrice === "" ? null : Number(draft.salePrice), stock: totalStock,
        images, videos, colors: list(draft.colors), sizes: list(draft.sizes), tags: list(draft.tags),
        variants: draft.variants.map(variant => ({ ...variant, sku: variant.sku.trim(), stock: Number(variant.stock) })),
      };
    const body = new FormData();
    body.set("data", JSON.stringify(data));
    imageFiles.forEach(file => body.append("images", file));
    videoFiles.forEach(file => body.append("videos", file));
    save.mutate({ path: product ? `products/${product.id}` : "products", method: product ? "PATCH" : "POST", body },
      { onSuccess: () => onSaved(product ? "Product updated successfully." : "Product added successfully.") });
  }

  return (
    <form className={styles.editor} onSubmit={submit} aria-busy={save.isPending}>
      <button type="button" className={styles.back} onClick={onClose} disabled={save.isPending}><PendingContent pending={save.isPending}><ArrowLeft size={15} /> Back to products</PendingContent></button>
      <div className={styles.heading}><div><h1>{product ? "Edit product" : "Add a product"}</h1><p>{product ? `Update the details for ${product.name}.` : "Add something your customers will love."}</p></div><button className={styles.primary} disabled={save.isPending}><PendingContent pending={save.isPending}>{"Save product"}</PendingContent></button></div>
      <FeedbackNotice>{save.error?.message}</FeedbackNotice>
      <div className={styles.editorGrid}>
        <div className={styles.column}>
          <section className={styles.card}>
            <div className={styles.sectionHeading}><h2>Product information</h2><p>The details shoppers will see in your store.</p></div>
            <div className={styles.fields}>
              <Field label="Product name *" wide><input required maxLength={150} value={draft.name} onChange={event => set("name", event.target.value)} placeholder="e.g. Everyday oversized tee" /></Field>
              <Field label="Short description" wide><textarea rows={2} maxLength={500} value={draft.shortDescription} onChange={event => set("shortDescription", event.target.value)} placeholder="A quick introduction to your product" /></Field>
              <Field label="Description" wide><textarea rows={6} maxLength={2000} value={draft.description} onChange={event => set("description", event.target.value)} placeholder="Describe the fit, feel, features, and care instructions" /></Field>
              <Field label="Category *"><select required value={draft.category} onChange={event => setDraft(current => ({ ...current, category: event.target.value, subcategory: "", productType: "" }))}><option value="">Select category</option>{Object.keys(productCategories).map(category => <option key={category}>{category}</option>)}</select></Field>
              <Field label="Subcategory *"><select required disabled={!draft.category} value={draft.subcategory} onChange={event => setDraft(current => ({ ...current, subcategory: event.target.value, productType: "" }))}><option value="">Select subcategory</option>{subcategoriesFor(draft.category).map(category => <option key={category}>{category}</option>)}</select></Field>
              {productTypes.length > 0 && <Field label="Product type *"><select required value={draft.productType} onChange={event => set("productType", event.target.value)}><option value="">Select product type</option>{productTypes.map(type => <option key={type}>{type}</option>)}</select></Field>}
              <Field label={draft.category === "Brands" ? "Brand *" : "Brand"}><input required={draft.category === "Brands"} maxLength={100} value={draft.brand} onChange={event => set("brand", event.target.value)} placeholder="e.g. UrbanForge" /></Field>
              <Field label="Gender"><input list="product-genders" maxLength={60} value={draft.gender} onChange={event => set("gender", event.target.value)} /><datalist id="product-genders"><option value="unisex" /><option value="men" /><option value="women" /><option value="kids" /></datalist></Field>
              <Field label="Material"><input maxLength={150} value={draft.material} onChange={event => set("material", event.target.value)} placeholder="e.g. 100% organic cotton" /></Field>
              <Field label="Tags" hint="Separate tags with commas."><input value={draft.tags} onChange={event => set("tags", event.target.value)} placeholder="summer, casual, essentials" /></Field>
            </div>
          </section>
          <section className={styles.card}>
            <div className={styles.sectionHeading}><h2>Media</h2><p>At least one image is required. Videos are optional. The first image is the cover; image URLs come before uploaded files.</p></div>
            <div className={styles.fields}>
              <Field label="Upload product images *" wide hint="JPEG, PNG, WebP, GIF. Up to 10 MB each; 30 images total."><input type="file" multiple accept={IMAGE_TYPES.join(",")} disabled={save.isPending} onChange={event => { addFiles("images", event.target.files); event.target.value = ""; }} /></Field>
              <div className={styles.wide}><ProductMediaFiles files={imageFiles} disabled={save.isPending} onRemove={index => setImageFiles(files => files.filter((_, i) => i !== index))} /></div>
              <Field label="Image URLs (optional if uploading)" wide hint="One URL or existing local path per line."><textarea rows={3} value={draft.images} onChange={event => set("images", event.target.value)} placeholder="https://example.com/product-front.jpg" /></Field>
              <Field label="Upload product videos (optional)" wide hint="MP4 (H.264) is recommended for broad browser support. WebM and MOV are also accepted. Up to 50 MB each; 10 videos total. All uploads combined: 100 MB."><input type="file" multiple accept={VIDEO_TYPES.join(",")} disabled={save.isPending} onChange={event => { addFiles("videos", event.target.files); event.target.value = ""; }} /></Field>
              <div className={styles.wide}><ProductMediaFiles files={videoFiles} disabled={save.isPending} onRemove={index => setVideoFiles(files => files.filter((_, i) => i !== index))} /></div>
              <Field label="Video URLs (optional)" wide hint="One direct .mp4, .webm or .mov file URL per line. For Magnific/Freepik video pages, download the video and upload the file above."><textarea rows={2} value={draft.videos} onChange={event => set("videos", event.target.value)} placeholder="https://example.com/product-video.mp4" /></Field>
              <div className={styles.wide}><ProductVideoUrls urls={mediaList(draft.videos)} /></div>
            </div>
          </section>
          <section className={styles.card}>
            <div className={styles.sectionHeading}><h2>Variants</h2><p>Track each size and color separately. Every SKU must be unique.</p></div>
            <div className={styles.fields}>
              <Field label="Available colors" hint="Separate colors with commas."><input value={draft.colors} onChange={event => set("colors", event.target.value)} placeholder="Black, White, Sand" /></Field>
              <Field label="Available sizes" hint="Separate sizes with commas."><input value={draft.sizes} onChange={event => set("sizes", event.target.value)} placeholder="S, M, L, XL" /></Field>
            </div>
            <div className={styles.variantList}>
              {draft.variants.map((variant, index) => <div className={styles.variant} key={variant.id}>
                <Field label={`Variant ${index + 1} SKU *`}><input required maxLength={100} value={variant.sku} onChange={event => updateVariant(variant.id, "sku", event.target.value)} placeholder="UF-TEE-BLK-M" /></Field>
                <Field label="Color"><input maxLength={60} value={variant.color} onChange={event => updateVariant(variant.id, "color", event.target.value)} placeholder="Black" /></Field>
                <Field label="Size"><input maxLength={30} value={variant.size} onChange={event => updateVariant(variant.id, "size", event.target.value)} placeholder="M" /></Field>
                <Field label="Stock *"><input type="number" required min="0" step="1" value={variant.stock} onChange={event => updateVariant(variant.id, "stock", event.target.value)} /></Field>
                <button type="button" className={`${styles.iconButton} ${styles.deleteButton}`} aria-label={`Remove variant ${index + 1}`} onClick={() => set("variants", draft.variants.filter(item => item.id !== variant.id))}><Trash2 size={14} /></button>
              </div>)}
              <button type="button" className={styles.secondary} onClick={() => set("variants", [...draft.variants, { id: crypto.randomUUID(), sku: "", color: "", size: "", stock: "0" }])}><Plus size={15} /> Add variant</button>
            </div>
          </section>
        </div>
        <div className={styles.column}>
          <section className={styles.card}>
            <div className={styles.sectionHeading}><h2>Pricing & stock</h2></div>
            <div className={styles.fields}>
              <Field label="Regular price (Rs.) *" wide><input required type="number" min="0" step="0.01" value={draft.price} onChange={event => set("price", event.target.value)} placeholder="0.00" /></Field>
              <Field label="Sale price (Rs.)"><input type="number" min="0" step="0.01" max={draft.price || undefined} value={draft.salePrice} onChange={event => set("salePrice", event.target.value)} placeholder="Optional" /></Field>
              <Field label="Discount (%)"><input type="number" min="0" max="100" step="0.01" value={discount} disabled={!Number(draft.price)} onChange={event => set("salePrice", event.target.value === "" ? "" : (Number(draft.price) * (1 - Number(event.target.value) / 100)).toFixed(2))} placeholder="Optional" /></Field>
              <Field label="Product SKU *" wide><input required maxLength={100} value={draft.sku} onChange={event => set("sku", event.target.value)} placeholder="UF-TEE-001" /></Field>
              <Field label="Stock quantity *" wide hint={draft.variants.length ? "Calculated from the stock of all variants." : "Enter the available quantity for this product."}><input type="number" required min="0" step="1" disabled={draft.variants.length > 0} value={draft.variants.length ? totalStock : draft.stock} onChange={event => set("stock", event.target.value)} /></Field>
            </div>
          </section>
          <section className={styles.card}>
            <div className={styles.sectionHeading}><h2>Visibility</h2></div>
            <div className={styles.fields}><Field label="Product status" wide><select value={draft.status} onChange={event => set("status", event.target.value as ProductDraft["status"])}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field></div>
            <div className={styles.toggles}>
              <label className={styles.toggle}>Featured product<input type="checkbox" checked={draft.featured} onChange={event => set("featured", event.target.checked)} /></label>
              <label className={styles.toggle}>New arrival<input type="checkbox" checked={draft.newArrival} onChange={event => set("newArrival", event.target.checked)} /></label>
              <label className={styles.toggle}>Bestseller<input type="checkbox" checked={draft.bestseller} onChange={event => set("bestseller", event.target.checked)} /></label>
            </div>
          </section>
          <section className={styles.card}>
            <div className={styles.sectionHeading}><h2>Search engine listing</h2><p>Help customers discover this product.</p></div>
            <div className={styles.fields}>
              <Field label="SEO title" wide><input maxLength={150} value={draft.seoTitle} onChange={event => set("seoTitle", event.target.value)} placeholder={draft.name || "Page title"} /></Field>
              <Field label="SEO description" wide><textarea rows={4} maxLength={500} value={draft.seoDescription} onChange={event => set("seoDescription", event.target.value)} placeholder="A clear, concise description for search results" /></Field>
            </div>
          </section>
        </div>
      </div>
      <div className={styles.footer}><p>* Required fields. Prices are in Pakistani rupees.</p><div className={styles.footerActions}><button type="button" className={styles.secondary} onClick={onClose} disabled={save.isPending}><PendingContent pending={save.isPending}>Cancel</PendingContent></button><button className={styles.primary} disabled={save.isPending}><PendingContent pending={save.isPending}>{"Save product"}</PendingContent></button></div></div>
    </form>
  );
}

export default function ProductsPanel({ search = "" }: { search?: string }) {
  const query = useAdminQuery<{ products: AdminProduct[] }>("products", "api");
  const action = useAdminMutation("products", "api");
  const [editor, setEditor] = useState<AdminProduct | "new" | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [stock, setStock] = useState("");
  const [status, setStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const notifySuccess = useFeedback().success;
  const [page, setPage] = useState(1);
  const products = query.data?.products ?? [];
  const categories = [...new Set(products.map(product => product.category).filter(Boolean))].sort();
  const brands = [...new Set(products.map(product => product.brand).filter(Boolean))].sort();
  const filtered = products.filter(product => {
    const searchable = `${product.name} ${product.sku} ${product.category} ${product.brand} ${product.tags.join(" ")}`.toLowerCase();
    return [search, localSearch].every(term => searchable.includes(term.toLowerCase().trim()))
      && (!category || product.category === category) && (!brand || product.brand === brand) && (!status || product.status === status)
      && (!stock || (stock === "in" ? product.stock > 5 : stock === "low" ? product.stock > 0 && product.stock <= 5 : product.stock === 0));
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const activePage = Math.min(page, pageCount);
  const visible = filtered.slice((activePage - 1) * PER_PAGE, activePage * PER_PAGE);

  function perform(path: string, method: string, body: unknown, success: string) {
    action.mutate({ path, method, body }, { onSuccess: () => { notifySuccess(success); setDeleteTarget(null); } });
  }

  if (editor) return <ProductEditor product={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSaved={notice => { notifySuccess(notice); setEditor(null); }} />;

  return (
    <div className={styles.panel}>
      <div className={styles.heading}><div><h1>Products</h1><p>Your collection, beautifully organized.</p></div><button className={styles.primary} onClick={() => { action.reset(); setEditor("new"); }}><Plus size={16} /> Add product</button></div>
      <div className={styles.stats}>
        <div className={styles.stat}><div className={styles.statIcon}><Package size={20} /></div><div><span>Total products</span><strong>{query.isPending ? <Skeleton width={56} height={25} /> : products.length.toLocaleString()}</strong></div></div>
        <div className={styles.stat}><div className={styles.statIcon}><PackageCheck size={20} /></div><div><span>Active products</span><strong>{query.isPending ? <Skeleton width={56} height={25} /> : products.filter(product => product.status === "active").length.toLocaleString()}</strong></div></div>
        <div className={styles.stat}><div className={styles.statIcon}><Layers3 size={20} /></div><div><span>Low stock</span><strong>{query.isPending ? <Skeleton width={56} height={25} /> : products.filter(product => product.stock > 0 && product.stock <= 5).length.toLocaleString()}</strong></div></div>
        <div className={styles.stat}><div className={styles.statIcon}><PackageX size={20} /></div><div><span>Out of stock</span><strong>{query.isPending ? <Skeleton width={56} height={25} /> : products.filter(product => product.stock === 0).length.toLocaleString()}</strong></div></div>
      </div>

      {action.error && <FeedbackNotice><AlertCircle size={16} />{action.error.message}<button aria-label="Dismiss error" onClick={() => action.reset()}><X size={15} /></button></FeedbackNotice>}
      <section className={styles.card}>
        <div className={styles.toolbar}><h2>All products <span className={styles.toolbarCount}>{filtered.length} products</span></h2><label className={styles.search}><Search size={15} /><input aria-label="Search products" placeholder="Search by name, SKU, or brand…" value={localSearch} onChange={event => { setLocalSearch(event.target.value); setPage(1); }} /></label></div>
        <div className={styles.filters}>
          <select aria-label="Filter by category" value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}><option value="">All categories</option>{categories.map(item => <option key={item}>{item}</option>)}</select>
          <select aria-label="Filter by brand" value={brand} onChange={event => { setBrand(event.target.value); setPage(1); }}><option value="">All brands</option>{brands.map(item => <option key={item}>{item}</option>)}</select>
          <select aria-label="Filter by stock" value={stock} onChange={event => { setStock(event.target.value); setPage(1); }}><option value="">All stock levels</option><option value="in">In stock (over 5)</option><option value="low">Low stock (1–5)</option><option value="out">Out of stock</option></select>
          <select aria-label="Filter by status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
          {(category || brand || stock || status || localSearch) && <button className={styles.reset} onClick={() => { setCategory(""); setBrand(""); setStock(""); setStatus(""); setLocalSearch(""); setPage(1); }}>Clear filters</button>}
        </div>
        {deleteTarget && <FeedbackDialog title="Delete product?" onClose={() => { if (!action.isPending) setDeleteTarget(null); }}><p>Delete <strong>{deleteTarget.name}</strong> ({deleteTarget.sku})? This removes the product from your catalog.</p><button className={styles.secondary} disabled={action.isPending} onClick={() => setDeleteTarget(null)}><PendingContent pending={action.isPending}>Keep product</PendingContent></button><button className={styles.danger} disabled={action.isPending} onClick={() => perform(`products/${deleteTarget.id}`, "DELETE", undefined, "Product deleted.")}><PendingContent pending={action.isPending}>{"Delete product"}</PendingContent></button></FeedbackDialog>}
        {query.isPending ? <TableSkeleton /> : query.error ? <FeedbackNotice><AlertCircle size={28} /><h3>Products couldn’t load</h3><p>{query.error.message}</p><button className={styles.secondary} onClick={() => query.refetch()}>Try again</button></FeedbackNotice> : filtered.length === 0 ? <div className={styles.empty}><Package size={33} /><h3>{products.length ? "No matching products" : "Start your collection"}</h3><p>{products.length ? "Try a different search or adjust your filters." : "Add your first product, then manage prices, variants, and availability here."}</p>{!products.length && <button className={styles.primary} onClick={() => setEditor("new")}><Plus size={15} /> Add your first product</button>}</div> : <>
          <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map(product => <tr key={product.id}>
            <td><div className={styles.productCell}><div className={styles.thumbnail}>{product.images[0] ? <Image src={product.images[0]} alt="" width={45} height={49} /> : <Package size={21} />}</div><div><button className={styles.productName} onClick={() => setEditor(product)}>{product.name}</button><span className={styles.subtle}>{product.sku}{product.brand ? ` · ${product.brand}` : ""}</span>{(product.featured || product.newArrival || product.bestseller) && <span className={styles.subtle}>{[product.featured && "Featured", product.newArrival && "New arrival", product.bestseller && "Bestseller"].filter(Boolean).join(" · ")}</span>}</div></div></td>
            <td>{product.category}<span className={styles.subtle}>{product.subcategory}</span></td>
            <td><strong>{money(product.salePrice ?? product.price)}</strong>{product.salePrice !== null && <span className={styles.subtle}><s>{money(product.price)}</s></span>}</td>
            <td><span className={`${styles.badge} ${product.stock === 0 ? styles.red : product.stock <= 5 ? styles.amber : styles.green}`}>{product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}</span>{product.variants.length > 0 && <span className={styles.subtle}>{product.variants.length} variants</span>}</td>
            <td><button title={`Click to ${product.status === "active" ? "deactivate" : "activate"} ${product.name}`} className={`${styles.badge} ${styles.statusButton} ${product.status === "active" ? styles.green : styles.gray}`} disabled={action.isPending} onClick={() => perform(`products/${product.id}`, "PATCH", { status: product.status === "active" ? "inactive" : "active" }, `Product ${product.status === "active" ? "deactivated" : "activated"}.`)}><PendingContent pending={action.isPending}>{product.status === "active" ? "Active" : "Inactive"}</PendingContent></button></td>
            <td><div className={styles.actions}><button className={styles.iconButton} aria-label={`Edit ${product.name}`} title="Edit product" onClick={() => setEditor(product)}><Pencil size={13} /></button><button className={styles.iconButton} aria-label={`Duplicate ${product.name}`} title="Duplicate product" disabled={action.isPending} onClick={() => perform(`products/${product.id}/duplicate`, "POST", undefined, "Product duplicated. Edit the copy to update its details.")}><PendingContent pending={action.isPending}><Copy size={13} /></PendingContent></button><button className={`${styles.iconButton} ${styles.deleteButton}`} aria-label={`Delete ${product.name}`} title="Delete product" disabled={action.isPending} onClick={() => { action.reset(); setDeleteTarget(product); }}><PendingContent pending={action.isPending}><Trash2 size={13} /></PendingContent></button></div></td>
          </tr>)}</tbody></table></div>
          <div className={styles.pagination}><span>Showing {(activePage - 1) * PER_PAGE + 1}–{Math.min(activePage * PER_PAGE, filtered.length)} of {filtered.length} products</span><div className={styles.paginationActions}><button className={styles.secondary} disabled={activePage === 1} onClick={() => setPage(activePage - 1)}>Previous</button><span>{activePage} / {pageCount}</span><button className={styles.secondary} disabled={activePage === pageCount} onClick={() => setPage(activePage + 1)}>Next</button></div></div>
        </>}
      </section>
    </div>
  );
}
