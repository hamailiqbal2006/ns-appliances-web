export type ProductGalleryImage = {
  id: string;
  url: string;
  storagePath?: string;
  altText: string;
  isPrimary: boolean;
  sortOrder: number;
  mediaType?: "image" | "video";
  posterUrl?: string;
};

export type ReviewStatus = "pending" | "approved" | "rejected";

export type PublicProductReview = {
  id: string;
  productId: string;
  customerName: string;
  rating: number; // 1 to 5
  reviewText: string;
  createdAt: string;
  isAuthorPending?: boolean;
};

export type AdminProductReview = PublicProductReview & {
  customerEmail: string | null;
  status: ReviewStatus;
  updatedAt: string;
  productName?: string;
  productSlug?: string;
};
