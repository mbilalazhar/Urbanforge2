"use client";
import { FeedbackNotice, useFeedback } from "@/components/ui/Feedback";

import { ReviewsSkeleton, PendingContent } from "@/components/ui/Skeleton";
import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Star } from "lucide-react";
import type { ProductReview, ReviewsResponse } from "@/lib/reviews/types";
import styles from "./product-reviews.module.css";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.message ?? "Unable to load reviews. Please try again.");
  return data as T;
}

function Stars({ rating }: { rating: number }) {
  return <span className={styles.stars} role="img" aria-label={`${rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map(value => <Star key={value} size={16} aria-hidden="true" fill={value <= rating ? "currentColor" : "none"} />)}</span>;
}

export default function ProductReviews({ productId }: { productId: string }) {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const notifySuccess = useFeedback().success;
  const addButton = useRef<HTMLButtonElement>(null);
  const endpoint = `/api/catalog/${encodeURIComponent(productId)}/reviews`;
  const key = ["product-reviews", productId];
  const query = useQuery({
    queryKey: [...key, page],
    queryFn: ({ signal }) => request<ReviewsResponse>(`${endpoint}?page=${page}`, { signal }),
    retry: false,
  });
  const post = useMutation({
    networkMode: "always",
    mutationFn: () => request<{ review: ProductReview }>(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment }),
    }),
    onSuccess: async ({ review }) => {
      await client.cancelQueries({ queryKey: key });
      const first = client.getQueryData<ReviewsResponse>([...key, 1]);
      const summary = query.data;
      client.setQueryData<ReviewsResponse>([...key, 1], {
        reviews: [review, ...(first?.reviews ?? [])].slice(0, 20),
        total: (summary?.total ?? 0) + 1,
        average: ((summary?.average ?? 0) * (summary?.total ?? 0) + review.rating) / ((summary?.total ?? 0) + 1),
        page: 1, limit: 20,
      });
      setPage(1); setEditing(false); setRating(0); setComment("");
      notifySuccess("Your review has been posted. Thank you!");
      void client.invalidateQueries({ queryKey: key });
      requestAnimationFrame(() => addButton.current?.focus());
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating || post.isPending) return;
     post.mutate();
  }

  return <section className={styles.reviews} aria-label="Customer reviews">

    {editing ? <form className={styles.form} onSubmit={submit} aria-label="Add a product review">
      <div><h3>Add your review</h3><p>How was this product? Select a rating to share your experience.</p></div>
      <fieldset disabled={post.isPending} className={styles.ratingField}>
        <legend>Product rating <span>(required)</span></legend>
        <div className={styles.ratingChoices}>{[1, 2, 3, 4, 5].map(value => <label key={value} className={styles.ratingChoice}>
          <input type="radio" name="rating" value={value} required checked={rating === value} onChange={() => setRating(value)} aria-label={`${value} ${value === 1 ? "star" : "stars"}`} autoFocus={value === 1} />
          <Star size={28} aria-hidden="true" fill={value <= rating ? "currentColor" : "none"} />
        </label>)}</div>
        <p>{rating ? `${rating} out of 5 stars` : "Choose 1–5 stars"}</p>
      </fieldset>
      <label className={styles.commentLabel} htmlFor="product-review-comment">Your review <span>(optional)</span></label>
      <textarea id="product-review-comment" rows={4} maxLength={2000} value={comment} disabled={post.isPending} onChange={event => setComment(event.target.value)} placeholder="Tell others what you liked or what could be better…" aria-describedby="review-comment-limit" />
      <p id="review-comment-limit" className={styles.counter}>{comment.length}/2,000 characters</p>
      {post.error && <FeedbackNotice>{post.error.message}</FeedbackNotice>}
      <div className={styles.actions}><button type="submit" className={styles.primary} disabled={!rating || post.isPending}><PendingContent pending={post.isPending}>{"Post review"}</PendingContent></button><button type="button" className={styles.secondary} disabled={post.isPending} onClick={() => { setEditing(false); post.reset(); requestAnimationFrame(() => addButton.current?.focus()); }}><PendingContent pending={post.isPending}>Cancel</PendingContent></button></div>
    </form> : <div className={styles.heading}>
      <div><h3>Customer reviews</h3>{query.data && query.data.total > 0 && <p className={styles.summary}><strong>{query.data.average.toFixed(1)} / 5</strong><span>Based on {query.data.total} {query.data.total === 1 ? "review" : "reviews"}</span></p>}</div>
      <button ref={addButton} type="button" className={styles.primary} onClick={() => { setEditing(true);  post.reset(); }}>Add review</button>
    </div>}
    {query.isPending && <ReviewsSkeleton />}
    {query.error && <FeedbackNotice>{query.error.message} <button type="button" onClick={() => query.refetch()}>Try again</button></FeedbackNotice>}
    {query.data?.total === 0 && !editing && <div className={styles.empty}><MessageSquare size={28} aria-hidden="true" /><h4>No reviews yet</h4><p>Be the first to share your thoughts about this product.</p></div>}
    {!!query.data?.reviews.length && <ul className={styles.list}>{query.data.reviews.map(review => <li key={review.id}>
      <article><div className={styles.reviewHeading}><div><strong>{review.author}</strong><Stars rating={review.rating} /></div><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</time></div>{review.comment && <p className={styles.comment}>{review.comment}</p>}</article>
    </li>)}</ul>}
    {query.data && query.data.total > query.data.limit && <nav className={styles.pagination} aria-label="Review pages"><button type="button" className={styles.secondary} disabled={page === 1 || query.isFetching} onClick={() => setPage(page - 1)}><PendingContent pending={query.isFetching}>Previous</PendingContent></button><span>Page {page} of {Math.ceil(query.data.total / query.data.limit)}</span><button type="button" className={styles.secondary} disabled={page * query.data.limit >= query.data.total || query.isFetching} onClick={() => setPage(page + 1)}><PendingContent pending={query.isFetching}>Next</PendingContent></button></nav>}
  </section>;
}
