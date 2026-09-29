"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { ArrowRight, Heart } from "lucide-react";
import ProductQuickView from "./ProductQuickView";

export type ProductColor = {
  name: string;
  hex: string;
};

export type Product = {
  id: string | number;
  name: string;
  category: string;
  price: string;
  image: string;
  tag?: string;
  colors?: ProductColor[];
  href?: string;

};

type ProductCardProps = {
  product: Product;
  showTag?: boolean;
  showColors?: boolean;
  showArrow?: boolean;
};

const QUICK_VIEW_DELAY = 700;

export default function ProductCard({
  product,
  showTag = true,
  showColors = true,
  showArrow = true,
}: ProductCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedAt = useRef(0);

  function cancelHover() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  }

  useEffect(() => {
    // Scrolling past a card should not unexpectedly open a preview.
    window.addEventListener("scroll", cancelHover, { passive: true, capture: true });
    return () => {
      cancelHover();
      window.removeEventListener("scroll", cancelHover, true);
    };
  }, []);

  function openPreview() {
    cancelHover();
    if (!document.querySelector("dialog[open]")) setIsOpen(true);
  }

  function startHover(event: PointerEvent<HTMLElement>) {
    cancelHover();
    if (event.pointerType !== "mouse" || isOpen || Date.now() - closedAt.current < 1200) return;
    hoverTimer.current = setTimeout(openPreview, QUICK_VIEW_DELAY);
  }

  function closePreview() {
    cancelHover();
    closedAt.current = Date.now();
    setIsOpen(false);
  }

  return (
    <>
      <article className="group relative w-full" onPointerEnter={startHover} onPointerLeave={cancelHover} onPointerDown={cancelHover}>
        <button
          type="button"
          onClick={openPreview}
          aria-label={`View details for ${product.name}`}
          aria-haspopup="dialog"
          className="block w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c8202d]"
        >
          <span className="relative block aspect-[4/5] w-full overflow-hidden bg-neutral-200">
            <Image src={product.image} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none" />
            {showTag && product.tag && (
              <span className="absolute left-3 top-3 bg-[#e53e3e] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white">{product.tag}</span>
            )}
          </span>
          <span className="mt-3 flex flex-col">
            <span className="truncate text-[15px] font-medium leading-snug text-black sm:text-[17px]">{product.name}</span>
            <span className="mt-1 text-[9px] uppercase tracking-[0.2em] text-neutral-500">{product.category}</span>
            <span className="mt-1.5 text-xs font-normal text-black sm:text-[13px]">{product.price}</span>
            <span className="mt-2 flex items-center justify-between gap-3">
              {showColors && product.colors?.length ? (
                <span className="flex items-center gap-1.5">
                  {product.colors.map((color) => (
                    <span key={color.name} title={color.name} className="h-3 w-3 rounded-full ring-1 ring-neutral-300" style={{ backgroundColor: color.hex }} />
                  ))}
                </span>
              ) : <span />}
              {showArrow && <ArrowRight aria-hidden="true" className="h-4 w-6 text-black transition-transform group-hover:translate-x-1" strokeWidth={1.5} />}
            </span>
          </span>
        </button>
        <button type="button" aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`} aria-pressed={isSaved} onClick={() => setIsSaved(!isSaved)} className="absolute right-2.5 top-2.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/20 text-white transition-colors hover:bg-black/50 focus-visible:outline-2 focus-visible:outline-white">
          <Heart className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} strokeWidth={1.5} />
        </button>
      </article>
      {isOpen && <ProductQuickView product={product} onClose={closePreview} />}
    </>
  );
}
