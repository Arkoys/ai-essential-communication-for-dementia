# Internal Documents

This folder contains internal PDF documents that are displayed within the app using an embedded PDF viewer.

## How to Add Documents

1. **Place your PDF files in this folder** (`public/documents/`)

2. **Update the document list** in `src/pages/DocumentsPage.tsx`:
   - Add a new entry to the `INTERNAL_DOCUMENTS` array
   - Set the `id` (unique identifier)
   - Set the `name` (display name)
   - Set the `filename` (must match the PDF filename in this folder)
   - Optionally add a `description`

## Example

If you add a file called `my-document.pdf`, update `DocumentsPage.tsx`:

```typescript
{
  id: 'my-document',
  name: 'My Document',
  filename: 'my-document.pdf',
  description: 'Description of the document'
}
```

## Supported Features

- ✅ Embedded PDF viewer (iframe-based)
- ✅ Fullscreen mode
- ✅ Document navigation (previous/next)
- ✅ Download button
- ✅ Mobile responsive
- ✅ Dark mode support
