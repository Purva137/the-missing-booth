# RunPod GPU Worker Dockerfile
FROM runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    wget \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -U pip setuptools wheel && \
    pip install --no-cache-dir runpod && \
    pip install --no-cache-dir \
        torch==2.2.0 torchvision==0.17.0 --index-url https://download.pytorch.org/whl/cu121 && \
    pip install --no-cache-dir \
        diffusers==0.27.2 \
        transformers==4.40.2 \
        accelerate==0.30.0 \
        xformers==0.0.26.post1 \
        controlnet-aux==0.0.7 \
        insightface==0.7.3 \
        onnxruntime-gpu==1.17.3 \
        Pillow==10.3.0 \
        httpx==0.27.0

# Pre-download models (bake into image to save cold start time)
# Comment out if you prefer lazy loading
RUN python -c "
from diffusers import ControlNetModel, AutoencoderKL
from controlnet_aux import OpenposeDetector
ControlNetModel.from_pretrained('thibaud/controlnet-openpose-sdxl-1.0')
AutoencoderKL.from_pretrained('madebyollin/sdxl-vae-fp16-fix')
OpenposeDetector.from_pretrained('lllyasviel/ControlNet')
print('Models pre-downloaded')
" || echo "Model pre-download skipped"

# Copy source
COPY ai/ ./ai/

CMD ["python", "-u", "ai/runpod_handler.py"]
