// ═══════════════════════════════════════════════════════════
// AdBlock Filter Lists — COGITATOR BROWSER
// Built-in block lists for MVP (no external dependencies)
// ═══════════════════════════════════════════════════════════

// ── Block Rules: Network-level URL blocking ───────────────
// Format: EasyList-style rules
//   ||domain.com^     — block domain + all subdomains + all paths
//   |http://prefix    — block URLs starting with prefix
//   |suffix|          — block URLs ending with suffix
//   @@||domain.com^   — exception (allow)
//   plainstring       — substring match anywhere in URL
//
// Total: 240+ rules covering major ad/tracking networks

export const BLOCK_RULES: string[] = [
  // ═══ Google / Alphabet ═══
  '||google-analytics.com^',
  '||googletagmanager.com^',
  '||googletagservices.com^',
  '||doubleclick.net^',
  '||googleadservices.com^',
  '||googlesyndication.com^',
  '||googleoptimize.com^',
  '||googletagmanager.com^',
  '||firebase.google.com^',
  '||firebaselogging.googleapis.com^',
  '||google-analytics.com/collect^',
  '||google-analytics.com/g/collect^',
  '||google-analytics.com/j/collect^',
  '||analytics.google.com^',
  '||marketingplatform.google.com^',
  // '||fonts.googleapis.com^',  // breaks site icons/layout — cosmetic only
  // '||fonts.gstatic.com^',
  '||fundingchoices.google.com^',
  '||fundingchoicesmessages.google.com^',
  '||pagead2.googlesyndication.com^',
  '||tpc.googlesyndication.com^',
  '||adservice.google.com^',
  '||adservice.google.ru^',
  '||partner.googleadservices.com^',
  '||www.googleadservices.com^',

  // ═══ Facebook / Meta ═══
  '||connect.facebook.net^',
  '||facebook.com/tr^',
  '||graph.facebook.com^',
  '||pixel.facebook.com^',
  '||analytics.facebook.com^',
  '||ads.facebook.com^',
  '||an.facebook.com^',
  '||fbcdn.net^$domain=~facebook.com',

  // ═══ Amazon Advertising ═══
  '||amazon-adsystem.com^',
  '||c.amazon-adsystem.com^',
  '||s.amazon-adsystem.com^',
  '||aax.amazon-adsystem.com^',
  '||aax-us-east.amazon-adsystem.com^',
  '||fls-na.amazon.com^',
  '||advertising.amazon.com^',
  '||assoc-amazon.com^',
  '||ws-na.amazon-adsystem.com^',
  '||z-na.amazon-adsystem.com^',

  // ═══ Microsoft / Bing ═══
  '||bat.bing.com^',
  '||clarity.ms^',
  '||clarity.microsoft.com^',
  '||msads.net^',
  '||microsoft.com/actions^',
  '||microsoft.com/collect^',
  '||analytics.windows.net^',
  '||telemetry.microsoft.com^',
  '||watson.telemetry.microsoft.com^',

  // ═══ Twitter / X ═══
  '||ads-twitter.com^',
  '||static.ads-twitter.com^',
  '||analytics.twitter.com^',
  '||advertising.twitter.com^',
  '||syndication.twitter.com^',

  // ═══ LinkedIn / Microsoft ═══
  '||ads.linkedin.com^',
  '||analytics.linkedin.com^',
  '||dc.ads.linkedin.com^',

  // ═══ Pinterest ═══
  '||ads.pinterest.com^',
  '||analytics.pinterest.com^',
  '||log.pinterest.com^',
  '||trk.pinterest.com^',

  // ═══ Snapchat ═══
  '||tr.snapchat.com^',
  '||sc-analytics.appspot.com^',
  '||ads.snapchat.com^',

  // ═══ TikTok ═══
  '||ads.tiktok.com^',
  '||analytics.tiktok.com^',
  '||business-api.tiktok.com^',

  // ═══ Reddit ═══
  '||events.reddit.com^',
  '||ads.reddit.com^',
  '||redditstatic.com/ads^',

  // ═══ Yahoo / Verizon Media ═══
  '||ads.yahoo.com^',
  '||gemini.yahoo.com^',
  '||analytics.yahoo.com^',
  '||log.fc.yahoo.com^',
  '||udc.yahoo.com^',
  '||advertising.yahoo.com^',
  '||yimg.com^*/ad^',

  // ═══ Taboola / Outbrain ═══
  '||taboola.com^',
  '||cdn.taboola.com^',
  '||trc.taboola.com^',
  '||api.taboola.com^',
  '||outbrain.com^',
  '||widgets.outbrain.com^',
  '||amplify.outbrain.com^',
  '||paid.outbrain.com^',
  '||odb.outbrain.com^',

  // ═══ Criteo ═══
  '||criteo.com^',
  '||static.criteo.net^',
  '||sslwidget.criteo.com^',
  '||cas.criteo.com^',
  '||bidder.criteo.com^',
  '||gum.criteo.com^',
  '||rtax.criteo.com^',

  // ═══ AdRoll / NextRoll ═══
  '||adroll.com^',
  '||d.adroll.com^',
  '||s.adroll.com^',

  // ═══ The Trade Desk ═══
  '||adsrvr.org^',
  '||ttdmp.com^',
  '||match.adsrvr.org^',

  // ═══ AppNexus / Xandr ═══
  '||adnxs.com^',
  '||ib.adnxs.com^',
  '||secure.adnxs.com^',
  '||nym1.ib.adnxs.com^',

  // ═══ Rubicon Project / Magnite ═══
  '||rubiconproject.com^',
  '||fastlane.rubiconproject.com^',
  '||prebid-server.rubiconproject.com^',

  // ═══ PubMatic ═══
  '||pubmatic.com^',
  '||ads.pubmatic.com^',
  '||image2.pubmatic.com^',

  // ═══ OpenX ═══
  '||openx.net^',
  '||us-u.openx.net^',
  '||rtb.openx.net^',

  // ═══ Index Exchange ═══
  '||casalemedia.com^',
  '||js.casalemedia.com^',
  '||as.casalemedia.com^',
  '||ixwrapper.com^',

  // ═══ Sovrn / Commerce ═══
  '||lijit.com^',
  '||ap.lijit.com^',
  '||sovrn.com^',

  // ═══ ShareThrough ═══
  '||sharethrough.com^',
  '||match.sharethrough.com^',

  // ═══ TripleLift ═══
  '||3lift.com^',
  '||tlx.3lift.com^',
  '||eb2.3lift.com^',

  // ═══ Media.net ═══
  '||media.net^',
  '||adservetx.media.net^',
  '|| contextual.media.net^',

  // ═══ Yandex ═══
  '||mc.yandex.ru^',
  '||an.yandex.ru^',
  '||metrika.yandex.ru^',
  '||yandex.ru/metrika^',
  '||yandex.ru/ads^',
  '||ads.yandex.ru^',
  '||awaps.yandex.ru^',
  '||bs.yandex.ru^',
  '||clck.yandex.ru^',

  // ═══ VKontakte ═══
  '||vk.com/rtrg^',
  '||vk.com/counter^',
  '||vk.com/tr^',
  '||top-fwz1.mail.ru^',
  '||ad.mail.ru^',
  '||target.my.com^',

  // ═══ Mail.ru ═══
  '||target.mail.ru^',
  '||top.mail.ru^',
  '||rs.mail.ru^',
  '||pulse.mail.ru^',
  '||trk.mail.ru^',

  // ═══ Rambler ═══
  '||counter.rambler.ru^',
  '||id.rambler.ru^',
  '||kvn.rambler.ru^',
  '||scounter.rambler.ru^',

  // ═══ Chinese Trackers ═══
  '||hm.baidu.com^',
  '||baidu.com/cpro^',
  '||pos.baidu.com^',
  '||cpro.baidu.com^',
  '||cnzz.com^',
  '||w.cnzz.com^',
  '||s11.cnzz.com^',
  '||s95.cnzz.com^',
  '||umeng.com^',
  '||alog.umeng.com^',
  '||alog.umengcloud.com^',

  // ═══ Korean Trackers ═══
  '||tksync.com^',

  // ═══ Generic Tracking / Analytics Patterns ═══
  '||tracking^',
  '||telemetry^',
  '||metrics^',
  '||analytics^',
  '||beacon^',
  '||pixel^',
  '||pixel.track^',
  '||events^$third-party',
  '||event^$third-party',
  '||log^$third-party',
  '||logs^$third-party',
  '||stats^$third-party',
  '||statistics^$third-party',
  '||counter^$third-party',
  '||counters^$third-party',
  '||measure^$third-party',
  '||measurement^$third-party',
  '||tracking^$third-party',
  '||track^$third-party',
  '||trk^$third-party',
  '||trax^$third-party',
  '||ping^$third-party',
  '||pings^$third-party',
  '||perf^$third-party',
  '||collector^$third-party',
  '||collect^$third-party',
  '||report^$third-party',
  '||reporting^$third-party',
  '||monitor^$third-party',
  '||monitoring^$third-party',
  '||insight^$third-party',
  '||insights^$third-party',

  // ═══ CDN-level Ad Delivery ═══
  '||adsystem^',
  '||adnxs^',
  '||adzerk.net^',
  '||advertserve.com^',
  '||adbutler.com^',
  '||adform.net^',
  '||adformdsp.net^',
  '||bidswitch.net^',
  '||lb.usemaxserver.de^',

  // ═══ Moat / IAS / Viewability ═══
  '||moatads.com^',
  '||s-jsonp.moatads.com^',
  '||px.moatads.com^',
  '||adsafeprotected.com^',
  '||fw.adsafeprotected.com^',
  '||static.adsafeprotected.com^',

  // ═══ Hotjar / Session Recording ═══
  '||hotjar.com^',
  '||vars.hotjar.com^',
  '||script.hotjar.com^',
  '||identify.hotjar.com^',
  '||in.hotjar.com^',
  '||surveys.hotjar.com^',

  // ═══ Crazy Egg ═══
  '||crazyegg.com^',
  '||script.crazyegg.com^',

  // ═══ Optimizely ═══
  '||optimizely.com^',
  '||cdn.optimizely.com^',
  '||logx.optimizely.com^',

  // ═══ Segment / CDP ═══
  '||segment.io^',
  '||api.segment.io^',
  '||cdn.segment.com^',
  '||segment.com^$third-party',

  // ═══ Mixpanel ═══
  '||mixpanel.com^',
  '||api-js.mixpanel.com^',
  '||api.mixpanel.com^',
  '||cdn.mxpnl.com^',

  // ═══ Amplitude ═══
  '||amplitude.com^',
  '||api.amplitude.com^',
  '||cdn.amplitude.com^',

  // ═══ Heap ═══
  '||heapanalytics.com^',
  '||cdn.heapanalytics.com^',

  // ═══ Matomo / Piwik ═══
  '||matomo.org^$third-party',
  '||piwik.org^$third-party',
  '||matomo.php^',
  '||piwik.php^',

  // ═══ Plausible (privacy-focused, but still tracking) ═══
  '||plausible.io^$third-party',

  // ═══ Quantcast ═══
  '||quantserve.com^',
  '||secure.quantserve.com^',
  '||pixel.quantserve.com^',
  '||rules.quantcount.com^',

  // ═══ ScoreCard Research (Comscore) ═══
  '||scorecardresearch.com^',
  '||sb.scorecardresearch.com^',
  '||udm.scorecardresearch.com^',

  // ═══ Nielsen ═══
  '||imrworldwide.com^',
  '||secure-dcr.imrworldwide.com^',
  '||cdn.imrworldwide.com^',

  // ═══ Neustar / Flurry ═══
  '||neustar.biz^',
  '||flurry.com^',
  '||data.flurry.com^',
  '||dev.flurry.com^',

  // ═══ Oracle / BlueKai / Eloqua ═══
  '||bluekai.com^',
  '||tags.bluekai.com^',
  '||stags.bluekai.com^',
  '||eloqua.com^',
  '||secure.eloqua.com^',
  '||en25.com^',

  // ═══ Salesforce / Krux ═══
  '||krxd.net^',
  '||beacon.krxd.net^',
  '||cdn.krxd.net^',
  '||salesforce.com^$third-party,domain=~salesforce.com',

  // ═══ Lotame ═══
  '||crwdcntrl.net^',
  '||bcp.crwdcntrl.net^',
  '||ad.crwdcntrl.net^',
  '||tags.crwdcntrl.net^',

  // ═══ LiveRamp ═══
  '||rlcdn.com^',
  '||idsync.rlcdn.com^',
  '||rc.rlcdn.com^',
  '||p.rfihub.com^',

  // ═══ Tapad ═══
  '||tapad.com^',
  '||pixel.tapad.com^',

  // ═══ Drawbridge ═══
  '||adsymptotic.com^',

  // ═══ Adobe / Omniture / Audience Manager ═══
  '||omniture.com^',
  '||omtrdc.net^',
  '||2o7.net^',
  '||demdex.net^',
  '||dpm.demdex.net^',
  '||cm.everesttech.net^',
  '||everesttech.net^',
  '||audiencemanager.de^',
  '||perience.mgr.consensu.org^',

  // ═══ OneTrust / Cookie Consent (UI blocking) ═══
  '||onetrust.com^',
  '||cdn.cookielaw.org^',
  '||geolocation.onetrust.com^',

  // ═══ TrustArc ═══
  '||trustarc.com^',
  '||consent.trustarc.com^',

  // ═══ Sourcepoint ═══
  '||sourcepoint.com^',
  '||cdn.privacy-mgmt.com^',

  // ═══ Chartbeat ═══
  '||chartbeat.com^',
  '||static.chartbeat.com^',
  '||mab.chartbeat.com^',
  '||ping.chartbeat.net^',

  // ═══ Parsely ═══
  '||parsely.com^',
  '||cdn.parsely.com^',
  '||p1.parsely.com^',

  // ═══ New Relic ═══
  '||newrelic.com^$third-party',
  '||js-agent.newrelic.com^',
  '||bam.nr-data.net^',
  '||bam-cell.nr-data.net^',

  // ═══ Sentry ═══
  '||sentry.io^$third-party',
  '||browser.sentry-cdn.com^',
  '||*.ingest.sentry.io^',

  // ═══ Bugsnag ═══
  '||bugsnag.com^$third-party',

  // ═══ Rollbar ═══
  '||rollbar.com^$third-party',

  // ═══ FullStory ═══
  '||fullstory.com^',
  '||edge.fullstory.com^',
  '||rs.fullstory.com^',

  // ═══ Zendesk / Zopim ═══
  '||zopim.com^',
  '||v2.zopim.com^',
  '||widget-mediator.zopim.com^',

  // ═══ Intercom ═══
  '||intercom.io^$third-party',
  '||widget.intercom.io^',
  '||api-iam.intercom.io^',
  '||nexus-websocket-a.intercom.io^',

  // ═══ Drift ═══
  '||drift.com^$third-party',
  '||js.driftt.com^',

  // ═══ Freshdesk / Freshchat ═══
  '||freshchat.com^$third-party',
  '||wchat.freshchat.com^',

  // ═══ Olark ═══
  '||olark.com^$third-party',

  // ═══ Tawk.to ═══
  '||tawk.to^$third-party',

  // ═══ Crisp ═══
  '||crisp.chat^$third-party',

  // ═══ JivoChat ═══
  '||jivosite.com^$third-party',

  // ═══ Shopify / E-commerce trackers ═══
  '||analytics.google.com^',
  '||monorail-edge.shopifysvc.com^',

  // ═══ CDN-based trackers ═══
  '||cdn.heapanalytics.com^',
  '||cdn.segment.com^',
  '||cdn.mouseflow.com^',
  '||cdn.testfuse.com^',

  // ═══ Mouseflow / Session replay ═══
  '||mouseflow.com^',
  '||cdn.mouseflow.com^',
  '||o2.mouseflow.com^',

  // ═══ Lucky Orange ═══
  '||luckyorange.com^',
  '||cdn.luckyorange.com^',
  '||w1.luckyorange.com^',

  // ═══ Inspectlet ═══
  '||inspectlet.com^',
  '||hn.inspectlet.com^',

  // ═══ Smartlook ═══
  '||smartlook.com^',
  '||web-sdk.smartlook.com^',
  '||rec.smartlook.com^',

  // ═══ Pendo ═══
  '||pendo.io^',
  '||cdn.pendo.io^',
  '||data.pendo.io^',

  // ═══ WalkMe ═══
  '||walkme.com^',
  '||cdn.walkme.com^',

  // ═══ UserVoice ═══
  '||uservoice.com^$third-party',

  // ═══ Canny ═══
  '||canny.io^$third-party',

  // ═══ Akamai / mPulse ═══
  '||go-mpulse.net^',
  '||c.go-mpulse.net^',
  '||s.go-mpulse.net^',

  // ═══ Catchpoint ═══
  '||catchpoint.net^$third-party',
  '||gtm-test.catchpoint.com^',

  // ═══ Pingdom ═══
  '||pingdom.net^$third-party',
  '||rum-static.pingdom.net^',
  '||rum-collector-2.pingdom.net^',

  // ═══ Cloudflare Beacon ═══
  '||cloudflareinsights.com^',
  '||static.cloudflareinsights.com^',

  // ═══ Fastly / Analytics ═══
  '||fastly-insights.com^',

  // ═══ Snowplow ═══
  '||snowplowanalytics.com^',
  '||collector.snowplowanalytics.com^',
  '||cdn.snowplowanalytics.com^',

  // ═══ Braze / Appboy ═══
  '||braze.com^',
  '||sdk.iad-01.braze.com^',
  '||sdk.iad-02.braze.com^',
  '||appboy.com^',
  '||sdk.api.appboy.com^',

  // ═══ CleverTap ═══
  '||clevertap.com^',
  '||wzrkt.com^',

  // ═══ OneSignal (push notification tracking) ═══
  '||onesignal.com^',
  '||cdn.onesignal.com^',

  // ═══ PushCrew / Wingify ═══
  '||pushcrew.com^',
  '||cdn.pushcrew.com^',

  // ═══ VWO / Wingify ═══
  '||vwo.com^',
  '||dev.visualwebsiteoptimizer.com^',
  '||wingify.com^',

  // ═══ AB Tasty ═══
  '||abtasty.com^',
  '||try.abtasty.com^',

  // ═══ Dynamic Yield (Mastercard) ═══
  '||dynamicyield.com^',
  '||cdn.dynamicyield.com^',
  '||st.dynamicyield.com^',

  // ═══ Qualtrics ═══
  '||qualtrics.com^$third-party',
  '||siteintercept.qualtrics.com^',
  '||zn_*.qualtrics.com^',

  // ═══ SurveyMonkey ═══
  '||surveymonkey.com^$third-party',

  // ═══ Typeform ═══
  '||typeform.com^$third-party',

  // ═══ AddThis / Oracle ═══
  '||addthis.com^',
  '||s7.addthis.com^',
  '||m.addthis.com^',
  '||radar.cedexis.com^',

  // ═══ ShareThis ═══
  '||sharethis.com^',
  '||l.sharethis.com^',
  '||t.sharethis.com^',
  '||ws.sharethis.com^',

  // ═══ Po.st / RhythmOne ═══
  '||po.st^',
  '||i.po.st^',

  // ═══ Disqus (loads ads) ═══
  '||disqus.com^',
  '||disquscdn.com^',

  // ═══ Outbrain recirculation ═══
  '||outbrain.com^',
  '||widgets.outbrain.com^',
  '||outbrainimg.com^',
  '||tr.outbrain.com^',
  '||log.outbrain.com^',

  // ═══ MGID ═══
  '||mgid.com^',
  '||cdn.mgid.com^',
  '||cm.mgid.com^',

  // ═══ Revcontent ═══
  '||revcontent.com^',
  '||cdn.revcontent.com^',

  // ═══ Adgebra (Indian ad network) ═══
  '||adgebra.co.in^',

  // ═══ PropellerAds ═══
  '||propellerads.com^',
  '||native.propellerads.com^',

  // ═══ PopAds / PopCash ═══
  '||popads.net^',
  '||popcash.net^',

  // ═══ ExoClick (adult ads) ═══
  '||exoclick.com^',
  '||syndication.exoclick.com^',
  '||ads.exoclick.com^',

  // ═══ JuicyAds (adult ads) ═══
  '||juicyads.com^',

  // ═══ TrafficJunky (adult ads) ═══
  '||trafficjunky.net^',

  // ═══ AdMaven ═══
  '||ad-maven.com^',

  // ═══ AdCash ═══
  '||adcash.com^',

  // ═══ CoinHive / Crypto miners (legacy) ═══
  '||coinhive.com^',
  '||coin-hive.com^',
  '||jsecoin.com^',
  '||crypto-loot.com^',
  '||webmine.cz^',
  '||authedmine.com^',

  // ═══ Gambling ad networks ═══
  '||bet365.com^$third-party',
  '||banners.bet365.com^',

  // ═══ InMobi (mobile ads) ═══
  '||inmobi.com^',
  '||i.w.inmobi.com^',

  // ═══ AdMob / Google Mobile ═══
  '||googleads.g.doubleclick.net^',
  '||pagead2.googleadservices.com^',

  // ═══ Unity Ads (gaming) ═══
  '||unityads.unity3d.com^',
  '||webview.unityads.unity3d.com^',

  // ═══ IronSource (gaming ads) ═══
  '||ironsrc.com^',
  '||staticd.cdn.adserver.com^',

  // ═══ AppLovin ═══
  '||applovin.com^',
  '||a.applovin.com^',
  '||rt.applovin.com^',

  // ═══ Start.io / StartApp ═══
  '||start.io^',
  '||startapp.com^',
  '||sdk.startapp.com^',

  // ═══ Huawei / Honor tracking ═══
  '||hicloud.com^$third-party',
  '||dtm.hicloud.com^',

  // ═══ Xiaomi tracking ═══
  '||tracking.miui.com^',
  '||tracking.intl.miui.com^',
  '||api.miui.com^',

  // ═══ Samsung tracking ═══
  '||samsungads.com^',
  '||securemetrics.apple.com^',

  // ═══ Apple / iAd ═══
  '||iad.apple.com^',
  '||advertising.apple.com^',
  '||metrics.icloud.com^',
  '||metrics.mzstatic.com^',
  '||xp.apple.com^',

  // ═══ Spotify ads ═══
  '||spclient.wg.spotify.com^/ad^',
  '||audio-fa.spotifycdn.com^/audio/ad^',

  // ═══ Twitch ads (aggressive) ═══
  '||ads.twitch.tv^',
  '||gql.twitch.tv^*/ commercials^',
  '||video-ad-stats.twitch.tv^',

  // ═══ YouTube ads (basic domain-level) ═══
  '||googlevideo.com^*/ads^',
  '||youtube.com/pagead^',
  '||youtube.com/api/stats/ads^',

  // ═══ More aggressive ad-serving domains ═══
  '||adsystem.amazon.com^',
  '||advertising-api.amazon.com^',
  '||go redirected.com^',
  '||app.link^$third-party',
  '||branch.io^$third-party',
  '||s3.amazonaws.com^*/advertising^',

  // ═══ URL Shortener / Redirect Trackers ═══
  '||bit.ly^$third-party,domain=~bit.ly',
  '||j.mp^$third-party',
  '||ow.ly^$third-party',
  '||tinyurl.com^$third-party',
  '||t.co^$third-party',
  '||goo.gl^$third-party',

  // ═══ Telemetry / Diagnostics (non-essential) ═══
  '||browser.pipe.aria.microsoft.com^',
  '||vortex.data.microsoft.com^',
  '||settings-win.data.microsoft.com^',
  '||telemetry.appex.bing.net^',
  '||client.wns.windows.com^',
  '||dns.msftncsi.com^',
  '||mobile.pipe.aria.microsoft.com^',
  '||events.data.microsoft.com^',
  '||telemetry.mozilla.org^',
  '||incoming.telemetry.mozilla.org^',
  '||telemetry.dropbox.com^',
  '||spclient.spotify.com^/logging^',
  '||clients4.google.com^$third-party',
  '||clients2.google.com^$third-party',
];

