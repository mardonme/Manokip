// Plan 02-05 LIB-REVALIDATION: typed revalidate* helpers (Next 16 2-arg form).
//
// Each helper fans out to a fixed tag set + the 'max' profile. Tests assert
// the exact toHaveBeenCalledWith shape so a regression on tag scheme (D-10)
// or signature drift (Next 16 deprecates the single-arg form) is caught at
// compile + run time. vi.mock pattern matches tests/api/cloudinary-sign.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn().mockResolvedValue(undefined),
}));

import { revalidateTag } from "next/cache";
import {
  revalidateProduct,
  revalidateCategory,
  revalidateCategoryMove,
  revalidateManufacturer,
  revalidateSpecField,
  revalidateSpecFieldGroup,
  revalidateSubmissionsCollection,
  revalidateRecipe,
  revalidateIndustry,
  revalidateUsedIn,
} from "@/lib/revalidation";

const mocked = vi.mocked(revalidateTag);

describe("revalidation helpers — Next 16 2-arg form", () => {
  beforeEach(() => mocked.mockClear());

  it("revalidateProduct fans out product:<id>, products-list, sitemap, search-index", async () => {
    await revalidateProduct("abc");
    expect(mocked).toHaveBeenCalledWith("product:abc", "max");
    expect(mocked).toHaveBeenCalledWith("products-list", "max");
    expect(mocked).toHaveBeenCalledWith("sitemap", "max");
    expect(mocked).toHaveBeenCalledWith("search-index", "max");
    expect(mocked).toHaveBeenCalledTimes(4);
  });

  it("revalidateCategory fans out category:<id>, categories-tree, sitemap", async () => {
    await revalidateCategory("cat1");
    expect(mocked).toHaveBeenCalledWith("category:cat1", "max");
    expect(mocked).toHaveBeenCalledWith("categories-tree", "max");
    expect(mocked).toHaveBeenCalledWith("sitemap", "max");
    expect(mocked).toHaveBeenCalledTimes(3);
  });

  it("revalidateCategoryMove fans out old + new + moved + tree + sitemap", async () => {
    await revalidateCategoryMove("OLD", "NEW", "MOVED");
    expect(mocked).toHaveBeenCalledWith("category:OLD", "max");
    expect(mocked).toHaveBeenCalledWith("category:NEW", "max");
    expect(mocked).toHaveBeenCalledWith("category:MOVED", "max");
    expect(mocked).toHaveBeenCalledWith("categories-tree", "max");
    expect(mocked).toHaveBeenCalledWith("sitemap", "max");
    expect(mocked).toHaveBeenCalledTimes(5);
  });

  it("revalidateCategoryMove skips null oldParent (4 calls, no category:null)", async () => {
    await revalidateCategoryMove(null, "NEW", "MOVED");
    expect(mocked).toHaveBeenCalledTimes(4);
    const calls = mocked.mock.calls.map((c) => c[0]);
    expect(calls).not.toContain("category:null");
    expect(mocked).toHaveBeenCalledWith("category:NEW", "max");
    expect(mocked).toHaveBeenCalledWith("category:MOVED", "max");
    expect(mocked).toHaveBeenCalledWith("categories-tree", "max");
    expect(mocked).toHaveBeenCalledWith("sitemap", "max");
  });

  it("revalidateCategoryMove skips null newParent (4 calls, no category:null)", async () => {
    await revalidateCategoryMove("OLD", null, "MOVED");
    expect(mocked).toHaveBeenCalledTimes(4);
    const calls = mocked.mock.calls.map((c) => c[0]);
    expect(calls).not.toContain("category:null");
    expect(mocked).toHaveBeenCalledWith("category:OLD", "max");
    expect(mocked).toHaveBeenCalledWith("category:MOVED", "max");
    expect(mocked).toHaveBeenCalledWith("categories-tree", "max");
    expect(mocked).toHaveBeenCalledWith("sitemap", "max");
  });

  it("revalidateManufacturer fans out manufacturer:<id>, manufacturers-list, sitemap", async () => {
    await revalidateManufacturer("mfg1");
    expect(mocked).toHaveBeenCalledWith("manufacturer:mfg1", "max");
    expect(mocked).toHaveBeenCalledWith("manufacturers-list", "max");
    expect(mocked).toHaveBeenCalledWith("sitemap", "max");
    expect(mocked).toHaveBeenCalledTimes(3);
  });

  it("revalidateSpecField fans out spec-field:<id>, category:<catId>, search-index", async () => {
    await revalidateSpecField("SF", "CAT");
    expect(mocked).toHaveBeenCalledWith("spec-field:SF", "max");
    expect(mocked).toHaveBeenCalledWith("category:CAT", "max");
    expect(mocked).toHaveBeenCalledWith("search-index", "max");
    expect(mocked).toHaveBeenCalledTimes(3);
  });

  it("revalidateSpecFieldGroup fans out spec-field-group:<id>, category:<catId>", async () => {
    await revalidateSpecFieldGroup("SFG", "CAT");
    expect(mocked).toHaveBeenCalledWith("spec-field-group:SFG", "max");
    expect(mocked).toHaveBeenCalledWith("category:CAT", "max");
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it("revalidateSubmissionsCollection is a no-op placeholder (admin-only reads)", async () => {
    await revalidateSubmissionsCollection();
    expect(mocked).toHaveBeenCalledTimes(0);
  });

  // Plan 04-03 Task 3.2 — content-tier helpers (CONT-03 + CONT-04 + D-04 fan-out).
  // Each helper fans recipe:<id> / industry:<id> + recipes/industries:list:<l> per
  // locale + sitemap; revalidateUsedIn fans used-in:<pid> + product:<pid> so the
  // surrounding spec/manufacturer/used-in product page composes fresh.

  it("revalidateRecipe fans recipe:<id>, recipes:list:<l> per locale, sitemap (default 3 locales)", async () => {
    await revalidateRecipe("rec1");
    expect(mocked).toHaveBeenCalledWith("recipe:rec1", "max");
    expect(mocked).toHaveBeenCalledWith("recipes:list:uz", "max");
    expect(mocked).toHaveBeenCalledWith("recipes:list:ru", "max");
    expect(mocked).toHaveBeenCalledWith("recipes:list:en", "max");
    expect(mocked).toHaveBeenCalledWith("sitemap", "max");
    expect(mocked).toHaveBeenCalledTimes(5);
  });

  it("revalidateRecipe respects narrowed locales array (1 locale → 3 calls)", async () => {
    await revalidateRecipe("rec2", ["uz"]);
    expect(mocked).toHaveBeenCalledWith("recipe:rec2", "max");
    expect(mocked).toHaveBeenCalledWith("recipes:list:uz", "max");
    expect(mocked).toHaveBeenCalledWith("sitemap", "max");
    expect(mocked).toHaveBeenCalledTimes(3);
    const tags = mocked.mock.calls.map((c) => c[0]);
    expect(tags).not.toContain("recipes:list:ru");
    expect(tags).not.toContain("recipes:list:en");
  });

  it("revalidateIndustry fans industry:<id>, industries:list:<l> per locale, sitemap (default 3 locales)", async () => {
    await revalidateIndustry("ind1");
    expect(mocked).toHaveBeenCalledWith("industry:ind1", "max");
    expect(mocked).toHaveBeenCalledWith("industries:list:uz", "max");
    expect(mocked).toHaveBeenCalledWith("industries:list:ru", "max");
    expect(mocked).toHaveBeenCalledWith("industries:list:en", "max");
    expect(mocked).toHaveBeenCalledWith("sitemap", "max");
    expect(mocked).toHaveBeenCalledTimes(5);
  });

  it("revalidateIndustry respects narrowed locales array (2 locales → 4 calls)", async () => {
    await revalidateIndustry("ind2", ["ru", "en"]);
    expect(mocked).toHaveBeenCalledWith("industry:ind2", "max");
    expect(mocked).toHaveBeenCalledWith("industries:list:ru", "max");
    expect(mocked).toHaveBeenCalledWith("industries:list:en", "max");
    expect(mocked).toHaveBeenCalledWith("sitemap", "max");
    expect(mocked).toHaveBeenCalledTimes(4);
  });

  it("revalidateUsedIn fans used-in:<pid> + product:<pid> (page-level recompose)", async () => {
    await revalidateUsedIn("prod1");
    expect(mocked).toHaveBeenCalledWith("used-in:prod1", "max");
    expect(mocked).toHaveBeenCalledWith("product:prod1", "max");
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it("revalidateUsedIn calls used-in tag BEFORE product tag (defense-in-depth ordering)", async () => {
    await revalidateUsedIn("prod2");
    const tags = mocked.mock.calls.map((c) => c[0]);
    expect(tags[0]).toBe("used-in:prod2");
    expect(tags[1]).toBe("product:prod2");
  });
});
