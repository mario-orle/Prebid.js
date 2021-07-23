import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import * as utils from '../src/utils.js';
import { Renderer } from '../src/Renderer.js';
import { INSTREAM, OUTSTREAM } from '../src/video.js';

const ENDPOINT = `https://d.vidoomy.com/api/rtbserver/prebid/`;
const BIDDER_CODE = 'vidoomy';
const GVLID = 380;
const isBidRequestValid = bid => {
  if (!bid.params) {
    utils.logError(BIDDER_CODE + ': bid.params should be non-empty');
    return false;
  }

  if (!+bid.params.pid) {
    utils.logError(BIDDER_CODE + ': bid.params.pid should be non-empty Number');
    return false;
  }

  if (!+bid.params.id) {
    utils.logError(BIDDER_CODE + ': bid.params.id should be non-empty Number');
    return false;
  }

  if (bid.params && bid.params.mediaTypes && bid.params.mediaTypes.video && bid.params.mediaTypes.context === INSTREAM && !bid.params.mediaTypes.video.playerSize) {
    utils.logError(BIDDER_CODE + ': bid.params.mediaType.video should have a playerSize property to tell player size when is INSTREAM');
    return false;
  }

  return true;
};

const buildRequests = (validBidRequests, bidderRequest) => {
  const serverRequests = validBidRequests.map(bid => {
    let adType = BANNER;

    let w, h;
    if (bid.mediaTypes && bid.mediaTypes[BANNER] && bid.mediaTypes[BANNER].sizes) {
      [w, h] = bid.mediaTypes[BANNER].sizes[0];
      adType = BANNER;
    } else if (bid.mediaTypes && bid.mediaTypes[VIDEO] && bid.mediaTypes[VIDEO].playerSize) {
      [w, h] = bid.mediaTypes[VIDEO].playerSize;
      adType = VIDEO;
    }

    let host = '';
    try {
      host = bidderRequest.refererInfo.referer.split('#')[0].replace(/^(https\:\/\/|http\:\/\/)|(\/)$/g, '').split('/')[0];
    } catch (eBidRequest) {
      try {
        host = window.location.href.replace(/^(https\:\/\/|http\:\/\/)|(\/)$/g, '').split('/')[0];
      } catch (eLocationHref) {
        host = window.location.href;
      }
    }
    const hostname = host.split(':')[0];

    const videoContext = utils.deepAccess(bid, 'mediaTypes.video.context');

    const queryParams = [];
    queryParams.push(['id', bid.params.id]);
    queryParams.push(['adtype', adType]);
    queryParams.push(['w', w]);
    queryParams.push(['h', h]);
    queryParams.push(['pos', parseInt(bid.params.position) || 1]);
    queryParams.push(['ua', navigator.userAgent]);
    queryParams.push(['l', navigator.language && navigator.language.indexOf('-') !== -1 ? navigator.language.split('-')[0] : '']);
    queryParams.push(['dt', /Mobi/.test(navigator.userAgent) ? 2 : 1]);
    queryParams.push(['pid', bid.params.pid]);
    queryParams.push(['dealId', bid.bidId]);
    queryParams.push(['d', hostname]);
    queryParams.push(['sp', encodeURIComponent(bidderRequest.refererInfo.referer)]);
    if (bidderRequest.gdprConsent) {
      queryParams.push(['gdpr', bidderRequest.gdprConsent.gdprApplies]);
      queryParams.push(['gdprcs', bidderRequest.gdprConsent.consentString]);
    }
    queryParams.push(['usp', bidderRequest.uspConsent || '']);
    queryParams.push(['coppa', !!config.getConfig('coppa')]);

    const rawQueryParams = queryParams.map(qp => qp.join('=')).join('&');

    const url = `${ENDPOINT}?${rawQueryParams}`;
    return {
      method: 'GET',
      url: url,
      data: {videoContext}
    }
  });
  return serverRequests;
};

const render = (bid) => {
  bid.ad = bid.vastUrl;
  var obj = {
    vastTimeout: 5000,
    maxAllowedVastTagRedirects: 3,
    allowVpaid: true,
    autoPlay: true,
    preload: true,
    mute: true,
  }
  window.outstreamPlayer(bid, bid.adUnitCode, obj);
}

const interpretResponse = (serverResponse, bidRequest) => {
  try {
    let responseBody = serverResponse.body;
    responseBody.requestId = responseBody.dealId;
    if (responseBody.mediaType === 'video') {
      responseBody.ad = responseBody.vastUrl;
      const videoContext = bidRequest.data.videoContext;

      if (videoContext === OUTSTREAM) {
        try {
          const renderer = Renderer.install({
            id: bidRequest.bidId,
            adunitcode: bidRequest.tagId,
            loaded: false,
            config: responseBody.mediaType,
            url: responseBody.meta.rendererUrl
          });
          renderer.setRender(render);

          responseBody.renderer = renderer;
        } catch (e) {
          responseBody.ad = responseBody.vastUrl;
        }
      }
    }

    return [responseBody];
  } catch (e) {
    return [];
  }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  gvlid: GVLID,
};

registerBidder(spec);
