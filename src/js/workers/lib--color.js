"use strict";

const circularTween = (function () {
  // degrees => radians
  var dtor = function (d) {
    return (d * Math.PI) / 180;
  };
  // radians => degrees
  var rtod = function (r) {
    return (r * 180) / Math.PI;
  };

    return function (start_perc, stop_perc) {

	const start_deg = start_perc * 360;
	const stop_deg  = stop_perc * 360;
	
	console.log(`workerlib-color.js - start-hue(deg)=${start_deg}, stop-hue(deg)=${stop_deg}`);

	var delta_deg = (stop_deg - start_deg + 360) % 360;
	console.log(`workerlib-color.js - circularTween delta(deg)=${delta_deg}`);
	
	const start_rad = dtor(start_deg);
	const stop_rad  = dtor(stop_deg);
      
	//var delta = Math.atan2(Math.sin(stop - start), Math.cos(stop - start));
	//var delta = (stop - start + 2 * Math.PI) % (2 * Math.PI);
	var delta_rad = dtor(delta_deg);
	      
      
	return function tween(i) {

	    // 'i' is a measure of disimilarlty: 0-1.0
	    
	    //return ((rtod(start + delta * i) + 360) % 360) / 360;
	    const circ_delta_deg_i = ((rtod(start_rad + (delta_rad * i)) + 360) % 360);
	    const circ_delta_perc_i = circ_delta_deg_i / 360;
	    
	    return circ_delta_perc_i;
	};
  };
})();

function linearTween(start, stop) {
  return function tween(i) {
    return (stop - start) * i + start;
  };
}

function hslToRgb(h, s, l) {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    var hue2rgb = function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHsl(r, g, b) {
  (r /= 255), (g /= 255), (b /= 255);

  var max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  var h,
    s,
    l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return [h, s, l];
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    circularTween,
    linearTween,
    hslToRgb,
    rgbToHsl,
  };
}
