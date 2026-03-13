import os
import uuid
import aiofiles
from pathlib import Path
from typing import Optional

try:
    import boto3
    from botocore.exceptions import ClientError
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False


class StorageService:
    def __init__(self, settings):
        self.backend = settings.STORAGE_BACKEND
        self.local_dir = Path(settings.LOCAL_UPLOAD_DIR)
        self.local_dir.mkdir(parents=True, exist_ok=True)

        if self.backend == "s3" and HAS_BOTO3:
            self.s3 = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
            self.bucket = settings.AWS_BUCKET_NAME
            self.cdn_url = settings.AWS_CLOUDFRONT_URL or f"https://{self.bucket}.s3.amazonaws.com"
        else:
            self.s3 = None

        self.api_url = settings.FRONTEND_URL.rstrip('/')

    async def save_upload(
        self,
        file_content: bytes,
        room_code: str,
        member_id: str,
        filename: str,
    ) -> str:
        """Save uploaded photo. Returns public URL."""
        key = f"rooms/{room_code}/members/{filename}"

        if self.backend == "s3" and self.s3:
            return await self._save_s3(file_content, key)
        else:
            return await self._save_local(file_content, key)

    async def save_result(
        self,
        file_content: bytes,
        room_code: str,
    ) -> str:
        """Save generated group photo. Returns public URL."""
        key = f"rooms/{room_code}/result.jpg"

        if self.backend == "s3" and self.s3:
            return await self._save_s3(file_content, key, content_type="image/jpeg")
        else:
            return await self._save_local(file_content, key)

    async def _save_local(self, content: bytes, key: str) -> str:
        path = self.local_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(path, 'wb') as f:
            await f.write(content)
        # Return URL path served by FastAPI static files
        return f"/uploads/{key}"

    async def _save_s3(self, content: bytes, key: str, content_type: str = "image/jpeg") -> str:
        import asyncio
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: self.s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=content,
                ContentType=content_type,
                ACL='public-read',
            )
        )
        return f"{self.cdn_url}/{key}"

    async def get_file_bytes(self, url: str) -> Optional[bytes]:
        """Download file from URL."""
        import httpx
        async with httpx.AsyncClient() as client:
            res = await client.get(url, timeout=30)
            if res.status_code == 200:
                return res.content
        return None
