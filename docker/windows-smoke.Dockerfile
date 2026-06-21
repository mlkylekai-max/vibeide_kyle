FROM electronuserland/builder:wine

WORKDIR /workspace

ENV CI=1 \
    npm_config_audit=false \
    npm_config_fund=false \
    ELECTRON_CACHE=/root/.cache/electron \
    ELECTRON_BUILDER_CACHE=/root/.cache/electron-builder

COPY runtime/package*.json runtime/
RUN cd runtime && npm ci

COPY electron/package*.json electron/
RUN cd electron && npm ci

COPY agent/package*.json agent/
RUN cd agent && npm ci

COPY . .

RUN npm --prefix runtime run build
RUN npm --prefix electron run typecheck
RUN npm --prefix electron run build:main
RUN npm --prefix electron run build:renderer
RUN node agent/tools/build_platform_search_url.mjs taobao "猫粮"
RUN node agent/tools/build_platform_search_url.mjs bilibili "何同学"
RUN node agent/tools/build_platform_search_url.mjs google "windows electron 打包"

CMD ["bash", "-lc", "cd electron && npm run pack:win"]
