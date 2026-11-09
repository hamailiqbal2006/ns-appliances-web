import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { ProductDetailView } from "@/components/product-detail-view";
import { getStorefrontProductBySlug } from "@/lib/public-catalog";
import { getApprovedReviews, getAuthorPendingReviews } from "@/lib/reviews";
import { getPublicStoreSettings } from "@/lib/supabase-admin";
import { hasRecognizedCustomerCookie } from "@/lib/customer-recognition";
import { getCanonicalProductUrl, getProductInquiryWhatsAppUrl } from "@/lib/product-inquiry.server";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug);
  if (!product) {
    return { title: "NS Home Appliances" };
  }

  const canonicalUrl = getCanonicalProductUrl(product.slug);
  const socialTitle = `${product.name} | NS Home Appliances`;
  const description =
    product.description ||
    `Explore ${product.name} at NS Home Appliances showroom. Quality household appliances in Gujranwala. Contact our showroom for pricing and availability.`;

  return {
    title: "NS Home Appliances",
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: socialTitle,
      description,
      url: canonicalUrl,
      siteName: "NS Home Appliances",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const rawAuthorReviews = cookieStore.get("ns_author_reviews")?.value;
  let authorReceipts: Array<{
    reviewId: string;
    productId: string;
    customerName: string;
    rating: number;
    reviewText: string;
    createdAt: string;
  }> = [];

  if (rawAuthorReviews) {
    try {
      const parsed = JSON.parse(rawAuthorReviews);
      if (Array.isArray(parsed)) {
        authorReceipts = parsed;
      }
    } catch {
      // ignore
    }
  }

  const [product, settings, isRecognizedCustomer] = await Promise.all([
    getStorefrontProductBySlug(slug),
    getPublicStoreSettings(),
    hasRecognizedCustomerCookie(),
  ]);

  if (!product) notFound();

  const [reviews, authorPendingReviews] = await Promise.all([
    getApprovedReviews(product.id),
    getAuthorPendingReviews(product.id, authorReceipts),
  ]);

  const productUrl = getCanonicalProductUrl(product.slug);
  const whatsAppUrl = getProductInquiryWhatsAppUrl({
    productName: product.name,
    productUrl,
    whatsappNumber: settings?.whatsapp ?? null,
    phoneNumber: settings?.phone ?? null,
  });

  return (
    <ProductDetailView
      product={product}
      reviews={reviews}
      authorPendingReviews={authorPendingReviews}
      whatsAppUrl={whatsAppUrl}
      whatsappNumber={settings?.whatsapp ?? null}
      phoneNumber={settings?.phone ?? null}
      isRecognizedCustomer={isRecognizedCustomer}
    />
  );
}
