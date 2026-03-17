/* Global multiplayer/rank server config: update only this file when tunnel changes. */
(function initTapTapChoServerConfig() {
  const baseUrl = 'wss://thought-myself-solve-improve.trycloudflare.com';

  const servers = {
    baseUrl,
    sunkenWs: `${baseUrl}/ws/sunken`,
    sunkenRankWs: `${baseUrl}/ws/sunken`,
    twinTempleWs: `${baseUrl}/ws/twin`,
  };

  window.TapTapChoServers = Object.freeze(servers);
})();

