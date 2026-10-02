/* fix-webm-duration by yusitnikov (MIT) - injects proper Duration header into WebM files so players can seek/scrub freely */
(function(global) {
  function fixWebmDuration(blob, duration, callback) {
    try {
      var reader = new FileReader();
      reader.onloadend = function() {
        try {
          var buffer = reader.result;
          var fixedBuffer = injectDuration(buffer, duration);
          var fixedBlob = new Blob([fixedBuffer], { type: blob.type });
          callback(fixedBlob);
        } catch (e) {
          callback(blob);
        }
      };
      reader.readAsArrayBuffer(blob);
    } catch(err) {
      callback(blob);
    }
  }

  function injectDuration(buffer, duration) {
    var view = new DataView(buffer);
    // Find Segment and Info headers
    var pos = 0;
    while (pos < buffer.byteLength - 4) {
      // 0x18538067 is Segment element ID in EBML
      if (view.getUint32(pos, false) === 0x18538067) {
        break;
      }
      pos++;
    }
    if (pos >= buffer.byteLength - 4) return buffer;

    // Scan for Info element: 0x1549A966
    var segmentPos = pos;
    pos += 4;
    // skip segment length (vint)
    var segLen = readVint(buffer, pos);
    pos += segLen.length;

    var infoPos = -1;
    while (pos < segmentPos + 1024 && pos < buffer.byteLength - 4) {
      if (view.getUint32(pos, false) === 0x1549A966) {
        infoPos = pos;
        break;
      }
      pos++;
    }
    if (infoPos === -1) return buffer;

    // Inside Info, check if Duration element exists (ID: 0x4489)
    pos = infoPos + 4;
    var infoLen = readVint(buffer, pos);
    pos += infoLen.length;
    var infoEnd = pos + infoLen.value;

    var timecodeScale = 1000000; // default 1ms
    var durationPos = -1;
    var durationLen = 0;

    while (pos < infoEnd && pos < buffer.byteLength - 2) {
      var id2 = view.getUint16(pos, false);
      if (id2 === 0x2AD7B1) { // TimecodeScale
        // read vint
      } else if (id2 === 0x4489) { // Duration
        durationPos = pos;
        var dlen = readVint(buffer, pos + 2);
        durationLen = 2 + dlen.length + dlen.value;
        break;
      }
      pos++;
    }

    var durationVal = (duration * 1000); // in ms
    if (durationPos !== -1) {
      // overwrite float
      var dlenVal = readVint(buffer, durationPos + 2);
      var floatOffset = durationPos + 2 + dlenVal.length;
      if (dlenVal.value === 4) {
        view.setFloat32(floatOffset, durationVal, false);
      } else if (dlenVal.value === 8) {
        view.setFloat64(floatOffset, durationVal, false);
      }
      return buffer;
    } else {
      // Insert duration: ID 0x4489 + len 0x88 + 8-byte double
      var durElement = new Uint8Array(11);
      durElement[0] = 0x44;
      durElement[1] = 0x89;
      durElement[2] = 0x88; // 8 bytes float
      var dv = new DataView(durElement.buffer);
      dv.setFloat64(3, durationVal, false);

      var newBuffer = new Uint8Array(buffer.byteLength + durElement.byteLength);
      newBuffer.set(new Uint8Array(buffer.slice(0, infoPos + 4 + infoLen.length)), 0);
      newBuffer.set(durElement, infoPos + 4 + infoLen.length);
      newBuffer.set(new Uint8Array(buffer.slice(infoPos + 4 + infoLen.length)), infoPos + 4 + infoLen.length + durElement.byteLength);
      return newBuffer.buffer;
    }
  }

  function readVint(buffer, offset) {
    var view = new DataView(buffer);
    var b = view.getUint8(offset);
    var mask = 0x80;
    var length = 1;
    while ((b & mask) === 0 && length <= 8) {
      mask >>= 1;
      length++;
    }
    var value = b & (~mask);
    for (var i = 1; i < length; i++) {
      value = (value * 256) + view.getUint8(offset + i);
    }
    return { length: length, value: value };
  }

  global.fixWebmDuration = fixWebmDuration;
})(window);
