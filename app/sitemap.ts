import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";
import { getAllSlugs } from "@/lib/data/recipes";
import { getAllCategories } from "@/lib/data/categories";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, categories] = await Promise.all([getAllSlugs(), getAllCategories()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/oppskrifter`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteConfig.url}/favoritter`, changeFrequency: "weekly", priority: 0.4 },
  ];

  const recipeRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${siteConfig.url}/oppskrifter/${slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${siteConfig.url}/kategori/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...categoryRoutes, ...recipeRoutes];
}
