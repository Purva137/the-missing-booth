"""
SnapTogether AI Pipeline
SDXL + ControlNet (OpenPose) + IP-Adapter FaceID

Runs on RunPod GPU worker.
"""
import torch
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from typing import Optional
import io
import base64
import httpx


def load_image_from_url(url: str) -> Image.Image:
    with httpx.Client(timeout=30) as client:
        res = client.get(url)
        res.raise_for_status()
    return Image.open(io.BytesIO(res.content)).convert("RGB")


def load_image_from_base64(data: str) -> Image.Image:
    img_bytes = base64.b64decode(data)
    return Image.open(io.BytesIO(img_bytes)).convert("RGB")


def image_to_base64(img: Image.Image, format: str = "JPEG") -> str:
    buf = io.BytesIO()
    img.save(buf, format=format, quality=95)
    return base64.b64encode(buf.getvalue()).decode()


class SnapTogetherPipeline:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if self.device == "cuda" else torch.float32
        self._pipe = None
        self._pose_detector = None
        self._face_analyzer = None

    def _load_models(self):
        """Lazy-load all models on first use."""
        if self._pipe is not None:
            return

        print("[Pipeline] Loading models...")

        from diffusers import (
            StableDiffusionXLControlNetPipeline,
            ControlNetModel,
            AutoencoderKL,
        )
        from controlnet_aux import OpenposeDetector
        from insightface.app import FaceAnalysis

        # ControlNet OpenPose
        controlnet = ControlNetModel.from_pretrained(
            "thibaud/controlnet-openpose-sdxl-1.0",
            torch_dtype=self.dtype,
        )

        # VAE
        vae = AutoencoderKL.from_pretrained(
            "madebyollin/sdxl-vae-fp16-fix",
            torch_dtype=self.dtype,
        )

        # SDXL pipeline
        self._pipe = StableDiffusionXLControlNetPipeline.from_pretrained(
            "stabilityai/stable-diffusion-xl-base-1.0",
            controlnet=controlnet,
            vae=vae,
            torch_dtype=self.dtype,
        )
        self._pipe.to(self.device)
        self._pipe.enable_xformers_memory_efficient_attention()

        # Load IP-Adapter FaceID
        self._pipe.load_ip_adapter(
            "h94/IP-Adapter-FaceID",
            subfolder=None,
            weight_name="ip-adapter-faceid_sdxl.bin",
            image_encoder_folder=None,
        )
        self._pipe.set_ip_adapter_scale(0.6)

        # OpenPose detector
        self._pose_detector = OpenposeDetector.from_pretrained("lllyasviel/ControlNet")

        # InsightFace for face embedding
        self._face_analyzer = FaceAnalysis(
            name="buffalo_l",
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
        )
        self._face_analyzer.prepare(ctx_id=0, det_size=(640, 640))

        print("[Pipeline] All models loaded!")

    def _extract_face_embeds(self, images: list[Image.Image]) -> torch.Tensor:
        """Extract face embeddings from multiple images."""
        import cv2

        embeds = []
        for img in images:
            img_bgr = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
            faces = self._face_analyzer.get(img_bgr)
            if faces:
                embeds.append(torch.from_numpy(faces[0].normed_embedding).unsqueeze(0))

        if not embeds:
            return None

        # Average embeddings for group representation
        avg_embed = torch.mean(torch.cat(embeds, dim=0), dim=0, keepdim=True)
        return avg_embed

    def _create_group_pose(self, num_people: int, width: int = 1024) -> Image.Image:
        """Create a simple group pose template."""
        from controlnet_aux import OpenposeDetector
        # Use a reference group image or generate a pose skeleton
        # For simplicity, create a standing pose arrangement
        pose_img = Image.new("RGB", (width, width), (0, 0, 0))
        # In production, use actual pose estimation from reference images
        return pose_img

    def _arrange_person_images(
        self, person_images: list[Image.Image], target_size: tuple = (1024, 1024)
    ) -> Image.Image:
        """Arrange individual photos as a reference collage."""
        n = len(person_images)
        cols = min(n, 4)
        rows = (n + cols - 1) // cols
        thumb_w = target_size[0] // cols
        thumb_h = target_size[1] // rows

        canvas = Image.new("RGB", target_size, (128, 128, 128))
        for i, img in enumerate(person_images):
            img_resized = img.resize((thumb_w, thumb_h), Image.LANCZOS)
            x = (i % cols) * thumb_w
            y = (i // cols) * thumb_h
            canvas.paste(img_resized, (x, y))

        return canvas

    def generate(
        self,
        member_photos: list[dict],  # [{"photo_url": ..., "name": ..., "member_id": ...}]
        prompt: str,
        negative_prompt: str,
        scene: str,
        birthday_mode: bool = False,
        birthday_name: Optional[str] = None,
        num_inference_steps: int = 30,
        guidance_scale: float = 7.5,
        width: int = 1024,
        height: int = 1024,
        controlnet_conditioning_scale: float = 0.8,
        ip_adapter_scale: float = 0.6,
        seed: Optional[int] = None,
    ) -> str:
        """
        Generate group photo. Returns base64 encoded result image.
        """
        self._load_models()
        self._pipe.set_ip_adapter_scale(ip_adapter_scale)

        # Load all person images
        print(f"[Pipeline] Loading {len(member_photos)} photos...")
        person_images = []
        for p in member_photos:
            try:
                img = load_image_from_url(p["photo_url"])
                person_images.append(img)
            except Exception as e:
                print(f"[Pipeline] Warning: Failed to load photo for {p.get('name')}: {e}")

        if not person_images:
            raise ValueError("No valid photos could be loaded")

        # Extract face embeddings for IP-Adapter
        print("[Pipeline] Extracting face embeddings...")
        face_embeds = self._extract_face_embeds(person_images)

        # Create control image (pose)
        print("[Pipeline] Creating pose control...")
        reference_collage = self._arrange_person_images(person_images, (width, height))
        control_image = self._pose_detector(reference_collage, hand_and_face=True)
        control_image = control_image.resize((width, height))

        # Generator for reproducibility
        generator = None
        if seed is not None:
            generator = torch.Generator(device=self.device).manual_seed(seed)

        # Generate!
        print(f"[Pipeline] Generating with {num_inference_steps} steps...")
        kwargs = dict(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=control_image,
            controlnet_conditioning_scale=controlnet_conditioning_scale,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            width=width,
            height=height,
            generator=generator,
        )

        if face_embeds is not None:
            kwargs["ip_adapter_image_embeds"] = [face_embeds.to(self.device, dtype=self.dtype)]

        result = self._pipe(**kwargs)
        output_image = result.images[0]

        # Birthday text overlay
        if birthday_mode:
            output_image = self._add_birthday_overlay(output_image, birthday_name)

        print("[Pipeline] Generation complete!")
        return image_to_base64(output_image)

    def _add_birthday_overlay(
        self, img: Image.Image, name: Optional[str] = None
    ) -> Image.Image:
        """Add birthday text overlay to image."""
        draw = ImageDraw.Draw(img)
        w, h = img.size

        text = f"🎂 Happy Birthday{f', {name}' if name else ''}! 🎉"

        # Semi-transparent banner at bottom
        banner_h = h // 8
        banner = Image.new("RGBA", (w, banner_h), (0, 0, 0, 180))
        img_rgba = img.convert("RGBA")
        img_rgba.paste(banner, (0, h - banner_h), banner)
        img = img_rgba.convert("RGB")

        draw = ImageDraw.Draw(img)

        # Try to load a nice font, fall back to default
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", h // 18)
        except Exception:
            font = ImageFont.load_default()

        # Center text
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = (w - tw) // 2
        ty = h - banner_h + (banner_h - th) // 2

        draw.text((tx + 2, ty + 2), text, fill=(0, 0, 0, 200), font=font)
        draw.text((tx, ty), text, fill=(255, 255, 255, 255), font=font)

        return img