// ── Cosmetic Rules: CSS-based element hiding ──────────────
// Format: EasyList-style cosmetic filters
//   ##.selector          — hide matching elements on all pages
//   domain.com##.sel    — hide only on specific domain
//
// These are converted to CSS and injected into every page
// Total: 60+ rules covering common ad containers

export const COSMETIC_RULES: string[] = [
  // ═══ Google AdSense containers ═══
  '##[id*="google_ads"]',
  '##[id*="google-ad"]',
  '##[id*="google_ad"]',
  '##[id*="ad_unit"]',
  '##[id*="adunit"]',
  '##[id*="googleads"]',
  '##[id*="div-gpt-ad"]',
  '##[id*="google-adv"]',
  '##[class*="adsbygoogle"]',
  '##[class*="ads-by-google"]',
  '##[class*="google-ad"]',
  '##[class*="google_ads"]',
  '##[class*="ad-slot"]',
  '##[class*="ad_unit"]',
  '##[class*="gpt-ad"]',
  '##[data-ad-slot]',
  '##[data-ad-client]',
  '##[data-ad-unit]',
  '##[data-ad-type]',
  '##[data-ad-loadable]',
  '##[data-google-query-id]',
  '##[data-adsbygoogle-status]',
  '##[name*="google_ads"]',
  '##ins.adsbygoogle',
  '##.adsbygoogle-noablate',

  // ═══ Generic ad containers ═══
  '##.advertisement',
  '##.advertising',
  '##.advertising_banner',
  '##.advertising-wrapper',
  '##.sponsored',
  '##.sponsored-content',
  '##.sponsored-post',
  '##.sponsored-link',
  '##.sponsored-result',
  '##.promoted',
  '##.promoted-content',
  '##.promoted-story',
  '##.promoted-link',
  '##.dfp-ad',
  '##.dfp-ad-unit',
  '##.dfp-tag',

  // ═══ Banner patterns ═══
  '##div[class*="banner" i][class*="ad" i]',
  '##div[id*="banner" i][id*="ad" i]',
  '##.ad-banner',
  '##.top-banner-ad',
  '##.bottom-banner-ad',
  '##.sidebar-ad',
  '##.header-ad',
  '##.footer-ad',
  '##.content-ad',
  '##.inline-ad',
  '##.interstitial-ad',
  '##.native-ad',
  '##.outbrain-widget',
  '##.taboola-widget',
  '##.revcontent-wrapper',
  '##.mgid-wrapper',

  // ═══ Iframe-based ads ═══
  '##iframe[src*="ad"]',
  '##iframe[src*="ads"]',
  '##iframe[src*="googlesyndication"]',
  '##iframe[src*="doubleclick"]',
  '##iframe[src*="amazon-adsystem"]',
  '##iframe[id*="ad"]',
  '##iframe[name*="ad"]',

  // ═══ Tracking pixels / beacons (1x1 images) ═══
  '##img[width="1"][height="1"]',
  '##img[width="0"][height="0"]',

  // ═══ Link-based ads ═══
  '##a[href*="googleadservices"]',
  '##a[href*="doubleclick"]',
  '##a[href*="amazon-adsystem"]',
  '##a[href*="sponsored"]',
  '##a[href*="/aclk?"]',
  '##a[href^="https://ad."]',
  '##a[href^="https://ads."]',
  '##a[href^="https://tracking."]',

  // ═══ ARIA / Accessibility labeled ads ═══
  '##[aria-label*="advertisement" i]',
  '##[aria-label*="sponsored" i]',
  '##[role="region"][aria-label*="advertisement" i]',

  // ═══ AMP / Mobile ad containers ═══
  '##amp-ad',
  '##amp-embed[type="taboola"]',
  '##amp-embed[type="outbrain"]',

  // ═══ Video ad overlays ═══
  '##.video-ads',
  '##.ytp-ad-overlay-container',
  '##.ytp-ad-module',
  '##.ytp-ad-progress-list',
  '##.videoAdUiPreloader',
  '##.ad-container.video',

  // ═══ Popups / Overlays / Cookie banners (selective) ═══
  '##.cookie-banner',
  '##.cookie-consent',
  '##.gdpr-banner',
  '##.onetrust-banner-sdk',
  '##.cc-banner',
  '##.ezoic-ad',
  '##.ezoic-adpicker-ad',

  // ═══ Social widgets (often track users) ═══
  '##.fb-like',
  '##.fb-share-button',
  '##.twitter-share-button',
  '##.linkedin-share-button',
  '##.pinterest-share-button',
  '##.social-share-widget',

  // ═══ Common ad tech platform containers ═══
  '##[id*="outbrain"]',
  '##[id*="taboola"]',
  '##[id*="revcontent"]',
  '##[id*="mgid"]',
  '##[class*="outbrain"]',
  '##[class*="taboola"]',
  '##[class*="revcontent"]',
  '##[class*="mgid"]',
  '##[class*="criteo"]',
  '##[id*="criteo"]',

  // ═══ News site specific ad containers ═══
  '##.ad-wrapper',
  '##.ad-container',
  '##.ad-box',
  '##.ad-inner',
  '##.ad-item',
  '##.ad-label',
  '##.ad-root',
  '##.ad-section',
  '##.ad-spacing',
  '##.ad-top',
  '##.ad-bottom',
  '##.ad-left',
  '##.ad-right',
  '##.ad-middle',
  '##.ad-holder',
  '##.ad-frame',
  '##.ad-block',
  '##.ad-unit',
  '##.ad-placement',
  '##.ad-wrap',
  '##.ad-slot-container',
  '##.ad-pos',
  '##.ad-region',

  // ═══ Sticky / floating ads ═══
  '##.sticky-ad',
  '##.floating-ad',
  '##.fixed-ad',
  '##.ad-sticky',
  '##.ad-floating',

  // ═══ Mid-article / in-feed ads ═══
  '##.mid-article-ad',
  '##.in-article-ad',
  '##.in-feed-ad',
  '##.article-ad',
  '##.story-ad',
  '##.card-ad',

  // ═══ Paywall / Subscribe nag overlays ═══
  '##.subscribe-nag',
  '##.paywall-overlay',
  '##.registration-prompt',
  '##.soft-wall',
];

// ── Statistics ────────────────────────────────────────────

export const getFilterStats = (): { blockRules: number; cosmeticRules: number } => ({
  blockRules: BLOCK_RULES.length,
  cosmeticRules: COSMETIC_RULES.length,
});
