export type ProductReview = {
  id: string;
  productId: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type ReviewsResponse = {
  reviews: ProductReview[];
  total: number;
  average: number;
  page: number;
  limit: number;
};
