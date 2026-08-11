(function () {
  const state = {
    h: 205,
    s: 0.88,
    v: 0.86,
    a: 0.46,
  };

  const els = {
    svPicker: document.getElementById("svPicker"),
    svCursor: document.getElementById("svCursor"),
    hue: document.getElementById("hue"),
    alphaSlider: document.getElementById("alphaSlider"),
    opacity: document.getElementById("opacity"),
    opacityValue: document.getElementById("opacityValue"),
    preview: document.getElementById("preview"),
    mainInput: document.getElementById("mainInput"),
    hex: document.getElementById("hex"),
    hexa: document.getElementById("hexa"),
    rgb: document.getElementById("rgb"),
    rgba: document.getElementById("rgba"),
    hsl: document.getElementById("hsl"),
    hsla: document.getElementById("hsla"),
    cmyk: document.getElementById("cmyk"),
  };

  let dragging = false;
  let syncingInput = false;

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;

    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : d / max;
    return { h, s, v: max };
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  function rgbToCmyk(r, g, b) {
    if (r === 0 && g === 0 && b === 0) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }

    const rr = r / 255;
    const gg = g / 255;
    const bb = b / 255;
    const k = 1 - Math.max(rr, gg, bb);
    const c = (1 - rr - k) / (1 - k);
    const m = (1 - gg - k) / (1 - k);
    const y = (1 - bb - k) / (1 - k);

    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100),
    };
  }

  function cmykToRgb(c, m, y, k) {
    c /= 100;
    m /= 100;
    y /= 100;
    k /= 100;
    return {
      r: Math.round(255 * (1 - c) * (1 - k)),
      g: Math.round(255 * (1 - m) * (1 - k)),
      b: Math.round(255 * (1 - y) * (1 - k)),
    };
  }

  function toHex(n) {
    return n.toString(16).padStart(2, "0");
  }

  function formatAlpha(a) {
    const rounded = Math.round(a * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  }

  function parseHex(value) {
    let hex = value.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      hex = hex
        .split("")
        .map(function (ch) {
          return ch + ch;
        })
        .join("");
    }
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (/^[0-9a-fA-F]{8}$/.test(hex)) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
    return null;
  }

  function parseColor(raw) {
    const value = raw.trim();
    if (!value) return null;

    if (value.startsWith("#") || /^[0-9a-fA-F]{3,8}$/.test(value)) {
      return parseHex(value);
    }

    let match = value.match(
      /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i
    );
    if (match) {
      return {
        r: clamp(Math.round(Number(match[1])), 0, 255),
        g: clamp(Math.round(Number(match[2])), 0, 255),
        b: clamp(Math.round(Number(match[3])), 0, 255),
        a: match[4] !== undefined ? clamp(Number(match[4]), 0, 1) : 1,
      };
    }

    match = value.match(
      /^hsla?\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%(?:\s*,\s*([0-9.]+))?\s*\)$/i
    );
    if (match) {
      const rgb = hslToRgb(
        ((Number(match[1]) % 360) + 360) % 360,
        clamp(Number(match[2]), 0, 100),
        clamp(Number(match[3]), 0, 100)
      );
      return {
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        a: match[4] !== undefined ? clamp(Number(match[4]), 0, 1) : 1,
      };
    }

    match = value.match(
      /^cmyk\(\s*([0-9.]+)%?\s*,\s*([0-9.]+)%?\s*,\s*([0-9.]+)%?\s*,\s*([0-9.]+)%?\s*\)$/i
    );
    if (match) {
      const rgb = cmykToRgb(
        clamp(Number(match[1]), 0, 100),
        clamp(Number(match[2]), 0, 100),
        clamp(Number(match[3]), 0, 100),
        clamp(Number(match[4]), 0, 100)
      );
      return { r: rgb.r, g: rgb.g, b: rgb.b, a: state.a };
    }

    return null;
  }

  function setFromRgb(r, g, b, a) {
    const hsv = rgbToHsv(r, g, b);
    state.h = hsv.h;
    state.s = hsv.s;
    state.v = hsv.v;
    state.a = clamp(a, 0, 1);
    render();
  }

  function updateUiControls() {
    const solid = hsvToRgb(state.h, 1, 1);
    const solidHex = "#" + toHex(solid.r) + toHex(solid.g) + toHex(solid.b);

    els.svPicker.style.background =
      "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, " +
      solidHex +
      ")";
    els.svCursor.style.left = state.s * 100 + "%";
    els.svCursor.style.top = (1 - state.v) * 100 + "%";
    els.svPicker.setAttribute(
      "aria-valuetext",
      "Saturation " +
        Math.round(state.s * 100) +
        "%, Brightness " +
        Math.round(state.v * 100) +
        "%"
    );

    els.hue.value = String(Math.round(state.h));
    els.alphaSlider.value = String(Math.round(state.a * 100));
    els.opacity.value = String(Math.round(state.a * 100));
    els.opacityValue.textContent = Math.round(state.a * 100) + "%";
    els.opacity.style.setProperty("--progress", Math.round(state.a * 100) + "%");

    const rgb = hsvToRgb(state.h, state.s, state.v);
    const color = "rgb(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ")";
    document.documentElement.style.setProperty("--solid-color", color);
    els.alphaSlider.style.setProperty("--solid-color", color);
  }

  function render(options) {
    const keepMain = options && options.keepMain;
    const rgb = hsvToRgb(state.h, state.s, state.v);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
    const alphaByte = Math.round(state.a * 255);
    const hex = "#" + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
    const hexa = hex + toHex(alphaByte);
    const alphaText = formatAlpha(state.a);

    updateUiControls();

    els.preview.style.background =
      "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + state.a + ")";

    els.hex.value = hex;
    els.hexa.value = hexa;
    els.rgb.value = "rgb(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ")";
    els.rgba.value =
      "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + alphaText + ")";
    els.hsl.value = "hsl(" + hsl.h + ", " + hsl.s + "%, " + hsl.l + "%)";
    els.hsla.value =
      "hsla(" + hsl.h + ", " + hsl.s + "%, " + hsl.l + "%, " + alphaText + ")";
    els.cmyk.value =
      "cmyk(" + cmyk.c + "%, " + cmyk.m + "%, " + cmyk.y + "%, " + cmyk.k + "%)";

    if (!keepMain && !syncingInput) {
      els.mainInput.value = state.a < 1 ? hexa : hex;
    }
  }

  function setSvFromEvent(event) {
    const rect = els.svPicker.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);
    state.s = rect.width ? x / rect.width : 0;
    state.v = rect.height ? 1 - y / rect.height : 0;
    render();
  }

  els.svPicker.addEventListener("pointerdown", function (event) {
    dragging = true;
    els.svPicker.setPointerCapture(event.pointerId);
    setSvFromEvent(event);
  });

  els.svPicker.addEventListener("pointermove", function (event) {
    if (!dragging) return;
    setSvFromEvent(event);
  });

  els.svPicker.addEventListener("pointerup", function () {
    dragging = false;
  });

  els.svPicker.addEventListener("keydown", function (event) {
    const step = event.shiftKey ? 0.05 : 0.01;
    let changed = false;

    if (event.key === "ArrowLeft") {
      state.s = clamp(state.s - step, 0, 1);
      changed = true;
    } else if (event.key === "ArrowRight") {
      state.s = clamp(state.s + step, 0, 1);
      changed = true;
    } else if (event.key === "ArrowUp") {
      state.v = clamp(state.v + step, 0, 1);
      changed = true;
    } else if (event.key === "ArrowDown") {
      state.v = clamp(state.v - step, 0, 1);
      changed = true;
    }

    if (changed) {
      event.preventDefault();
      render();
    }
  });

  els.hue.addEventListener("input", function () {
    state.h = Number(els.hue.value);
    render();
  });

  function setAlphaFromControl(value) {
    state.a = clamp(Number(value) / 100, 0, 1);
    render();
  }

  els.alphaSlider.addEventListener("input", function () {
    setAlphaFromControl(els.alphaSlider.value);
  });

  els.opacity.addEventListener("input", function () {
    setAlphaFromControl(els.opacity.value);
  });

  els.mainInput.addEventListener("input", function () {
    const parsed = parseColor(els.mainInput.value);
    if (!parsed) return;
    syncingInput = true;
    setFromRgb(parsed.r, parsed.g, parsed.b, parsed.a);
    syncingInput = false;
    render({ keepMain: true });
  });

  els.mainInput.addEventListener("paste", function () {
    window.setTimeout(function () {
      const parsed = parseColor(els.mainInput.value);
      if (!parsed) return;
      setFromRgb(parsed.r, parsed.g, parsed.b, parsed.a);
    }, 0);
  });

  document.querySelectorAll("[data-color]").forEach(function (button) {
    button.addEventListener("click", function () {
      const parsed = parseColor(button.getAttribute("data-color"));
      if (!parsed) return;
      setFromRgb(parsed.r, parsed.g, parsed.b, parsed.a);
    });
  });

  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", async function () {
      const key = button.getAttribute("data-copy");
      const value = key === "main" ? els.mainInput.value : els[key].value;
      if (!value) return;

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          const temp = document.createElement("textarea");
          temp.value = value;
          document.body.appendChild(temp);
          temp.select();
          document.execCommand("copy");
          document.body.removeChild(temp);
        }

        button.classList.add("copied");
        button.title = "Copied";
        window.setTimeout(function () {
          button.classList.remove("copied");
          button.title = "Copy";
        }, 1000);
      } catch (error) {
        button.title = "Copy failed";
      }
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.target.matches("input, textarea, select, [contenteditable='true']")) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (event.key === "c" || event.key === "C") {
      const mainCopyBtn = document.querySelector('[data-copy="main"]');
      if (!mainCopyBtn) return;
      event.preventDefault();
      mainCopyBtn.click();
    }
  });

  render();
})();
