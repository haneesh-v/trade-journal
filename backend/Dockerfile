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

# copy package files first for caching
COPY package*.json ./ 

# install node-gyp globally (optional) and install deps
RUN npm install --no-audit --no-fund

# copy rest of backend
COPY . .

# if the repo needs a build step (e.g., transpile), run it
# change or remove if repo doesn't have build script
RUN if [ -f package.json ] && jq -e '.scripts.build' package.json >/dev/null 2>&1; then npm run build; fi

EXPOSE 3000
CMD ["npm", "start"]
