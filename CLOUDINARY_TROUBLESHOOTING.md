# Cloudinary HTTP 401 Error - Troubleshooting Guide

## Problem
When generating questions from uploaded exam papers, you get:
```
Analysis Failed: Unable to access physical document (HTTP 401)
```

This is an **authentication error** when trying to download files from Cloudinary.

---

## Root Causes (in order of likelihood)

### 1. **Cloudinary Free Trial Expired** ⚠️ 
- Free trial grants public URL access for ~45 days
- After expiration, uploaded files become inaccessible
- **Fix**: Check your Cloudinary dashboard → Account Settings → Billing
  - If trial expired: Upgrade to a paid plan or reactivate trial

### 2. **Cloudinary Storage Not Active**
- Files uploaded to local storage (Django `FileSystemStorage`), not Cloudinary
- When deployed to Render, local files aren't accessible from memory
- **Fix**: Enable Cloudinary in `backend/exam_platform/settings.py`
  ```python
  # Verify these environment variables are set:
  CLOUDINARY_CLOUD_NAME
  CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET
  ```

### 3. **File Upload Permissions**
- File was uploaded as "private" instead of "public"
- **Fix**: Check Cloudinary dashboard → Media Library → File properties
  - Ensure "Delivery type" = "Public"

### 4. **Rate Limiting or Quota Exceeded**
- Free tier has upload/API call limits
- **Fix**: Check Cloudinary dashboard → Usage to see current limits

---

## Verification Checklist

Run these commands to verify your setup:

```bash
# 1. Check if Cloudinary env vars are set
echo $CLOUDINARY_CLOUD_NAME
echo $CLOUDINARY_API_KEY
echo $CLOUDINARY_API_SECRET

# 2. If using .env file, verify it's loaded
cat backend/.env | grep CLOUDINARY

# 3. Test a direct curl to a file URL
# (Replace with actual URL from your uploaded file)
curl -v "https://res.cloudinary.com/your-cloud/image/upload/..." 

# 4. Check Django logs for more details
# On Render, view logs via: render.com dashboard
tail -f /path/to/django.log
```

---

## Quick Fixes (in order)

### Option A: Reactivate Cloudinary Access
1. Log in to https://cloudinary.com/console
2. Check Account Settings → Billing
3. If trial expired, upgrade or wait for free tier access
4. Re-deploy backend to Render

### Option B: Switch to Local File Storage (Temporary)
If you want to test without Cloudinary:

In `backend/exam_platform/settings.py`:
```python
# Comment out Cloudinary storage temporarily
# DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# Use local file system (note: files won't persist on Render)
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
```

**⚠️ Warning**: Local storage persists ONLY during deployment on Render. Files deleted on next deploy.

### Option C: Use Vercel/External Storage
Instead of Cloudinary, use:
- **AWS S3** - More reliable, free tier available
- **Azure Blob Storage** - Good for educational projects
- **Supabase** - Includes file storage with PostgreSQL

---

## Advanced: Check Cloudinary API Directly

```python
# Run in Django shell: python manage.py shell
import cloudinary
from django.conf import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_STORAGE['CLOUD_NAME'],
    api_key=settings.CLOUDINARY_STORAGE['API_KEY'],
    api_secret=settings.CLOUDINARY_STORAGE['API_SECRET']
)

# List uploaded resources (may empty if free trial expired)
result = cloudinary.api.resources(max_results=10)
print(result)
```

---

## Code Changes Made

✅ **Fixed in `paper_processor.py` and `handwritten_processor.py`:**
- Removed incorrect HTTPBasicAuth for Cloudinary URLs
- Added better error messages to identify 401 issues
- Cloudinary public URLs don't require authentication  
- Now tries simple HTTP request first (as it should)

### Error Message You'll Now See:
```
Access denied to file. Check: 
1) Cloudinary account active
2) File not private/restricted  
3) Try re-uploading the file
```

This is much more helpful than the generic "HTTP 401" error!

---

## Next Steps

1. **Verify Cloudinary Account**: https://cloudinary.com/console
2. **Check Trial Status**: Settings → Billing
3. **Re-deploy Backend**: Push changes to Render
4. **Test Upload & Generation**: Try uploading a paper again

If you need persistent file storage with a free option, I recommend AWS S3 (free tier) or switching to a different storage provider.
