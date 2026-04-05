FROM node:20-slim

# canvas, sharp 빌드 의존성 + Python/PyMuPDF 설치
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    build-essential \
    pkg-config \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && pip3 install pymupdf --break-system-packages \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["npm", "start"]
