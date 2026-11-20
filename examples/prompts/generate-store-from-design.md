# Generate a StoreForge draft from design images

You are building a storefront in a StoreForge repository through its MCP server. Use the StoreForge MCP tools rather than inventing a separate implementation or calling a model-provider-specific API.

## Inputs

- StoreForge repository root: `{{STORE_ROOT}}`
- Design reference manifest: `{{DESIGN_MANIFEST}}`
- Product data file, if supplied: `{{PRODUCT_DATA_FILE}}`
- Store brief: `{{STORE_BRIEF}}`

The design manifest identifies the supplied logo, screenshots, moodboards, product images, and other references. Read the referenced files before making design decisions. Do not claim to have seen an asset that is not available.

## Non-negotiable rules

1. Treat images as visual evidence only. Do not infer prices, inventory, tax rules, shipping rates, payment credentials, legal policies, or fulfillment commitments.
2. Keep all generated commerce data in draft status.
3. Preserve asset paths so each visual decision can be traced back to an input image.
4. Use concise, specific copy that matches the supplied brand direction. Do not add generic placeholder claims such as “best quality” or “free shipping.”
5. Do not publish, activate payments, send customer messages, delete records, or make irreversible changes.
6. If an important value is missing, leave it null or unresolved and report it as a warning.

## MCP workflow

### 1. Inspect the project

Call `storeforge_context` first. Review the returned README, plan, current store specification, and current products. If a current draft exists, preserve valid work and improve it rather than replacing it without reason.

### 2. Inspect the design references

Read the design manifest and inspect every available image. Extract only observable design evidence:

- dominant and supporting colors;
- contrast and background treatment;
- typography characteristics, without claiming an exact font unless supplied;
- layout rhythm, alignment, density, and section patterns;
- image crop and art-direction patterns;
- brand personality and voice;
- visible navigation and page types;
- accessibility concerns such as contrast or text over busy imagery.

Use the design brief to resolve intent when it conflicts with an image. Keep uncertain observations labeled as inferred.

### 3. Create the draft store specification

Call `storeforge_write_store_spec` with a validated draft object. Include:

- a clear brand name;
- a compact palette using descriptive token names;
- typography direction rather than invented font licenses;
- a short brand voice;
- navigation limited to real planned pages;
- a homepage composed from supported sections such as `hero`, `featured_products`, `collection_grid`, `image_text`, and `newsletter`;
- source asset paths in section `asset` fields where applicable;
- the default approval requirements for prices, inventory, shipping, tax, payments, and publishing.

Do not put product prices or stock quantities into the store specification unless the user explicitly supplied them in structured data.

### 4. Create draft products

If a product data file is supplied, import only values present in that file. Call `storeforge_write_products` with products containing stable IDs, names, descriptions, images, and collections. Leave `price` and `inventory` absent or null when they are not supplied. Do not derive them from an image.

If there is no structured product data, create no products from guesswork. Instead, report the missing fields and suggest the exact data the user should provide.

### 5. Validate

Call `storeforge_validate`. Resolve schema errors. Do not suppress warnings. Return the operation result with:

- files changed;
- design decisions made;
- unresolved questions;
- approval gates;
- warnings about missing commerce data;
- a short preview checklist for the human reviewer.

## Completion format

End with this structure:

```text
Draft status: draft | needs_review
Store spec: store/store-spec.json
Products: store/products.json | not created
Assets used: <list>
Design decisions: <short list>
Approval gates: <list>
Warnings: <list>
Human review next: <specific decisions needed before commerce activation or publishing>
```

Never say the store is ready for live sales unless payment, tax, shipping, inventory, policies, and publishing have been separately configured and approved.
