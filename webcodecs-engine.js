// WebCodecs & Transmuxing Engine for ClipStream Studio
// Ultra-fast client-side zero-re-encoding and WebCodecs acceleration

(function(global) {
  'use strict';

  const WebCodecsEngine = {
    // Check if WebCodecs VideoDecoder & VideoEncoder are natively supported
    isSupported: function() {
      return typeof global.VideoDecoder === 'function' && 
             typeof global.VideoEncoder === 'function' &&
             typeof global.VideoFrame === 'function';
    },

    // Check if SharedArrayBuffer is available for multithreaded WASM
    isSharedArrayBufferSupported: function() {
      return typeof global.SharedArrayBuffer === 'function' && global.crossOriginIsolated === true;
    },

    getEngineRecommendation: function() {
      const isCOI = global.crossOriginIsolated === true;
      const hasWebCodecs = this.isSupported();
      const hasSAB = this.isSharedArrayBufferSupported();

      return {
        crossOriginIsolated: isCOI,
        sharedArrayBuffer: hasSAB,
        webCodecs: hasWebCodecs,
        recommendedFastMode: 'codec-copy-fast' // 0-second re-encoding for trims
      };
    }
  };

  global.WebCodecsEngine = WebCodecsEngine;
})(window);
