"use client";
import { FeedbackNotice } from "@/components/ui/Feedback";

import { ProductGridSkeleton, Skeleton, TextSkeleton } from "@/components/ui/Skeleton";
import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { useCatalog } from "@/lib/catalog/client";
import { toProductCard, productPrice, formatProductPrice } from "@/lib/products";
import { catalogSections } from "@/lib/catalog-sections";
import styles from "./search.module.css";

const tabs = ["All", "Products", "Collections", "Categories"] as const;
type Tab = typeof tabs[number];

const collectionImages: Record<string, string> = {
  women: "/search/women.png",
  men: "/search/male.png",
  "new-in": "/search/female.png",
  shoes: "/search/shoes.png",
  accessories: "/search/accessories.png",
  sale: "/search/sale.png",
};

export default function SearchPage({ query }: { query: string }) {
  const router = useRouter();
  const catalog = useCatalog();
  const products = (catalog.data?.products ?? []).map(toProductCard);
  const categories = [...new Set(products.map(product => product.category))];
  const colors = [...new Map(products.flatMap(product => product.colors ?? []).map(color => [color.name, color])).values()];
  const sizes = [...new Set(products.flatMap(product => product.sizes ?? []))];
  const priceCeiling = Math.max(1000, ...products.map(productPrice));
  const [draft, setDraft] = useState(query);
  const [tab, setTab] = useState<Tab>("All");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceLimit, setPriceLimit] = useState<number | null>(null);
  const maxPrice = priceLimit ?? priceCeiling;
  const [sort, setSort] = useState("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = (value: string) => terms.every(term => value.toLowerCase().includes(term));
  const matchingProducts = products.filter(product => matches(`${product.name} ${product.category} ${product.tag ?? ""} ${product.colors?.map(color => color.name).join(" ")}`));
  const filteredProducts = matchingProducts.filter(product =>
    (!selectedCategories.length || selectedCategories.includes(product.category)) &&
    (!selectedSizes.length || selectedSizes.some(size => (product.sizes ?? []).includes(size))) &&
    (!selectedColors.length || product.colors?.some(color => selectedColors.includes(color.name))) &&
    productPrice(product) <= maxPrice
  ).sort((a, b) => sort === "price-low" ? productPrice(a) - productPrice(b) : sort === "price-high" ? productPrice(b) - productPrice(a) : sort === "newest" ? Number(b.tag === "NEW") - Number(a.tag === "NEW") : 0);
  const matchingCollections = catalogSections.filter(section => matches(`${section.label} ${section.hero.description.join(" ")}`));
  const matchingCategories = categories.filter(category => matches(category) || matchingProducts.some(product => product.category === category));
  const counts = { All: filteredProducts.length + matchingCollections.length + matchingCategories.length, Products: filteredProducts.length, Collections: matchingCollections.length, Categories: matchingCategories.length };
  const activeFilters = selectedCategories.length + selectedSizes.length + selectedColors.length + Number(priceLimit !== null && maxPrice < priceCeiling);

  function toggle(value: string, current: string[], update: (values: string[]) => void) {
    update(current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  }
  function clearFilters() {
    setSelectedCategories([]); setSelectedSizes([]); setSelectedColors([]); setPriceLimit(null);
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(draft.trim() ? `/search?q=${encodeURIComponent(draft.trim())}` : "/search", { scroll: false });
  }

  return (
    <main className={styles.page}>
      <div className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span aria-current="page">Search</span></nav>
        <header className={styles.heading}><h1>Search <span>Results</span></h1><p>Find what moves you.</p></header>
        <div className={styles.searchRow}>
          <form role="search" onSubmit={submitSearch} className={styles.searchBox}>
            <label htmlFor="product-search" className={styles.srOnly}>Search products</label>
            <Search size={18} strokeWidth={1.5} aria-hidden="true" />
            <input id="product-search" type="search" name="q" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Search sneakers, hoodies, everyday essentials…" />
            {draft && <button type="button" aria-label="Clear search" onClick={() => { setDraft(""); router.push("/search", { scroll: false }); }}><X size={16} /></button>}
            <button type="submit" aria-label="Search"><ArrowRight size={18} /></button>
          </form>
          <p className={styles.resultCount} role="status">{catalog.isPending && (tab === "All" || tab === "Products") ? <Skeleton width={25} /> : counts[tab]} {tab === "All" ? "results" : tab.toLowerCase()}{query.trim() ? <> for <strong>“{query.trim()}”</strong></> : <span> to make your own</span>}</p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.tabs} role="tablist" aria-label="Search result types">
            {tabs.map((name, index) => <button type="button" role="tab" id={`tab-${name}`} aria-selected={tab === name} aria-controls="search-results" tabIndex={tab === name ? 0 : -1} key={name} onClick={() => setTab(name)} onKeyDown={event => {
              let next: Tab | undefined;
              if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
              if (event.key === "ArrowLeft") next = tabs[(index + tabs.length - 1) % tabs.length];
              if (event.key === "Home") next = tabs[0];
              if (event.key === "End") next = tabs[tabs.length - 1];
              if (next) { event.preventDefault(); setTab(next); document.getElementById(`tab-${next}`)?.focus(); }
            }}>{name} <span>{catalog.isPending && (name === "All" || name === "Products") ? <Skeleton width={22} height={12} /> : `(${counts[name]})`}</span></button>)}
          </div>
          {(tab === "All" || tab === "Products") && <label className={styles.sort}>Sort by<select aria-label="Sort products" value={sort} onChange={event => setSort(event.target.value)}><option value="relevance">Relevance</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="newest">New arrivals</option></select></label>}
        </div>

        <div className={styles.layout}>
          {(tab === "All" || tab === "Products") && <>
            <button className={styles.filterToggle} type="button" aria-expanded={showFilters} aria-controls="search-filters" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={16} />Filters {activeFilters > 0 && `(${activeFilters})`}<ChevronDown size={16} /></button>
            <aside id="search-filters" className={`${styles.filters} ${showFilters ? styles.filtersOpen : ""}`} aria-label="Filter products">
              {catalog.isPending ? <TextSkeleton lines={12} /> : <><div className={styles.filterHeading}><h2>Filters</h2><button type="button" onClick={clearFilters} disabled={!activeFilters}>Clear all</button></div>
              <details open><summary>Category<ChevronDown size={14} /></summary><div className={styles.checkboxes}>{categories.map(category => <label key={category}><input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggle(category, selectedCategories, setSelectedCategories)} /><span>{category}</span><small>{matchingProducts.filter(product => product.category === category).length}</small></label>)}</div></details>
              <details><summary>Size<ChevronDown size={14} /></summary><div className={styles.sizes}>{sizes.map(size => <button type="button" key={size} aria-pressed={selectedSizes.includes(size)} onClick={() => toggle(size, selectedSizes, setSelectedSizes)}>{size}</button>)}</div></details>
              <details open><summary>Color<ChevronDown size={14} /></summary><div className={styles.colors}>{colors.map(color => <button type="button" key={color.name} title={color.name} aria-label={`Filter by ${color.name}`} aria-pressed={selectedColors.includes(color.name)} onClick={() => toggle(color.name, selectedColors, setSelectedColors)}><span style={{ background: color.hex }} /></button>)}</div></details>
              <details open><summary>Price range<ChevronDown size={14} /></summary><div className={styles.priceRange}><label htmlFor="max-price">Up to <strong>{formatProductPrice(maxPrice)}</strong></label><input id="max-price" type="range" min="0" max={priceCeiling} step="1" value={maxPrice} onChange={event => setPriceLimit(Number(event.target.value))} /><div><span>Rs. 0</span><span>{formatProductPrice(priceCeiling)}</span></div></div></details>
              <p className={styles.filterNote}>Your style. Your rules.<br />Find the pieces that fit.</p></>}
            </aside>
          </>}

          <div id="search-results" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0} className={`${styles.results} ${tab === "Collections" || tab === "Categories" ? styles.fullWidth : ""}`}>
            {(tab === "All" || tab === "Products") && <>
              {activeFilters > 0 && <div className={styles.activeFilters}><span>{filteredProducts.length} matching products</span><button type="button" onClick={clearFilters}>Reset filters<X size={12} /></button></div>}
              {catalog.isPending ? <ProductGridSkeleton className={styles.grid} /> : catalog.error ? <FeedbackNotice><p>{catalog.error.message}</p><button type="button" onClick={() => catalog.refetch()}>Try again</button></FeedbackNotice> : filteredProducts.length ? <div className={styles.grid}>{filteredProducts.map(product => <ProductCard key={product.id} product={product} showArrow={false} />)}</div> : <div className={styles.empty}><Search size={32} strokeWidth={1} /><h2>No products found.</h2><p>Try a different search or adjust your filters.</p><button type="button" onClick={() => { clearFilters(); setDraft(""); router.push("/search"); }}>Explore all products<ArrowRight size={16} /></button></div>}
            </>}
            {(tab === "All" || tab === "Collections") && matchingCollections.length > 0 && <section className={styles.related}><h2>Explore collections <span>({matchingCollections.length})</span></h2><div className={styles.collectionGrid}>{matchingCollections.map(section => <Link href={`/${section.slug}`} key={section.slug} className={styles.collection}><Image src={collectionImages[section.slug]} alt={section.label} fill sizes="(max-width: 767px) 45vw, 20vw" /><span>{section.label}<ArrowRight size={17} /></span></Link>)}</div></section>}
            {(tab === "All" || tab === "Categories") && matchingCategories.length > 0 && <section className={styles.related}><h2>Shop by category <span>({matchingCategories.length})</span></h2><div className={styles.categoryLinks}>{matchingCategories.map(category => <Link key={category} href={`/search?q=${encodeURIComponent(category)}`}>{category}<ArrowRight size={15} /></Link>)}</div></section>}
            {((tab === "Collections" && !matchingCollections.length) || (tab === "Categories" && !matchingCategories.length)) && <div className={styles.empty}><Search size={32} strokeWidth={1} /><h2>No {tab.toLowerCase()} found.</h2><p>Try a broader search to find your next fit.</p><Link href="/search">Explore everything<ArrowRight size={16} /></Link></div>}
          </div>
        </div>
      </div>
      <aside className={styles.editorial} aria-label="UrbanForge streetwear">
        <Image src="/search/search.png" alt="Model wearing UrbanForge streetwear" fill sizes="20vw" priority />
        <p>Built for<br />the streets.</p><span>More<br />than<br />fashion.</span>
      </aside>
      <Link href="/new-in" className={styles.banner}><Image src="/hero-bg.png" alt="" fill sizes="100vw" /><span>Find your fit.<br /><em>Move different.</em></span><span className={styles.bannerCaption}>UrbanForge<br />Streetwear worldwide<ArrowRight size={24} /></span></Link>
    </main>
  );
}
