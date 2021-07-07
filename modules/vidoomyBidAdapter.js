import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import * as utils from '../src/utils.js';

const ENDPOINT = `https://d.vidoomy.com/api/rtbserver/prebid`;
const BIDDER_CODE = 'vidoomy';
const isBidRequestValid = bid => {
  if (!bid.params) {
    utils.logError(BIDDER_CODE + ': bid.params should be non-empty');
    return false;
  }

  if (!+bid.params.pid) {
    utils.logError(BIDDER_CODE + ': bid.params.pubId should be non-empty Number');
    return false;
  }

  if (!+bid.params.id) {
    utils.logError(BIDDER_CODE + ': bid.params.id should be non-empty Number');
    return false;
  }

  return true;
};

const buildRequests = (validBidRequests, bidderRequest) => {
  const serverRequests = validBidRequests.map(bid => {
    const adType = Object.keys(bid.mediaTypes)[0];

    const [w, h] = bid.mediaTypes[adType].sizes[0];

    const queryParams = new URLSearchParams();
    queryParams.append('id', bid.params.id);
    queryParams.append('adtype', adType);
    queryParams.append('w', w);
    queryParams.append('h', h);
    queryParams.append('pos', parseInt(bid.params.position) || 1);
    queryParams.append('ua', navigator.userAgent);
    queryParams.append('l', navigator.language && navigator.language.indexOf('-') !== -1 ? navigator.language.split('-')[0] : '');
    queryParams.append('dt', /Mobi/.test(navigator.userAgent) ? 2 : 1);
    queryParams.append('pid', bid.params.pid);
    queryParams.append('d', new URL(bidderRequest.refererInfo.referer).hostname);
    queryParams.append('sp', encodeURIComponent(bidderRequest.refererInfo.referer));
    if (bidderRequest.gdprConsent) {
      queryParams.append('gdpr', bidderRequest.gdprConsent.gdprApplies);
      queryParams.append('gdprcs', bidderRequest.gdprConsent.consentString);
    }
    queryParams.append('usp', bidderRequest.uspConsent || '');
    queryParams.append('coppa', !!config.getConfig('coppa'));

    const url = `${ENDPOINT}?${queryParams.toString()}`;
    return {
      method: 'GET',
      url: url
    }
  });
  return serverRequests;
};
/*
const getCommonBidsData = bidderRequest => {
  const payload = {
    ua: navigator.userAgent || '',
    language: navigator.language && navigator.language.indexOf('-') !== -1 ? navigator.language.split('-')[0] : '',
  };

  if (bidderRequest && bidderRequest.refererInfo) {
    payload.referer = encodeURIComponent(bidderRequest.refererInfo.referer);
  }

  if (bidderRequest && bidderRequest.uspConsent) {
    payload.us_privacy = bidderRequest.uspConsent;
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    payload.gdpr_consent = {
      consent_string: bidderRequest.gdprConsent.consentString,
      consent_required: bidderRequest.gdprConsent.gdprApplies,
    }
  }

  payload.coppa = !!config.getConfig('coppa');

  return payload;
};
/*
const getBidRequestsToSend = validBidRequests => {
  return validBidRequests.map(getBidRequestToSend);
};

const getBidRequestToSend = validBidRequest => {
  const result = {
    bidId: validBidRequest.bidId,
    bidfloor: 0,
    position: parseInt(validBidRequest.params.position) || 1,
    instl: parseInt(validBidRequest.params.instl) || 0,
  };

  if (validBidRequest.mediaTypes[BANNER]) {
    result[BANNER] = createBannerObject(validBidRequest.mediaTypes[BANNER]);
  }

  if (validBidRequest.mediaTypes[VIDEO]) {
    result[VIDEO] = createVideoObject(validBidRequest.mediaTypes[VIDEO], validBidRequest.params);
  }

  return result;
};

const createBannerObject = banner => {
  return {
    sizes: transformSizes(banner.sizes),
  };
};

const transformSizes = requestSizes => {
  let result = [];

  if (Array.isArray(requestSizes) && !Array.isArray(requestSizes[0])) {
    result[0] = {
      width: parseInt(requestSizes[0], 10) || 0,
      height: parseInt(requestSizes[1], 10) || 0,
    };
  } else if (Array.isArray(requestSizes) && Array.isArray(requestSizes[0])) {
    result = requestSizes.map(item => {
      return {
        width: parseInt(item[0], 10) || 0,
        height: parseInt(item[1], 10) || 0,
      }
    });
  }

  return result;
};

const createVideoObject = (videoMediaTypes, videoParams) => {
  return {
    w: utils.deepAccess(videoMediaTypes, 'playerSize')[0][0],
    h: utils.deepAccess(videoMediaTypes, 'playerSize')[0][1],
    mimes: utils.getBidIdParameter('mimes', videoParams) || ['application/javascript', 'video/mp4', 'video/webm'],
    minduration: utils.getBidIdParameter('minduration', videoParams) || 0,
    maxduration: utils.getBidIdParameter('maxduration', videoParams) || 500,
    protocols: utils.getBidIdParameter('protocols', videoParams) || [2, 3, 5, 6],
    startdelay: utils.getBidIdParameter('startdelay', videoParams) || 0,
    placement: utils.getBidIdParameter('placement', videoParams) || videoMediaTypes.context === 'outstream' ? 3 : 1,
    skip: utils.getBidIdParameter('skip', videoParams) || 1,
    skipafter: utils.getBidIdParameter('skipafter', videoParams) || 0,
    minbitrate: utils.getBidIdParameter('minbitrate', videoParams) || 0,
    maxbitrate: utils.getBidIdParameter('maxbitrate', videoParams) || 3500,
    delivery: utils.getBidIdParameter('delivery', videoParams) || [2],
    playbackmethod: utils.getBidIdParameter('playbackmethod', videoParams) || [1, 2, 3, 4],
    api: utils.getBidIdParameter('api', videoParams) || [2],
    linearity: utils.getBidIdParameter('linearity', videoParams) || 1
  };
};
*/
const interpretResponse = (serverResponse, bidRequest) => {
  try {
    const responseBody = serverResponse.body;

    if (!responseBody.requestId) {
      return [];
    } else {
      return [responseBody];
    }
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
};

registerBidder(spec);
