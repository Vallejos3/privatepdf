# Deploy Checklist for Vercel

## Prerequisites
- Ensure the project is built and tested locally: `npm run build && npm run dev`
- Verify all PDF operations work in the browser (merge, split, rotate, watermark, optimize)
- Confirm no server-side code or external APIs are used

## Deployment Steps
1. Commit all changes: `git add . && git commit -m "v1"`
2. Push to GitHub repository
3. Connect repository to Vercel
4. Deploy: `npx vercel --prod`
5. Verify the deployed app works correctly in the browser

## Post-Deployment
- Test PDF upload and processing on the live site
- Ensure downloads work properly
- Check for any browser compatibility issues