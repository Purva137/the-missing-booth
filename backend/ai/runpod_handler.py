"""
RunPod Serverless Handler for SnapTogether AI Pipeline

Deploy this as a RunPod serverless endpoint.
The handler receives job input, runs the pipeline, and returns results.

Deploy steps:
1. Build Docker image with this file + ai/pipeline.py
2. Push to Docker Hub / GitHub Container Registry
3. Create RunPod Serverless Endpoint using your image
4. Get the Endpoint ID and put it in backend .env
"""

import runpod
from ai.pipeline import SnapTogetherPipeline

# Initialize pipeline once (reused across requests)
pipeline = None


def get_pipeline() -> SnapTogetherPipeline:
    global pipeline
    if pipeline is None:
        pipeline = SnapTogetherPipeline()
    return pipeline


def handler(job: dict) -> dict:
    """
    RunPod job handler.

    Expected input:
    {
        "prompt": str,
        "negative_prompt": str,
        "member_photos": [{"member_id": str, "name": str, "photo_url": str}],
        "scene": str,
        "birthday_mode": bool,
        "birthday_name": str | null,
        "num_inference_steps": int,
        "guidance_scale": float,
        "width": int,
        "height": int,
        "controlnet_conditioning_scale": float,
        "ip_adapter_scale": float,
        "seed": int | null
    }

    Returns:
    {
        "image_base64": str,  # JPEG encoded as base64
        "success": bool
    }
    """
    job_input = job.get("input", {})

    try:
        pipe = get_pipeline()

        image_base64 = pipe.generate(
            member_photos=job_input["member_photos"],
            prompt=job_input["prompt"],
            negative_prompt=job_input.get("negative_prompt", ""),
            scene=job_input.get("scene", "custom"),
            birthday_mode=job_input.get("birthday_mode", False),
            birthday_name=job_input.get("birthday_name"),
            num_inference_steps=job_input.get("num_inference_steps", 30),
            guidance_scale=job_input.get("guidance_scale", 7.5),
            width=job_input.get("width", 1024),
            height=job_input.get("height", 1024),
            controlnet_conditioning_scale=job_input.get("controlnet_conditioning_scale", 0.8),
            ip_adapter_scale=job_input.get("ip_adapter_scale", 0.6),
            seed=job_input.get("seed"),
        )

        return {
            "image_base64": image_base64,
            "success": True,
        }

    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc(),
            "success": False,
        }


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
