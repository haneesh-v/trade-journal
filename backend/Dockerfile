# backend/Dockerfile
FROM node:18-bullseye

# set working dir
WORKDIR /app

# install OS-level deps for sharp/libvips + build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    build-essential \
    make \
    g++ \
    pkg-config \
    libvips-dev \
  && rm -rf /var/lib/apt/lists/*

# Prevent any npm build-from-source accidental behavior
ENV npm_config_build_from_source=false
ENV npm_config_production=false

# copy package files first for caching
COPY package*.json ./ 

# install dependencies normally (allow prebuilt sharp binaries)
RUN npm install --no-audit --no-fund

# copy rest of backend
COPY . .

# run build if present
RUN if [ -f package.json ] && jq -e '.scripts.build' package.json >/dev/null 2>&1; then npm run build; fi

EXPOSE 3000
CMD ["npm", "start"]
